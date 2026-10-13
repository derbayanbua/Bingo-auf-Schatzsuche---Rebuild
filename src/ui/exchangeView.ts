// Exchange screen (Tauschen). Tap-based so it works the same with mouse and touch:
// select own item + NPC item -> "Tauschen"; or pay coins / accept gift.
// With the original assets installed (public/orig) the original Exchange movie is shown above the
// controls: background (Background-2 on the treasure island), Bingo/Puck left, NPC right (Character
// Visibility Links/Rechts), mouths 54/65 and 40+n, offer/demand slots 11/12, and the voice lines of
// Exchange.dxr startMovie/Angebot/Nachfrage/enterFrame (CHn-1..18, <Player>Talk-1).

import { payCoins, refundCoins, startExchange, swapItems, takeItem, type ExchangeSession } from '../game/exchange';
import type { CharId, GameState } from '../game/types';
import { hasOriginals } from '../orig/assets';
import { hasOriginalGfx, itemImageUrl } from '../orig/gfx';
import { loadMovie, Stage, type Movie, type Sprite } from '../orig/stage';
import { isVoiceBusy } from '../orig/sound';
import { stopTalk, talk } from '../orig/voice';
import { LOOKS, itemName, itemSVG, portraitSVG } from './art';
import { sfx } from './audio';
import { h, toast } from './dom';

const LINES: Record<ExchangeSession['line'], (npc: string, price: number) => string> = {
  nothingToGive: (n) => `${n}: „Ich habe leider gar nichts, was ich dir geben könnte.“`,
  sell: (n, p) => `${n}: „Ich bin schlecht gelaunt. Wenn du was willst, kostet es ${p} Münzen!“`,
  swap: (n) => `${n}: „Na gut – tauschen wir? Gib mir etwas, dann bekommst du etwas.“`,
  gift: (n) => `${n}: „Heute ist ein schöner Tag! Such dir etwas aus – ein Geschenk!“`,
  tooPoor: (n, p) => `${n} will ${p} Münzen haben – so viele hast du nicht.`,
  nothingToOffer: (n) => `${n} möchte tauschen, aber du hast nichts in der Hosentasche.`,
};

const MOOD = (m: number) => (m <= 30 ? ['Schlecht gelaunt', 'mood-bad'] : m <= 60 ? ['Neutral', 'mood-mid'] : ['Gut gelaunt', 'mood-good']);

const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
/** OI081/OI082/OI083 = coin bags 5/10/20 (Drop Coins) */
const COIN_BAG: Record<number, string> = { 5: 'OI081', 10: 'OI082', 20: 'OI083' };

// ------------------------------------------------------------------ original Exchange movie

interface OrigExchange {
  el: HTMLElement;
  /** characterTalk for the NPC (mouth 40+n) */
  npcTalk(n: number | string): Promise<void>;
  /** playerTalk(n): "<Bingo|Puck>Talk-n" of the Exchange cast, mouth 54/65 */
  playerTalk(n: number): Promise<void>;
  /** show items in Angebot (11) / Nachfrage (12) */
  slots(offer: string | null, demand: string | null): void;
  destroy(): void;
}

async function mountOrigExchange(s: GameState, player: CharId, npc: CharId, onExit: () => void): Promise<OrigExchange | null> {
  const movie: Movie | null = await loadMovie('Exchange');
  if (!movie) return null;
  const stage = new Stage({ originY: 45, className: 'scene-orig' });
  const isScene = (sp: { ch: number; top: number; height: number }) => sp.ch < 80 && sp.top + sp.height > 45 && sp.top < 493;
  await stage.loadFrame(movie, 1, isScene);
  if (!stage.sprites.size) {
    stage.destroy();
    return null;
  }
  // prepareMovie: NPC on the treasure island (screen number > 30) -> Background-2
  if (parseInt(s.chars[npc].screen.slice(2, 5), 10) > 30) stage.sprite(10).setMember(movie.member('Background-2'));
  const n = +npc.slice(2);
  const pc = s.playerCharacter === 'Puck' ? 'Puck' : 'Bingo';
  const offs: (() => void)[] = [];
  const rand = (a: number, b: number) => rnd(Math.min(a, b), Math.max(a, b));
  for (const sp of stage.sprites.values()) {
    const left = sp.behavior('Character Visibility Links');
    const right = sp.behavior('Character Visibility Rechts');
    if (left) sp.visible = left.params.pCharacterID === player;
    if (right) sp.visible = right.params.pCharacterID === npc;
    for (const b of sp.behaviors) {
      const p = b.params ?? {};
      if (b.name === 'Animation Random Visible') {
        let on = p.pStartMode === '#visible';
        sp.blend = on ? 100 : 0;
        let next = performance.now() + rand(p.pMinInvisible ?? 2000, p.pMaxInvisible ?? 5000);
        offs.push(stage.onTick((now) => {
          if (now < next) return;
          on = !on;
          sp.blend = on ? 100 : 0;
          next = now + (on ? rand(p.pMinVisible ?? 100, p.pMaxVisible ?? 500) : rand(p.pMinInvisible ?? 2000, p.pMaxInvisible ?? 5000));
        }));
      } else if (b.name === 'Random Two-State Animation' || b.name === 'Animation Random-Delay Factor-Play') {
        const a = p.pFirstMember && movie.memberAt(p.pFirstMember.castLib || 1, p.pFirstMember.member);
        const z = p.pLastMember && movie.memberAt(p.pLastMember.castLib || 1, p.pLastMember.member);
        if (!a || !z) continue;
        const seq = movie.sequence(a, z);
        if (seq.length < 2) continue;
        const factor = b.name !== 'Random Two-State Animation';
        let atEnd = false, running = false;
        const wait = () => (factor ? rand(p.pWaitMin ?? 0, p.pWaitMax ?? 5000) : rand(p.pState1WaitMin ?? 0, p.pState1WaitMax ?? 5000));
        let next = performance.now() + wait();
        offs.push(stage.onTick((now) => {
          if (running || now < next || !sp.visible) return;
          running = true;
          const list = factor ? [...seq, ...[...seq].reverse().slice(1)] : atEnd ? [...seq].reverse() : seq;
          void stage.playMembers(sp.ch, list, +p.pFrameRate || 25).then(() => {
            if (!factor) atEnd = !atEnd;
            running = false;
            next = performance.now() + wait();
          });
        }));
      }
    }
  }
  // Hotspot-SP (23/24): back to the board
  for (const ch of [23, 24]) {
    if (!stage.has(ch)) continue;
    stage.sprite(ch).cursor = 'walk';
    offs.push(stage.on(ch, 'mouseUp', () => onExit()));
  }
  stage.cursorCh = player === 'CH2' ? 'CH2' : 'CH1';
  const showItem = (ch: number, id: string | null) => {
    if (!stage.has(ch)) return;
    const sp: Sprite = stage.sprite(ch);
    const m = id ? movie.member(id) : null;
    sp.setMember(m);
    sp.setRect(ch === 11 ? 271 : 434, ch === 11 ? 163 : 164);
    sp.blend = m ? 100 : 0;
  };
  const mouth = (ch: number) => (stage.has(ch) ? { stage, ch } : null);
  return {
    el: stage.el,
    npcTalk: (k) => talk(`${npc}-${k}`, { movie: 'Exchange_Exchange', mouth: mouth(40 + n), speaker: LOOKS[npc].name, host: stage.el }),
    playerTalk: (k) => talk(`${pc}Talk-${k}`, { movie: 'Exchange_Exchange', mouth: mouth(pc === 'Puck' ? 65 : 54), speaker: pc, host: stage.el }),
    slots: (o, d) => {
      showItem(11, o);
      showItem(12, d);
    },
    destroy: () => {
      stopTalk();
      offs.forEach((o) => o());
      stage.destroy();
    },
  };
}

// ------------------------------------------------------------------ view

export function openExchange(s: GameState, npc: CharId, onClose: () => void): HTMLElement {
  // the NPC's mood before the deal decides the start line (startMovie)
  const mood = s.chars[npc].mood;
  const npcHadItem = s.chars[npc].inventory.some((i) => i !== 'OI000');
  const ex = startExchange(s, npc);
  let selMine = -1;
  let selTheirs = -1;
  let orig: OrigExchange | null = null;
  let closed = false;
  const root = h('section', { class: 'exchange screen', 'aria-label': 'Tauschen' });
  const panel = h('div', { style: 'display:contents' });
  root.append(panel);

  const close = () => {
    if (closed) return;
    closed = true;
    // stopMovie: an unspent coin stack is refunded
    if (ex.mode === 'money' && ex.paid) refundCoins(s, ex);
    orig?.destroy();
    onClose();
  };

  /** original voice lines (only with the original sounds installed) */
  async function startVoice() {
    if (!orig) return;
    if (!npcHadItem) {
      if (mood > 30) await orig.npcTalk(rnd(15, 18));
    } else if (mood >= 1 && mood <= 10) await orig.npcTalk(14);
    else if (mood >= 11 && mood <= 20) await orig.npcTalk(13);
    else if (mood >= 21 && mood <= 30) await orig.npcTalk(12);
    else if (mood >= 31 && mood <= 60) await orig.npcTalk(rnd(1, 4));
    else if (mood >= 61 && mood <= 90) await orig.npcTalk(rnd(5, 7));
    // enterFrame #impossible: as soon as channel 4 is free -> playerTalk(1)
    if (ex.mode === 'impossible' && orig && !closed) await orig.playerTalk(1);
  }

  const syncSlots = () => {
    if (!orig) return;
    const me = s.chars[ex.player].inventory;
    const them = s.chars[npc].inventory;
    const offer = ex.mode === 'money' && ex.paid ? COIN_BAG[ex.price] : selMine >= 0 ? me[selMine] : null;
    orig.slots(offer && offer !== 'OI000' ? offer : null, selTheirs >= 0 && them[selTheirs] !== 'OI000' ? them[selTheirs] : null);
  };

  function render() {
    const me = s.chars[ex.player];
    const them = s.chars[npc];
    const [moodTxt, moodCls] = MOOD(them.mood);
    panel.innerHTML = '';
    const slot = (owner: 'mine' | 'theirs', i: number, item: string) => {
      const sel = owner === 'mine' ? selMine === i : selTheirs === i;
      return h('button', {
        class: `slot${sel ? ' selected' : ''}${item === 'OI000' ? ' empty' : ''}`,
        'aria-label': item === 'OI000' ? 'leer' : itemName(item),
        'aria-pressed': sel ? 'true' : 'false',
        onclick: () => {
          if (item === 'OI000' || ex.mode === 'done' || ex.mode === 'impossible') return;
          sfx.click();
          if (owner === 'mine') {
            selMine = selMine === i ? -1 : i;
            // Inventar Angebot.mouseUp: item placed in the offer slot -> CHn-8..11 in #exchange mode
            if (selMine >= 0 && ex.mode === 'exchange' && orig && !isTalking()) void orig.npcTalk(rnd(8, 11));
          } else selTheirs = selTheirs === i ? -1 : i;
          render();
        },
      }, h('span', { class: 'slot-inner' }, ...(item === 'OI000' ? [] : [fromSVG(itemSVG(item))])));
    };
    const status =
      ex.mode === 'done'
        ? 'Abgemacht! Mehr gibt es heute nicht.'
        : LINES[ex.line](LOOKS[npc].name, ex.price);

    const actions: HTMLElement[] = [];
    if (ex.mode === 'exchange' || (ex.mode === 'gift' && selMine >= 0)) {
      actions.push(h('button', {
        class: 'btn btn-primary', disabled: !(selMine >= 0 && selTheirs >= 0),
        onclick: () => {
          const r = swapItems(s, ex, selMine, selTheirs);
          if (r.ok) { sfx.give(); toast('Getauscht!', 'good'); selMine = selTheirs = -1; }
          render();
        },
      }, '⇄ Tauschen'));
    }
    if (ex.mode === 'gift' && selMine < 0) {
      actions.push(h('button', {
        class: 'btn btn-primary', disabled: selTheirs < 0,
        onclick: () => {
          const r = takeItem(s, ex, selTheirs);
          if (r.ok) { sfx.give(); toast('Geschenkt bekommen!', 'good'); selTheirs = -1; }
          else if (r.reason === 'noSpace') { noSpace(); }
          render();
        },
      }, '🎁 Annehmen'));
    }
    if (ex.mode === 'money') {
      const bag = itemImageUrl(COIN_BAG[ex.price] ?? '');
      actions.push(h('button', {
        class: 'btn btn-primary', disabled: selTheirs < 0,
        onclick: () => {
          if (!payCoins(s, ex)) { sfx.deny(); return; }
          const r = takeItem(s, ex, selTheirs);
          if (r.ok) { sfx.coin(); toast(`Für ${ex.price} Münzen gekauft.`, 'good'); selTheirs = -1; }
          else {
            refundCoins(s, ex);
            if (r.reason === 'noSpace') noSpace();
            else { sfx.deny(); toast('Das geht nicht.', 'bad'); }
          }
          render();
        },
      }, ...(bag ? [h('img', { src: bag, alt: '', style: 'width:1.8em;height:1.8em;vertical-align:middle;margin-right:.3em' })] : ['🪙 ']), `Für ${ex.price} Münzen kaufen`));
    }
    actions.push(h('button', { class: 'btn', onclick: close }, ex.mode === 'done' || ex.mode === 'impossible' ? 'Fertig' : 'Zurück'));

    panel.append(
      h('div', { class: 'ex-side ex-me' },
        ...(orig ? [] : [fromSVG(portraitSVG(ex.player))]),
        h('h3', {}, LOOKS[ex.player].name),
        h('div', { class: 'coins-line' }, `🪙 ${me.coins}`),
        h('div', { class: 'slots' }, ...me.inventory.map((it, i) => slot('mine', i, it)))),
      h('div', { class: 'ex-mid' },
        h('div', { class: 'bubble', role: 'status' }, status),
        h('div', { class: 'ex-actions' }, ...actions)),
      h('div', { class: 'ex-side ex-them' },
        ...(orig ? [] : [fromSVG(portraitSVG(npc))]),
        h('h3', {}, LOOKS[npc].name),
        h('div', { class: `mood ${moodCls}` }, moodTxt),
        h('div', { class: 'slots' }, ...them.inventory.map((it, i) => slot('theirs', i, it)))),
    );
    syncSlots();
  }

  /** Inventar Nachfrage.mouseUp in #money/#gift without a free pocket slot -> playerTalk(1) */
  function noSpace() {
    sfx.deny();
    if (orig) void orig.playerTalk(1);
    toast('Deine Hosentasche ist voll.', 'bad');
  }

  render();

  if (hasOriginalGfx() && hasOriginals()) {
    void mountOrigExchange(s, ex.player, npc, close).then((o) => {
      if (!o) return;
      if (closed || !root.isConnected) {
        o.destroy();
        return;
      }
      orig = o;
      // layout: original movie on top, controls below (inline styles: styles.css belongs to app)
      root.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;gap:8px;overflow:auto';
      Object.assign(o.el.style, { width: 'min(100%, 900px, calc((100vh - 260px) * 800 / 448))', alignSelf: 'center', flex: 'none' });
      panel.setAttribute('style', 'display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;align-items:center');
      root.prepend(o.el);
      render();
      void startVoice();
    });
  }
  return root;
}

/** soundBusy(4) */
const isTalking = () => isVoiceBusy();

export function fromSVG(markup: string): Element {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild ?? document.createElement('span');
}
