// Exchange screen (Tauschen). Tap-based so it works the same with mouse and touch:
// select own item + NPC item -> "Tauschen"; or pay coins / accept gift.

import { payCoins, refundCoins, startExchange, swapItems, takeItem, type ExchangeSession } from '../game/exchange';
import type { CharId, GameState } from '../game/types';
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

export function openExchange(s: GameState, npc: CharId, onClose: () => void): HTMLElement {
  const ex = startExchange(s, npc);
  let selMine = -1;
  let selTheirs = -1;
  const root = h('section', { class: 'exchange screen', 'aria-label': 'Tauschen' });

  const close = () => {
    // stopMovie: an unspent coin stack is refunded
    if (ex.mode === 'money' && ex.paid) refundCoins(s, ex);
    onClose();
  };

  function render() {
    const me = s.chars[ex.player];
    const them = s.chars[npc];
    const [moodTxt, moodCls] = MOOD(them.mood);
    root.innerHTML = '';
    const slot = (owner: 'mine' | 'theirs', i: number, item: string) => {
      const sel = owner === 'mine' ? selMine === i : selTheirs === i;
      return h('button', {
        class: `slot${sel ? ' selected' : ''}${item === 'OI000' ? ' empty' : ''}`,
        'aria-label': item === 'OI000' ? 'leer' : itemName(item),
        'aria-pressed': sel ? 'true' : 'false',
        onclick: () => {
          if (item === 'OI000' || ex.mode === 'done' || ex.mode === 'impossible') return;
          sfx.click();
          if (owner === 'mine') selMine = selMine === i ? -1 : i;
          else selTheirs = selTheirs === i ? -1 : i;
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
          else if (r.reason === 'noSpace') { sfx.deny(); toast('Deine Hosentasche ist voll.', 'bad'); }
          render();
        },
      }, '🎁 Annehmen'));
    }
    if (ex.mode === 'money') {
      actions.push(h('button', {
        class: 'btn btn-primary', disabled: selTheirs < 0,
        onclick: () => {
          if (!payCoins(s, ex)) { sfx.deny(); return; }
          const r = takeItem(s, ex, selTheirs);
          if (r.ok) { sfx.coin(); toast(`Für ${ex.price} Münzen gekauft.`, 'good'); selTheirs = -1; }
          else {
            refundCoins(s, ex);
            sfx.deny();
            toast(r.reason === 'noSpace' ? 'Deine Hosentasche ist voll.' : 'Das geht nicht.', 'bad');
          }
          render();
        },
      }, `🪙 Für ${ex.price} Münzen kaufen`));
    }
    actions.push(h('button', { class: 'btn', onclick: close }, ex.mode === 'done' || ex.mode === 'impossible' ? 'Fertig' : 'Zurück'));

    root.append(
      h('div', { class: 'ex-side ex-me' },
        fromSVG(portraitSVG(ex.player)),
        h('h3', {}, LOOKS[ex.player].name),
        h('div', { class: 'coins-line' }, `🪙 ${me.coins}`),
        h('div', { class: 'slots' }, ...me.inventory.map((it, i) => slot('mine', i, it)))),
      h('div', { class: 'ex-mid' },
        h('div', { class: 'bubble', role: 'status' }, status),
        h('div', { class: 'ex-actions' }, ...actions)),
      h('div', { class: 'ex-side ex-them' },
        fromSVG(portraitSVG(npc)),
        h('h3', {}, LOOKS[npc].name),
        h('div', { class: `mood ${moodCls}` }, moodTxt),
        h('div', { class: 'slots' }, ...them.inventory.map((it, i) => slot('theirs', i, it)))),
    );
  }
  render();
  return root;
}

export function fromSVG(markup: string): Element {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild ?? document.createElement('span');
}
