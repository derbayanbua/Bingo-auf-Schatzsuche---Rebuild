// Application controller: menus, game screen (board / scenes / exchange), HUD, turn flow, saving.

import { BOARDS, PLAYABLE_BOARDS, createInitialState, getPoint, pointId, splitPoint } from './game/data';
import {
  checkPointFree, checkPointTyp, characterContact, currentTargets, giveItem, isBoard, location, nextCharacter,
  npcTurn, placeJokeCard, playerChar, playerMoveTo, rollDice,
} from './game/logic';
import { makeRng } from './game/rng';
import type { CharId, GameEvent, GameState } from './game/types';
import { NPCS } from './game/types';
import { getScene, defaultClick, defaultUse, isVisible, objState, type SceneCtx, type SceneDef, type SceneObject } from './scenes/engine';
import { hasOriginalGfx } from './orig/gfx';
import { mountOrigScene, type OrigScene } from './orig/sceneView';
import {
  DEFAULT_SETTINGS, SAVE_FILENAME, SaveError, autosave, downloadSave, loadAutosave, readSaveFile,
  type SaveFile, type Settings,
} from './save/save';
import { LOOKS, dieSVG, itemName, itemSVG, portraitSVG } from './ui/art';
import { setEffectVolume, sfx, unlockAudio } from './ui/audio';
import { BoardView } from './ui/boardView';
import { dialog, h, sleep, toast } from './ui/dom';
import { fromSVG, openExchange } from './ui/exchangeView';
import { CHAPTER_TEXT, sceneTitle } from './scenes/meta';

type View = 'menu' | 'game';

export class App {
  private root: HTMLElement;
  game: GameState | null = null;
  settings: Settings = { ...DEFAULT_SETTINGS };
  /** board shown on screen (can differ from the player's board when browsing with the arrows) */
  private viewBoard = '';
  private targets: string[] = [];
  private busy = false;
  private hand: string | null = null;
  private handFrom: { kind: 'slot'; index: number } | { kind: 'joke' } | { kind: 'coin' } | null = null;
  private boardView: BoardView;
  private stageEl!: HTMLElement;
  private hudEl!: HTMLElement;
  private topEl!: HTMLElement;
  private overlayEl: HTMLElement | null = null;
  private mode: 'board' | 'scene' | 'exchange' = 'board';
  private moodTip: HTMLElement;
  /** original-graphics scene view (when public/orig is installed) */
  private orig: OrigScene | null = null;
  private origCh: CharId | null = null;
  private sceneToken = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    this.boardView = new BoardView({
      onPoint: (id) => void this.onPoint(id),
      onCharacter: (ch) => void this.onCharacter(ch),
      onHoverCharacter: (ch, x, y) => this.showMood(ch, x, y),
    });
    this.moodTip = h('div', { class: 'mood-tip', 'aria-hidden': 'true' });
    document.body.append(this.moodTip);
    document.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('pointerdown', unlockAudio, { once: true });
    const saved = loadAutosave();
    if (saved) this.settings = saved.session.settings;
    setEffectVolume(this.settings.effectVolume);
    this.showMenu();
  }

  // ================================================================ menus

  showMenu() {
    this.game && this.persist();
    this.destroyOrig();
    this.mode = 'board';
    const auto = loadAutosave();
    const fileInput = h('input', { type: 'file', accept: '.json,application/json,text/plain', class: 'visually-hidden', id: 'load-file' }) as HTMLInputElement;
    fileInput.addEventListener('change', () => void this.importFile(fileInput));
    const menu = h('main', { class: 'menu screen' },
      h('div', { class: 'menu-sky', 'aria-hidden': 'true' }, ...Array.from({ length: 14 }, (_, i) => h('span', { class: 'bubble-dot', style: `--i:${i}` }))),
      h('div', { class: 'menu-card' },
        h('div', { class: 'menu-heroes', 'aria-hidden': 'true' }, fromSVG(portraitSVG('CH1')), fromSVG(portraitSVG('CH2'))),
        h('h1', {}, 'Bingo ', h('span', {}, 'auf Schatzsuche')),
        h('p', { class: 'tagline' }, 'Das Brett- und Abenteuerspiel – neu für den Browser'),
        h('div', { class: 'menu-buttons' },
          auto ? h('button', { class: 'btn btn-primary btn-big', onclick: () => this.startFromSave(auto) }, '▶ Weiterspielen') : null,
          h('button', { class: `btn btn-big${auto ? '' : ' btn-primary'}`, onclick: () => void this.newGame() }, '✦ Neues Spiel'),
          h('label', { class: 'btn btn-big', for: 'load-file', tabindex: '0', role: 'button',
            onkeydown: (e: Event) => { if ((e as KeyboardEvent).key === 'Enter') fileInput.click(); } }, '📂 Spielstand laden'),
          fileInput,
          h('button', { class: 'btn', onclick: () => this.showHelp() }, '❓ Spielanleitung'),
          h('button', { class: 'btn', onclick: () => void this.showSettings() }, '⚙ Einstellungen'),
          h('button', { class: 'btn', onclick: () => this.showAbout() }, 'ℹ Über dieses Spiel'),
        ),
        auto ? h('p', { class: 'small' }, 'Dein Fortschritt wird automatisch in diesem Browser gespeichert. Das ist nicht dauerhaft garantiert – lade den Spielstand zur Sicherheit herunter.') : null,
      ),
    );
    this.root.replaceChildren(menu);
    (menu.querySelector('.btn-primary') as HTMLElement | null)?.focus();
  }

  private async newGame() {
    if (loadAutosave()) {
      const ok = await dialog('Neues Spiel?', 'Der automatisch gespeicherte Fortschritt in diesem Browser wird überschrieben. Lade ihn vorher herunter, wenn du ihn behalten möchtest.', [
        { label: 'Abbrechen', value: '' },
        { label: 'Neues Spiel starten', value: 'yes', primary: true, danger: true },
      ]);
      if (ok !== 'yes') return;
    }
    this.game = createInitialState('Bingo');
    this.viewBoard = '';
    await this.chapterCard(1);
    await this.storyCard('Intro', 'Bingo und Puck finden eine Flaschenpost – darin steckt ein Hinweis auf einen verschollenen Schatz! Doch zuerst müssen die beiden aus dem Haus …');
    this.enterGame();
  }

  private startFromSave(save: SaveFile) {
    this.game = save.game;
    this.settings = save.session.settings;
    setEffectVolume(this.settings.effectVolume);
    this.viewBoard = '';
    this.enterGame();
    toast('Spielstand geladen.', 'good');
  }

  private async importFile(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const save = await readSaveFile(file);
      if (this.game || loadAutosave()) {
        const ok = await dialog('Spielstand laden?', `Der aktuelle Fortschritt wird durch den Spielstand vom ${fmtDate(save.savedAt)} ersetzt.`, [
          { label: 'Abbrechen', value: '' },
          { label: 'Laden', value: 'yes', primary: true },
        ]);
        if (ok !== 'yes') return;
      }
      this.startFromSave(save);
      this.persist();
    } catch (e) {
      const msg = e instanceof SaveError ? e.message : 'Die Datei konnte nicht gelesen werden.';
      await dialog('Spielstand ungültig', msg, [{ label: 'OK', value: 'ok', primary: true }]);
    }
  }

  private showHelp() {
    void dialog('Spielanleitung', h('div', { class: 'help' },
      h('p', {}, 'Bingo und Puck suchen einen Schatz. Gespielt wird auf Inselbrettern und in Abenteuer-Szenen.'),
      h('ul', {},
        h('li', {}, '🎲 Tippe auf den Würfelbecher: Es wird mit zwei Würfeln gewürfelt (2–12). Alle Felder, die du in höchstens so vielen Schritten erreichst, leuchten auf. Tippe ein leuchtendes Feld an.'),
        h('li', {}, '⏭ Ist schon gewürfelt, setzt ein erneuter Tipp auf den Becher aus.'),
        h('li', {}, '⭐ Rote Sternfelder führen in Abenteuer-Szenen oder Spiele.'),
        h('li', {}, '😄 Witzfelder: Wer darüber läuft, bekommt einen Witz. Andere Figuren werden dadurch besser gelaunt. Aus deinem Witz-Stapel kannst du Witzkarten auf blaue Felder legen.'),
        h('li', {}, '🤝 Steht eine Figur direkt neben dir, kannst du sie antippen und mit ihr tauschen. Ihre Laune entscheidet: schlecht = sie will Münzen, neutral = tauschen, gut = sie schenkt dir etwas.'),
        h('li', {}, '🏴‍☠️ Vorsicht vor Rocco! Er stiehlt Gegenstände aus der Hosentasche und verkauft sie an andere Figuren.'),
        h('li', {}, '👆 Gegenstände: Tippe einen Gegenstand in der Hosentasche an, dann das Ziel (Figur, Feld, Objekt in der Szene). Erneut antippen oder Esc legt ihn zurück.'),
        h('li', {}, '⇄ Über die Figuren-Knöpfe wechselst du jederzeit zwischen Bingo und Puck.'),
        h('li', {}, '⌨ Tastatur: Leertaste = würfeln, Pfeiltasten = Nachbarbrett ansehen, Esc = Gegenstand zurücklegen.'),
      )), [{ label: 'Los geht’s', value: 'ok', primary: true }]);
  }

  private showAbout() {
    void dialog('Über dieses Spiel', h('div', { class: 'help' },
      h('p', {}, 'Eine eigenständige Neuprogrammierung des Spiels „Bingo auf Schatzsuche“ (Outline Multimedia / more software, 2001) mit HTML5 und TypeScript.'),
      h('p', {}, 'Spielregeln, Spielbretter und Abläufe wurden aus den Originaldateien rekonstruiert. Grafiken und Klänge sind neu gestaltet.'),
      h('p', { class: 'small' }, 'Läuft vollständig im Browser, ohne Plugins und ohne Server-Logik. Spielstände bleiben auf deinem Gerät.'),
    ), [{ label: 'Schließen', value: 'ok', primary: true }]);
  }

  private async showSettings() {
    const s = this.settings;
    const row = (label: string, key: 'voiceVolume' | 'effectVolume' | 'musicVolume') =>
      h('label', { class: 'setting' }, label,
        h('input', { type: 'range', min: '0', max: '255', value: String(s[key]), oninput: (e: Event) => {
          s[key] = parseInt((e.target as HTMLInputElement).value, 10);
          if (key === 'effectVolume') { setEffectVolume(s[key]); sfx.click(); }
        } }));
    const turbo = h('input', { type: 'checkbox', ...(s.turboJump ? { checked: true } : {}), onchange: (e: Event) => { s.turboJump = (e.target as HTMLInputElement).checked; } });
    await dialog('Einstellungen', h('div', { class: 'settings' },
      row('Effekte', 'effectVolume'),
      row('Sprache (noch ohne Sprachausgabe)', 'voiceVolume'),
      row('Musik (noch ohne Musik)', 'musicVolume'),
      h('label', { class: 'setting check' }, turbo, ' Turbo-Sprung (schnellere Figuren, Taste T)'),
    ), [{ label: 'Fertig', value: 'ok', primary: true }]);
    if (this.game) this.persist();
    else try { localStorage.setItem('bingo-schatzsuche.settings', JSON.stringify(s)); } catch { /* ignore */ }
  }

  private async chapterCard(n: 1 | 2 | 3) {
    await dialog(`Kapitel ${n}`, h('div', { class: 'chapter' }, h('div', { class: 'chapter-num' }, String(n)), h('p', {}, CHAPTER_TEXT[n])), [
      { label: 'Kapitel starten', value: 'ok', primary: true },
    ]);
  }

  private async storyCard(title: string, text: string) {
    await dialog(title, h('div', { class: 'story' },
      h('div', { class: 'story-art', 'aria-hidden': 'true' }, fromSVG(portraitSVG('CH1')), fromSVG(portraitSVG('CH2'))),
      h('p', {}, text)), [{ label: 'Weiter', value: 'ok', primary: true }]);
  }

  // ================================================================ game screen

  private enterGame() {
    this.destroyOrig();
    this.topEl = h('header', { class: 'topbar' });
    this.stageEl = h('div', { class: 'stage' });
    this.hudEl = h('footer', { class: 'hud' });
    this.root.replaceChildren(h('div', { class: 'game screen' }, this.topEl, this.stageEl, this.hudEl));
    this.mode = 'board';
    this.hand = null;
    this.handFrom = null;
    this.showCurrent();
    this.persist();
  }

  private get g(): GameState {
    return this.game!;
  }

  private rng() {
    return makeRng(this.g);
  }

  /** jumpToCurrentCharacter: show whatever screen the current character is on. */
  private showCurrent() {
    const c = this.g.chars[this.g.currentCharacter];
    if (isBoard(c.screen)) {
      this.viewBoard = c.screen;
      this.targets = currentTargets(this.g);
      this.renderBoard();
    } else if (c.screen) {
      this.renderScene(c.screen);
    }
    this.renderTop();
    this.renderHud();
  }

  persist() {
    if (!this.game) return;
    const ok = autosave(this.game, { view: this.mode === 'scene' ? this.g.chars[this.g.currentCharacter].screen : 'board', settings: this.settings });
    if (!ok) toast('Automatisches Speichern ist in diesem Browser nicht möglich – bitte Spielstand herunterladen.', 'bad', 4000);
  }

  private renderTop() {
    const c = this.g.chars[this.g.currentCharacter];
    const where = isBoard(c.screen) ? `Insel ${parseInt(c.screen.slice(2), 10) >= 31 ? 'der Schätze' : 'Heimat'} · Brett ${c.screen.slice(2)}` : sceneTitle(c.screen);
    this.topEl.replaceChildren(
      h('button', { class: 'icon-btn', 'aria-label': 'Menü', title: 'Menü', onclick: () => void this.gameMenu() }, '☰'),
      h('div', { class: 'where' }, where),
      h('button', { class: 'icon-btn', 'aria-label': 'Spielstand herunterladen', title: 'Spielstand herunterladen', onclick: () => this.download() }, '💾'),
    );
  }

  private download() {
    this.persist();
    downloadSave(this.g, { view: 'board', settings: this.settings });
    toast(`Spielstand als „${SAVE_FILENAME}“ heruntergeladen.`, 'good');
  }

  private async gameMenu() {
    const fileInput = h('input', { type: 'file', accept: '.json,application/json,text/plain', class: 'visually-hidden' }) as HTMLInputElement;
    fileInput.addEventListener('change', () => void this.importFile(fileInput));
    document.body.append(fileInput);
    const v = await dialog('Menü', h('p', { class: 'small' }, 'Der Fortschritt wird automatisch im Browser gespeichert. Für ein anderes Gerät: Spielstand herunterladen und dort laden.'), [
      { label: '💾 Spielstand herunterladen', value: 'save', primary: true },
      { label: '📂 Spielstand laden', value: 'load' },
      { label: '❓ Anleitung', value: 'help' },
      { label: '⚙ Einstellungen', value: 'settings' },
      { label: '🏠 Hauptmenü', value: 'main' },
      { label: 'Zurück zum Spiel', value: '' },
    ]);
    if (v === 'save') this.download();
    if (v === 'load') fileInput.click();
    else setTimeout(() => fileInput.remove(), 0);
    if (v === 'help') this.showHelp();
    if (v === 'settings') await this.showSettings();
    if (v === 'main') {
      this.persist();
      this.game = null;
      this.showMenu();
    }
  }

  // ---------------------------------------------------------------- HUD

  renderHud() {
    const g = this.g;
    const me = g.chars[g.currentCharacter];
    const pc = playerChar(g);
    const inv = g.chars[pc].inventory;
    const onBoard = this.mode === 'board' && isBoard(me.screen);
    const cube = g.cubePoints;
    const dice = cube ? (cube < 7 ? [1, cube - 1] : [6, cube - 6]) : [];

    const switchBtn = (ch: CharId) =>
      h('button', {
        class: `switch${pc === ch ? ' active' : ''}`,
        'aria-pressed': pc === ch ? 'true' : 'false',
        'aria-label': `${LOOKS[ch].name} steuern`,
        title: `${LOOKS[ch].name} steuern`,
        onclick: () => this.switchPlayer(ch),
      }, fromSVG(portraitSVG(ch)));

    const slots = inv.map((it, i) =>
      h('button', {
        class: `slot${it === 'OI000' ? ' empty' : ''}${this.handFrom?.kind === 'slot' && this.handFrom.index === i ? ' lifted' : ''}`,
        'aria-label': it === 'OI000' ? `Tasche ${i + 1}: leer` : `Tasche ${i + 1}: ${itemName(it)}`,
        title: it === 'OI000' ? 'leer' : itemName(it),
        onclick: () => this.onSlot(i),
      }, h('span', { class: 'slot-inner' }, ...(it === 'OI000' ? [] : [fromSVG(itemSVG(it))]))));

    this.hudEl.replaceChildren(
      h('div', { class: 'hud-group switches' }, switchBtn('CH1'), switchBtn('CH2')),
      h('div', { class: 'hud-group pocket', role: 'group', 'aria-label': 'Hosentasche' }, ...slots),
      h('div', { class: 'hud-group piles' },
        h('button', { class: 'pile coins', title: 'Münzen – antippen, um eine Münze in die Hand zu nehmen', 'aria-label': `${me.coins} Münzen`, onclick: () => this.takeCoin() },
          fromSVG(itemSVG('OI007')), h('b', {}, String(g.chars[pc].coins))),
        h('button', { class: 'pile jokes', title: 'Witze – antippen, um eine Witzkarte zu ziehen', 'aria-label': `${g.chars[pc].jokes} Witze`, onclick: () => this.takeJoke() },
          fromSVG(itemSVG('OI006')), h('b', {}, String(g.chars[pc].jokes)))),
      onBoard
        ? h('div', { class: 'hud-group dice' },
            h('div', { class: 'dice-faces', 'aria-live': 'polite', 'aria-label': cube ? `Gewürfelt: ${cube}` : 'Noch nicht gewürfelt' },
              ...dice.map((d) => fromSVG(dieSVG(d)))),
            h('button', {
              class: `shaker${cube ? ' pass' : ''}`,
              disabled: this.busy || g.currentCharacter !== pc,
              onclick: () => void this.onShaker(),
            }, cube ? 'Aussetzen' : 'Würfeln'))
        : h('div', { class: 'hud-group dice' }),
      ...(this.hand
        ? [h('div', { class: 'hand', role: 'status' }, fromSVG(itemSVG(this.hand)), h('span', {}, `${itemName(this.hand)} in der Hand`),
            h('button', { class: 'btn btn-small', onclick: () => this.returnHand() }, 'Zurücklegen'))]
        : []),
    );
    this.orig?.sync();
  }

  private switchPlayer(ch: CharId) {
    if (this.busy) return;
    const g = this.g;
    if (playerChar(g) === ch && g.currentCharacter === ch) return;
    this.returnHand();
    sfx.click();
    g.playerCharacter = ch === 'CH1' ? 'Bingo' : 'Puck';
    // Bingo/Puck Switch: becomes the current character, dice stay
    g.currentCharacter = ch;
    this.mode = 'board';
    this.persist();
    this.showCurrent();
  }

  // ---------------------------------------------------------------- hand / items

  private onSlot(i: number) {
    const pc = playerChar(this.g);
    const inv = this.g.chars[pc].inventory;
    if (this.hand) {
      // drop into an empty slot / back to source
      if (this.handFrom?.kind === 'slot' && this.handFrom.index === i) return this.returnHand();
      if (inv[i] !== 'OI000') return this.returnHand();
      if (this.hand === 'OI006' || this.hand === 'OI007') return this.returnHand();
      inv[i] = this.hand;
      this.clearHand();
      return;
    }
    if (inv[i] === 'OI000') return;
    sfx.click();
    this.hand = inv[i];
    this.handFrom = { kind: 'slot', index: i };
    inv[i] = 'OI000';
    this.renderHud();
  }

  private takeCoin() {
    if (this.hand) return this.returnHand();
    const pc = playerChar(this.g);
    if (this.g.chars[pc].coins < 1) return toast('Keine Münzen mehr.', 'bad');
    this.g.chars[pc].coins--;
    this.hand = 'OI007';
    this.handFrom = { kind: 'coin' };
    sfx.coin();
    this.renderHud();
  }

  private takeJoke() {
    if (this.hand) return this.returnHand();
    const pc = playerChar(this.g);
    if (this.g.chars[pc].jokes < 1) return toast('Du hast keine Witze. Lauf über Witzfelder oder besuche den Witzomaten!', 'info', 3500);
    this.g.chars[pc].jokes--;
    this.hand = 'OI006';
    this.handFrom = { kind: 'joke' };
    sfx.click();
    this.renderHud();
    toast('Lege die Witzkarte auf ein blaues Feld.', 'info');
  }

  returnHand() {
    if (!this.hand || !this.handFrom) return;
    const pc = playerChar(this.g);
    if (this.handFrom.kind === 'slot') {
      const inv = this.g.chars[pc].inventory;
      if (inv[this.handFrom.index] === 'OI000') inv[this.handFrom.index] = this.hand;
      else giveItem(this.g, pc, this.hand);
    } else if (this.handFrom.kind === 'coin') this.g.chars[pc].coins++;
    else if (this.handFrom.kind === 'joke') this.g.chars[pc].jokes++;
    this.clearHand();
  }

  private clearHand() {
    this.hand = null;
    this.handFrom = null;
    this.renderHud();
    this.persist();
  }

  // ---------------------------------------------------------------- board

  private renderBoard() {
    this.destroyOrig();
    this.mode = 'board';
    const g = this.g;
    const tgt = this.viewBoard === g.chars[g.currentCharacter].screen ? this.targets : this.targets.filter((t) => t.startsWith(this.viewBoard));
    this.boardView.show(g, this.viewBoard, tgt);
    const arrows = (['oben', 'rechts', 'unten', 'links'] as const).map((dir, d) => {
      const nb = neighbourBoard(this.viewBoard, d);
      return nb ? h('button', { class: `edge-arrow edge-${dir}`, 'aria-label': `Brett ${nb.slice(2)} ansehen`, title: `Brett ${nb.slice(2)} ansehen`, onclick: () => this.browseBoard(nb) }, '➜') : null;
    });
    const back = this.viewBoard !== g.chars[g.currentCharacter].screen && isBoard(g.chars[g.currentCharacter].screen)
      ? h('button', { class: 'btn btn-small back-to-me', onclick: () => this.browseBoard(g.chars[g.currentCharacter].screen) }, `Zurück zu ${LOOKS[g.currentCharacter].name}`)
      : null;
    const scroller = h('div', { class: 'board-scroll' }, this.boardView.svg);
    this.stageEl.replaceChildren(h('div', { class: 'board-wrap' }, scroller, ...arrows.filter(Boolean) as HTMLElement[], ...(back ? [back] : [])));
    // on narrow portrait screens the board is wider than the screen: centre the active figure
    requestAnimationFrame(() => {
      if (scroller.scrollWidth <= scroller.clientWidth + 2) return;
      const c = g.chars[g.currentCharacter];
      const p = c.screen === this.viewBoard && c.position ? BOARDS[this.viewBoard][c.position - 1] : null;
      const x = p ? (p.x / 800) * scroller.scrollWidth : scroller.scrollWidth / 2;
      scroller.scrollLeft = x - scroller.clientWidth / 2;
    });
  }

  private browseBoard(b: string) {
    if (this.busy) return;
    this.viewBoard = b;
    this.renderBoard();
    this.renderTop();
  }

  private async onShaker() {
    const g = this.g;
    if (this.busy || g.currentCharacter !== playerChar(g)) return;
    this.returnHand();
    if (g.cubePoints) {
      // "Aussetzen": skip the move
      g.cubePoints = 0;
      this.targets = [];
      await this.npcRound();
      return;
    }
    sfx.shake();
    this.busy = true;
    this.renderHud();
    await sleep(350);
    this.targets = rollDice(g, this.rng());
    sfx.roll();
    this.busy = false;
    if (this.viewBoard !== g.chars[g.currentCharacter].screen) this.viewBoard = g.chars[g.currentCharacter].screen;
    this.renderBoard();
    this.renderHud();
    this.persist();
  }

  private async onPoint(id: string) {
    const g = this.g;
    if (this.busy) return;
    if (this.hand === 'OI006') {
      // Witzkarte on a blue point
      if (placeJokeCard(g, id)) {
        sfx.joke();
        this.hand = null;
        this.handFrom = null;
        this.targets = currentTargets(g);
        this.renderBoard();
        this.renderHud();
        this.persist();
      } else {
        sfx.deny();
        this.returnHand();
      }
      return;
    }
    if (this.hand) return this.returnHand();
    if (!g.cubePoints || !this.targets.includes(id) || g.currentCharacter !== playerChar(g)) {
      return;
    }
    this.busy = true;
    this.targets = [];
    this.boardView.targets = [];
    this.boardView.renderPoints(g);
    const res = playerMoveTo(g, id);
    await this.animateMove(res.ch, res.path, res.events);
    this.busy = false;
    this.persist();
    await this.npcRound();
  }

  private stepMs() {
    return this.settings.turboJump ? 90 : 260;
  }

  private async animateMove(ch: CharId, path: string[], events: GameEvent[]) {
    const visible = path.some((p) => p.startsWith(this.viewBoard));
    if (visible && path.length > 1) {
      // put the token back to the start for the animation
      await this.boardView.animatePath(ch, path, this.stepMs(), (pid) => {
        const pt = getPoint(pid);
        if (pt) sfx.step(pt.g);
        const [b, n] = splitPoint(pid);
        if (events.some((e) => e.type === 'joke' && e.point === pid) && b === this.viewBoard) {
          sfx.joke();
          void n;
          this.boardView.renderPoints(this.g);
        }
      });
    }
    this.boardView.renderChars(this.g);
    this.boardView.renderPoints(this.g);
    for (const e of events) this.announce(e);
    this.renderHud();
  }

  private announce(e: GameEvent) {
    const name = (c: CharId) => LOOKS[c].name;
    if (e.type === 'joke' && (e.ch === 'CH1' || e.ch === 'CH2')) toast(`${name(e.ch)} hat einen Witz gefunden! 😄`, 'good');
    if (e.type === 'joke' && /CH[3-8]/.test(e.ch) && e.point.startsWith(this.viewBoard)) toast(`${name(e.ch)} lacht über einen Witz und ist besser gelaunt.`, 'info');
    if (e.type === 'steal') { sfx.steal(); toast(`Rocco hat ${name(e.from)} ${itemName(e.item)} geklaut!`, 'bad', 4000); }
    if (e.type === 'sell') toast(`Rocco hat ${itemName(e.item)} an ${name(e.to)} verkauft.`, 'info', 3500);
  }

  /** NPC turns CH3..CH9, then back to the player (nextCharacter loop). */
  private async npcRound() {
    const g = this.g;
    this.busy = true;
    this.renderHud();
    nextCharacter(g); // player -> CH3
    for (;;) {
      const ch = g.currentCharacter;
      if (ch === 'CH1' || ch === 'CH2') break;
      const res = npcTurn(g, ch, this.rng());
      if (res.path.length > 1 && res.path.some((p) => p.startsWith(this.viewBoard))) {
        await this.animateMove(ch, res.path, res.events);
      } else {
        for (const e of res.events) this.announce(e);
      }
      if (nextCharacter(g)) break;
    }
    this.busy = false;
    this.persist();
    // back to the player's screen (scene if the player landed on an adventure field)
    const me = g.chars[g.currentCharacter];
    if (!isBoard(me.screen)) {
      sfx.enter();
      this.renderScene(me.screen);
      this.renderTop();
      this.renderHud();
      return;
    }
    if (this.viewBoard !== me.screen) this.viewBoard = me.screen;
    this.targets = [];
    this.renderBoard();
    this.renderTop();
    this.renderHud();
  }

  private async onCharacter(ch: CharId) {
    const g = this.g;
    if (this.busy) return;
    const pc = playerChar(g);
    if (this.hand) {
      // dropping an item on a character gives it away (not coins / joke cards)
      if (this.hand === 'OI006' || this.hand === 'OI007' || ch === pc) return this.returnHand();
      const same = g.chars[ch].screen === g.chars[pc].screen;
      if (same && giveItem(g, ch, this.hand)) {
        sfx.give();
        toast(`${itemName(this.hand)} an ${LOOKS[ch].name} gegeben.`, 'info');
        this.clearHand();
      } else this.returnHand();
      return;
    }
    if (!NPCS.includes(ch)) return;
    if (!characterContact(g, ch, pc)) {
      toast(`${LOOKS[ch].name} steht zu weit weg. Stell dich direkt neben die Figur.`, 'info');
      return;
    }
    this.mode = 'exchange';
    this.destroyOrig();
    sfx.click();
    this.stageEl.replaceChildren(openExchange(g, ch, () => {
      this.persist();
      this.mode = 'board';
      this.renderBoard();
      this.renderHud();
    }));
    this.renderHud();
  }

  private showMood(ch: CharId | null, x: number, y: number) {
    if (!ch || !this.game) {
      this.moodTip.classList.remove('show');
      return;
    }
    const m = this.g.chars[ch].mood;
    const face = m <= 30 ? '☹️' : m <= 60 ? '😐' : '😊';
    this.moodTip.textContent = `${LOOKS[ch].name} ${face}`;
    this.moodTip.style.left = `${x}px`;
    this.moodTip.style.top = `${y}px`;
    this.moodTip.classList.add('show');
  }

  // ---------------------------------------------------------------- scenes

  private sceneCtx(def: SceneDef): SceneCtx {
    const g = this.g;
    const self = this;
    const field = (screen: string) => (g.sceneState[screen] ??= {});
    return {
      s: g,
      get: (k, screen = def.id) => g.sceneState[screen]?.[k],
      set: (k, v, screen = def.id) => {
        field(screen)[k] = v;
      },
      get hand() {
        return self.hand;
      },
      consumeHand: () => {
        self.hand = null;
        self.handFrom = null;
      },
      give: (item) => giveItem(g, playerChar(g), item),
      ch: playerChar(g),
      gotoScene: (id) => {
        g.chars[playerChar(g)].screen = id;
        g.chars[playerChar(g)].position = 0;
        sfx.enter();
        self.persist();
        self.renderScene(id);
        self.renderTop();
        self.renderHud();
      },
      gotoBoard: (board, pos, dir) => {
        const id = pointId(board, pos);
        if (!checkPointFree(g, id)) {
          self.say('Da steht schon jemand. Ich warte lieber.');
          return;
        }
        const c = g.chars[playerChar(g)];
        c.screen = board;
        c.position = pos;
        c.direction = dir;
        self.persist();
        self.showCurrent();
      },
      say: (t) => self.say(t),
      story: (title, text) => self.storyCard(title, text),
      rerender: () => self.renderScene(def.id),
      addCoins: (n) => { g.chars[playerChar(g)].coins += n; },
      addJokes: (n) => { g.chars[playerChar(g)].jokes += n; },
    };
  }

  say(text: string) {
    toast(`${LOOKS[playerChar(this.g)].name}: „${text}“`, 'info', 3200);
  }

  /** default click / drop handling of an engine object, then re-render (shared by SVG + original view) */
  private activateObject(def: SceneDef, ctx: SceneCtx, o: SceneObject) {
    if (this.busy) return;
    if (this.hand) {
      const item = this.hand;
      const accepted = defaultUse(ctx, def, o, item);
      if (accepted) {
        sfx.give();
        this.hand = null;
        this.handFrom = null;
      } else if (this.hand) this.returnHand();
    } else {
      sfx.click();
      defaultClick(ctx, def, o);
    }
    this.persist();
    if (this.mode === 'scene' && this.g.chars[playerChar(this.g)].screen === def.id) this.renderScene(def.id);
    this.renderHud();
  }

  private destroyOrig() {
    this.sceneToken++;
    this.orig?.destroy();
    this.orig = null;
  }

  renderScene(id: string) {
    this.mode = 'scene';
    const def = getScene(id);
    if (!def) {
      this.destroyOrig();
      this.stageEl.replaceChildren(this.placeholderScene(id));
      return;
    }
    if (hasOriginalGfx()) {
      const pc = playerChar(this.g);
      if (this.orig && this.orig.alive && this.orig.id === id && this.origCh === pc && this.orig.el.isConnected) {
        this.orig.sync();
        return;
      }
      this.destroyOrig();
      const token = this.sceneToken;
      const ctx = this.sceneCtx(def);
      const note = def.reconstructed ? null : h('div', { class: 'scene-note' }, '[Prüfung erforderlich] ', def.note ?? 'Diese Szene ist noch nicht vollständig rekonstruiert.');
      const wrap = h('div', { class: 'scene-wrap orig' }, note);
      this.stageEl.replaceChildren(wrap);
      void mountOrigScene(wrap, {
        def, ctx,
        activate: (o) => this.activateObject(def, ctx, o),
        isBusy: () => this.busy,
        persist: () => this.persist(),
      }).then((sc) => {
        if (token !== this.sceneToken || !wrap.isConnected) {
          sc?.destroy();
          return;
        }
        if (!sc) {
          this.renderSceneSvg(def);
          return;
        }
        this.orig = sc;
        this.origCh = pc;
        if (def.onEnter) void def.onEnter(ctx);
      });
      return;
    }
    this.renderSceneSvg(def);
  }

  private renderSceneSvg(def: SceneDef) {
    this.destroyOrig();
    const ctx = this.sceneCtx(def);
    const objs = def.objects.filter((o) => isVisible(ctx, def, o));
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 800 448');
    svg.setAttribute('class', 'scene');
    let markup = def.backdrop(ctx);
    for (const o of objs) {
      const st = objState(ctx, o);
      const art = o.draw ? o.draw(ctx, st) : defaultObjectArt(o, st);
      const interactive = o.kind !== 'deco' || !!o.onClick;
      markup += `<g class="obj obj-${o.kind}${interactive ? ' hot' : ''}" data-key="${o.key}" ${interactive ? `role="button" tabindex="0" aria-label="${escapeAttr(o.label)}"` : ''}>${art}${interactive ? `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="10" class="hit"/>` : ''}<title>${escapeAttr(o.label)}</title></g>`;
    }
    if (def.overlay) markup += `<g class="scene-overlay" pointer-events="none">${def.overlay(ctx)}</g>`;
    svg.innerHTML = markup;
    const activate = (el: Element | null) => {
      const g = el?.closest('[data-key]') as SVGGElement | null;
      if (!g || this.busy) return;
      const o = def.objects.find((x) => x.key === g.dataset.key);
      if (!o) return;
      this.activateObject(def, ctx, o);
    };
    svg.addEventListener('click', (e) => activate(e.target as Element));
    svg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate(e.target as Element);
      }
    });
    const note = def.reconstructed ? null : h('div', { class: 'scene-note' }, '[Prüfung erforderlich] ', def.note ?? 'Diese Szene ist noch nicht vollständig rekonstruiert.');
    this.stageEl.replaceChildren(h('div', { class: 'scene-wrap' }, svg, note));
    if (def.onEnter) void def.onEnter(ctx);
  }

  private placeholderScene(id: string): HTMLElement {
    const g = this.g;
    const back = g.lastBoardPoint[playerChar(g)];
    return h('div', { class: 'scene-wrap placeholder' },
      h('div', { class: 'placeholder-card' },
        h('h2', {}, sceneTitle(id)),
        h('p', {}, `[Prüfung erforderlich] Die Szene ${id} ist in dieser Version noch nicht umgesetzt.`),
        back
          ? h('button', { class: 'btn btn-primary', onclick: () => {
              const [b, n] = splitPoint(back);
              const c = g.chars[playerChar(g)];
              c.screen = b; c.position = n; c.direction = 1;
              this.persist();
              this.showCurrent();
            } }, 'Zurück aufs Spielfeld')
          : null));
  }

  // ---------------------------------------------------------------- keyboard

  private onKey(e: KeyboardEvent) {
    if (!this.game || document.querySelector('.overlay')) return;
    const t = e.target as HTMLElement;
    if (t && /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
    if (e.key === 'Escape' && this.hand) return this.returnHand();
    if (e.key === 't' || e.key === 'T') {
      this.settings.turboJump = !this.settings.turboJump;
      toast(`Turbo-Sprung ${this.settings.turboJump ? 'an' : 'aus'}`, 'info');
      return;
    }
    if (this.mode !== 'board') return;
    if (e.key === ' ' && t?.tagName !== 'BUTTON') {
      e.preventDefault();
      void this.onShaker();
    }
    const d = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'].indexOf(e.key);
    if (d >= 0) {
      const nb = neighbourBoard(this.viewBoard, d);
      if (nb) {
        e.preventDefault();
        this.browseBoard(nb);
      }
    }
  }
}

/** changeSP / Framescript SP: first neighbour board referenced in the given direction. */
export function neighbourBoard(board: string, d: number): string | null {
  for (const p of BOARDS[board] ?? []) {
    const nb = p.nb[d];
    if (nb && !nb.startsWith(board) && PLAYABLE_BOARDS.includes(nb.slice(0, 5))) return nb.slice(0, 5);
  }
  return null;
}

function defaultObjectArt(o: { x: number; y: number; w: number; h: number; kind: string; item?: string; label: string; icon?: string }, st?: string): string {
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  if (o.kind === 'item' && o.item) {
    return `<g transform="translate(${cx} ${cy})"><circle r="30" fill="rgba(255,255,255,.35)"/><g transform="translate(-28 -28) scale(.875)">${itemSVG(o.item).replace('<svg ', '<svg width="64" height="64" ')}</g></g>`;
  }
  if (o.kind === 'exit' || o.kind === 'boardExit' || o.kind === 'game') {
    const sym = o.kind === 'game' ? '🎮' : o.kind === 'boardExit' ? '🗺' : '🚪';
    return `<g transform="translate(${cx} ${cy})"><circle r="24" class="exit-dot"/><text y="8" text-anchor="middle" font-size="22">${sym}</text></g>`;
  }
  if (o.kind === 'twoState') {
    return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="8" class="twostate ${st ?? ''}"/>`;
  }
  return `<text x="${cx}" y="${cy}" text-anchor="middle" font-size="22">${o.icon ?? '❔'}</text>`;
}

function escapeAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? 'unbekannt' : d.toLocaleString('de-DE');
}

export { checkPointTyp, location };


