// Application controller: menus, game screen (board / scenes / exchange), HUD, turn flow, saving.

import { BOARDS, PLAYABLE_BOARDS, createInitialState, getPoint, pointId, splitPoint } from './game/data';
import {
  checkPointFree, checkPointTyp, characterContact, currentTargets, giveItem, isBoard, location, nextCharacter,
  npcTurn, placeJokeCard, playerChar, playerMoveTo, rollDice, toggleBlocker,
} from './game/logic';
import { makeRng } from './game/rng';
import type { CharId, GameEvent, GameState } from './game/types';
import { NPCS } from './game/types';
import { getScene, defaultClick, defaultUse, isDropSpot, isVisible, objState, type HandSource, type SceneCtx, type SceneDef, type SceneObject } from './scenes/engine';
import { hasOriginalGfx } from './orig/gfx';
import { hasOriginals } from './orig/assets';
import { hasSmacker, playSmacker } from './orig/media';
import { applyMovieAudio } from './orig/movieAudio';
import { hasOrigPort, mountOrigScene, type OrigScene } from './orig/sceneView';
import { chapterScreen, introScreen, menuButtonTalk, menuGreeting, setChapterHandler, stopMenuVoice } from './orig/screens';
import { playVoice, setVolumes, unlock as unlockOrigAudio } from './orig/sound';
import { loadTranscripts, setSubtitles, talk } from './orig/voice';
import {
  DEFAULT_SETTINGS, SAVE_FILENAME, SaveError, autosave, downloadSave, loadAutosave, loadSettings, readSaveFile, storeSettings,
  type SaveFile, type Settings,
} from './save/save';
import { LOOKS, dieSVG, itemName, itemSVG, portraitSVG } from './ui/art';
import { setEffectVolume, sfx, unlockAudio } from './ui/audio';
import { BoardView } from './ui/boardView';
import { dialog, h, sleep, toast } from './ui/dom';
import { fromSVG, openExchange } from './ui/exchangeView';
import { CHAPTER_TEXT, sceneTitle } from './scenes/meta';

type View = 'menu' | 'game';

/**
 * Source of the item in the hand (sprite 110 mySourceSprite) = where #returnToSource puts it back.
 * `screen` on scene-bound sources: leaving that scene returns the item first.
 */
type HandFrom =
  | { kind: 'slot'; index: number; ch: CharId }
  | { kind: 'joke' }
  | { kind: 'coin' }
  | { kind: 'scene'; screen: string; key: string; value: string; links: { screen: string; key: string }[] }
  | { kind: 'fn'; screen: string; back: (item: string) => void }
  | { kind: 'pocket' }
  | { kind: 'lost' };

export class App {
  private root: HTMLElement;
  game: GameState | null = null;
  settings: Settings = { ...DEFAULT_SETTINGS };
  /** board shown on screen (can differ from the player's board when browsing with the arrows) */
  private viewBoard = '';
  private targets: string[] = [];
  private busy = false;
  private hand: string | null = null;
  private handFrom: HandFrom | null = null;
  /** increments with every new hand item (detects "the drop target kept it / took something else") */
  private handSeq = 0;
  /** sprite 110: the held item follows the pointer (touch: shown above the finger) */
  private handEl: HTMLElement;
  private ptr = { x: -1, y: -1, touch: false };
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
      onObstacle: (b, n) => this.onObstacle(b, n),
    });
    this.moodTip = h('div', { class: 'mood-tip', 'aria-hidden': 'true' });
    document.body.append(this.moodTip);
    this.handEl = h('div', { class: 'hand-sprite', 'aria-hidden': 'true' });
    document.body.append(this.handEl);
    const track = (e: PointerEvent) => {
      this.ptr = { x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse' };
      this.placeHandEl();
    };
    window.addEventListener('pointermove', track, { capture: true, passive: true });
    window.addEventListener('pointerdown', track, { capture: true, passive: true });
    // an item already in the hand can also be dragged to its target
    window.addEventListener('pointerdown', (e) => {
      if (this.hand && this.game && !(e.target as Element | null)?.closest?.('.overlay, .hud .hand')) this.startDrag(e, null);
    }, true);
    // clicks that end a drag must not also count as a tap
    window.addEventListener('click', (e) => {
      if (e.isTrusted && performance.now() < this.noClickUntil) {
        e.stopPropagation();
        e.preventDefault();
      }
    }, true);
    document.addEventListener('keydown', (e) => this.onKey(e));
    document.addEventListener('pointerdown', unlockAudio, { once: true });
    // original sounds (optional): unlock on every gesture (iOS), greet once audio runs
    const gesture = () => {
      unlockOrigAudio();
      if (!this.game && document.querySelector('.menu')) void menuGreeting();
    };
    document.addEventListener('pointerdown', gesture);
    document.addEventListener('keydown', gesture);
    const saved = loadAutosave();
    this.settings = loadSettings() ?? (saved ? saved.session.settings : { ...DEFAULT_SETTINGS });
    this.applySettings();
    setChapterHandler((n) => this.startChapter(n));
    if (hasOriginals()) void loadTranscripts();
    this.showMenu();
  }

  /** push volumes / subtitle setting into the synth and the original sound engine */
  private applySettings() {
    const s = this.settings;
    setEffectVolume(s.effectVolume);
    setVolumes({ voice: s.voiceVolume, effect: s.effectVolume, music: s.musicVolume });
    setSubtitles(s.subtitles);
  }

  // ================================================================ menus

  showMenu() {
    this.game && this.persist();
    this.destroyOrig();
    this.hand = null;
    this.handFrom = null;
    this.placeHandEl();
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
          auto ? h('button', { class: 'btn btn-primary btn-big', 'data-talk': '1', onclick: () => this.startFromSave(auto) }, '▶ Weiterspielen') : null,
          h('button', { class: `btn btn-big${auto ? '' : ' btn-primary'}`, 'data-talk': '1', onclick: () => void this.newGame() }, '✦ Neues Spiel'),
          h('label', { class: 'btn btn-big', for: 'load-file', tabindex: '0', role: 'button', 'data-talk': '1',
            onkeydown: (e: Event) => { if ((e as KeyboardEvent).key === 'Enter') fileInput.click(); } }, '📂 Spielstand laden'),
          fileInput,
          h('button', { class: 'btn', 'data-talk': '2', onclick: () => this.showHelp() }, '❓ Spielanleitung'),
          h('button', { class: 'btn', 'data-talk': '4', onclick: () => void this.showSettings() }, '⚙ Einstellungen'),
          hasOriginalGfx() ? h('button', { class: 'btn', 'data-talk': '3', onclick: () => void this.showIntro() }, '🎬 Intro ansehen') : null,
          h('button', { class: 'btn', 'data-talk': '3', onclick: () => this.showAbout() }, 'ℹ Über dieses Spiel'),
        ),
        auto ? h('p', { class: 'small' }, 'Dein Fortschritt wird automatisch in diesem Browser gespeichert. Das ist nicht dauerhaft garantiert – lade den Spielstand zur Sicherheit herunter.') : null,
      ),
    );
    this.root.replaceChildren(menu);
    (menu.querySelector('.btn-primary') as HTMLElement | null)?.focus();
    if (hasOriginals()) {
      // Interface\Main: ambience "Meer"/"Ocean-4", no music; Bingo greets and comments the buttons
      void applyMovieAudio('Main');
      void menuGreeting();
      menu.querySelectorAll<HTMLElement>('[data-talk]').forEach((b) => {
        b.addEventListener('mouseenter', () => void menuButtonTalk(+b.dataset.talk! as 1 | 2 | 3 | 4 | 5));
        b.addEventListener('pointerdown', () => sfx.button());
      });
    }
  }

  private async showIntro() {
    stopMenuVoice();
    await introScreen(document.body);
    if (!this.game) this.showMenu();
  }

  /**
   * Chapter start (Chapter\Chapter-n). Chapter 1 is entered from newGame(); chapters 2/3 from scene
   * ports via startChapter(n) (src/orig/screens.ts). Chapter 2/3 (original Chapter-n Next.mouseUp):
   * CH1 + CH2 -> AS020-01 / AS030-01, both inventories cleared (coins/jokes stay). This is the only
   * place doing it, whichever scene starts the chapter.
   */
  async startChapter(n: 1 | 2 | 3) {
    if (n === 1) return this.newGame(true);
    if (!this.game) return;
    this.destroyOrig();
    this.returnHand();
    await this.chapterCard(n);
    const g = this.g;
    // Chapter-2/-3 Taster.mouseUp: setCharacterScreen(#CH1/#CH2, first scene) + setInventar(..., "OI000")
    // for all three pocket slots of both (coins/jokes stay).
    const first = n === 2 ? 'AS020-01' : 'AS030-01';
    for (const ch of ['CH1', 'CH2'] as const) {
      const c = g.chars[ch];
      c.screen = first;
      c.position = 0;
      c.inventory = ['OI000', 'OI000', 'OI000'];
    }
    g.currentCharacter = playerChar(g);
    this.persist();
    this.enterGame();
  }

  private async newGame(skipConfirm = false) {
    if (!skipConfirm && loadAutosave()) {
      const ok = await dialog('Neues Spiel?', 'Der automatisch gespeicherte Fortschritt in diesem Browser wird überschrieben. Lade ihn vorher herunter, wenn du ihn behalten möchtest.', [
        { label: 'Abbrechen', value: '' },
        { label: 'Neues Spiel starten', value: 'yes', primary: true, danger: true },
      ]);
      if (ok !== 'yes') return;
    }
    stopMenuVoice();
    this.game = createInitialState('Bingo');
    this.viewBoard = '';
    // original: Chapter-1 card -> Next -> playSmacker("Intro", 1) -> AS001-01
    const withVideo = hasSmacker('Intro');
    await this.chapterCard(1, withVideo ? () => playSmacker('Intro') : undefined);
    if (!withVideo) await this.storyCard('Intro', 'Bingo und Puck finden eine Flaschenpost – darin steckt ein Hinweis auf einen verschollenen Schatz! Doch zuerst müssen die beiden aus dem Haus …');
    this.enterGame();
  }

  private startFromSave(save: SaveFile) {
    stopMenuVoice();
    this.game = save.game;
    this.settings = save.session.settings;
    this.applySettings();
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
          this.applySettings();
          if (key === 'effectVolume') sfx.button();
        }, onchange: () => {
          // sample of the voice volume with an original line (if installed)
          if (key === 'voiceVolume' && orig) void playVoice('Interface_Main', 'K1');
        } }));
    const orig = hasOriginals();
    const turbo = h('input', { type: 'checkbox', ...(s.turboJump ? { checked: true } : {}), onchange: (e: Event) => { s.turboJump = (e.target as HTMLInputElement).checked; } });
    const subs = h('input', { type: 'checkbox', ...(s.subtitles ? { checked: true } : {}), onchange: (e: Event) => { s.subtitles = (e.target as HTMLInputElement).checked; this.applySettings(); } });
    await dialog('Einstellungen', h('div', { class: 'settings' },
      row('Effekte', 'effectVolume'),
      row(orig ? 'Sprache' : 'Sprache (nur mit Originaldateien)', 'voiceVolume'),
      row(orig ? 'Musik' : 'Musik (nur mit Originaldateien)', 'musicVolume'),
      h('label', { class: 'setting check' }, subs, ' Untertitel für Sprache'),
      h('label', { class: 'setting check' }, turbo, ' Turbo-Sprung (schnellere Figuren, Taste T)'),
    ), [{ label: 'Fertig', value: 'ok', primary: true }]);
    storeSettings(s);
    if (this.game) this.persist();
  }

  /** Chapter card: original Chapter-n screen when installed (onNext runs before it closes), else a dialog */
  private async chapterCard(n: 1 | 2 | 3, onNext?: () => Promise<void>) {
    if (await chapterScreen(document.body, n, onNext)) return;
    await dialog(`Kapitel ${n}`, h('div', { class: 'chapter' }, h('div', { class: 'chapter-num' }, String(n)), h('p', {}, CHAPTER_TEXT[n])), [
      { label: 'Kapitel starten', value: 'ok', primary: true },
    ]);
    await onNext?.();
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
      this.leaveScene(null);
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
    // an item in the hand is saved where it would return to (the hand itself is not saved)
    let game = this.game;
    if (this.hand && this.handFrom) {
      game = structuredClone(this.game);
      this.applyReturn(game, this.hand, this.handFrom.kind === 'fn' ? { kind: 'pocket' } : this.handFrom);
    }
    const ok = autosave(game, { view: this.mode === 'scene' ? this.g.chars[this.g.currentCharacter].screen : 'board', settings: this.settings });
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
    this.returnHand(false);
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
    if (v === 'main') this.toMainMenu();
  }

  /** save and return to the main menu (also used by scene ports, e.g. after the credits) */
  toMainMenu() {
    this.persist();
    this.game = null;
    this.showMenu();
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
        'data-slot': String(i),
        'aria-label': it === 'OI000' ? `Tasche ${i + 1}: leer` : `Tasche ${i + 1}: ${itemName(it)}`,
        title: it === 'OI000' ? 'leer' : itemName(it),
        onclick: () => this.onSlot(i),
        onpointerdown: (e: Event) => {
          if (it !== 'OI000' && !this.hand) this.startDrag(e as PointerEvent, () => this.onSlot(i));
        },
      }, h('span', { class: 'slot-inner' }, ...(it === 'OI000' ? [] : [fromSVG(itemSVG(it))]))));

    this.hudEl.replaceChildren(
      h('div', { class: 'hud-group switches' }, switchBtn('CH1'), switchBtn('CH2')),
      h('div', { class: 'hud-group pocket', role: 'group', 'aria-label': 'Hosentasche' }, ...slots),
      h('div', { class: 'hud-group piles' },
        h('button', { class: 'pile coins', title: 'Münzen – antippen, um eine Münze in die Hand zu nehmen', 'aria-label': `${g.chars[pc].coins} Münzen`, onclick: () => this.onCoinPile(), onpointerdown: (e: Event) => { if (!this.hand) this.startDrag(e as PointerEvent, () => this.takeCoin()); } },
          fromSVG(itemSVG('OI007')), h('b', {}, String(g.chars[pc].coins))),
        h('button', { class: 'pile jokes', title: 'Witze – antippen, um eine Witzkarte zu ziehen', 'aria-label': `${g.chars[pc].jokes} Witze`, onclick: () => this.onJokePile(), onpointerdown: (e: Event) => { if (!this.hand) this.startDrag(e as PointerEvent, () => this.takeJoke()); } },
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
    this.placeHandEl();
    this.placeHandChip();
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

  /**
   * Inventar im Inventar (pocket slot): without a hand item the slot's item goes into the hand;
   * with one: empty slot -> #stayHere (coins / joke cards are no pocket items), own source slot ->
   * back, occupied slot -> #aboutToReturn (back to its source).
   */
  private onSlot(i: number) {
    const pc = playerChar(this.g);
    const inv = this.g.chars[pc].inventory;
    if (this.hand) {
      const it = this.hand;
      if (inv[i] !== 'OI000' || it === 'OI006' || it === 'OI007') return this.returnHand();
      inv[i] = it;
      this.stayHere();
      return;
    }
    if (inv[i] === 'OI000') return;
    const it = inv[i];
    inv[i] = 'OI000';
    this.setHand(it, { kind: 'slot', index: i, ch: pc });
  }

  /** Münzen: take one into the hand; a coin in the hand goes back onto the pile */
  private onCoinPile() {
    if (this.hand === 'OI007') {
      this.g.chars[playerChar(this.g)].coins++;
      return this.stayHere();
    }
    if (this.hand) return this.returnHand();
    this.takeCoin();
  }

  /** Witze (Witzkarte im Inventar / Drop Jokes): take a card; a card in the hand is added (addJokes(1)) */
  private onJokePile() {
    if (this.hand === 'OI006') {
      this.g.chars[playerChar(this.g)].jokes++;
      return this.stayHere();
    }
    if (this.hand) return this.returnHand();
    this.takeJoke();
  }

  /** clicks of the same gesture that ended a drag are swallowed until then */
  private noClickUntil = 0;

  /**
   * Drag & drop: the press starts a drag once the pointer moved 10 px; `take()` then puts the item
   * into the hand, it follows the pointer (sprite 110) and the release is delivered to the target
   * under it (dropAt). A plain tap is a click (tap item, then tap the target – like the original,
   * where the item stays in the hand until the next click).
   */
  private startDrag(e: PointerEvent, take: (() => void) | null) {
    // take = null: an item already in the hand is carried (press, move, release over the target)
    if (this.busy || e.button !== 0 || (take ? !!this.hand : !this.hand)) return;
    const x0 = e.clientX, y0 = e.clientY, id = e.pointerId;
    let started = false;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      if (!started) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 10) return;
        started = true;
        take?.();
        if (!this.hand) return cleanup();
      }
      ev.preventDefault();
    };
    const up = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      cleanup();
      if (!started || !this.hand) return;
      // the release belongs to the drop only (no stage mouseUp, no click)
      ev.stopPropagation();
      this.noClickUntil = performance.now() + 400;
      this.dropAt(ev);
    };
    const cancel = (ev: PointerEvent) => {
      if (ev.pointerId !== id) return;
      cleanup();
      if (started) this.returnHand();
    };
    const cleanup = () => {
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', cancel, true);
    };
    window.addEventListener('pointermove', move, { capture: true, passive: false });
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', cancel, true);
  }

  /**
   * Deliver the held item to whatever is under the release point (mouseUp there). Nothing took it
   * -> #returnToSource (it flies back).
   */
  private dropAt(ev: PointerEvent) {
    const held = this.hand;
    const seq = this.handSeq;
    if (!held) return;
    const { clientX: x, clientY: y } = ev;
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const slot = el?.closest('button.slot') as HTMLElement | null;
    if (slot) this.onSlot(+slot.dataset.slot!);
    else if (el?.closest('button.pile.coins')) this.onCoinPile();
    else if (el?.closest('button.pile.jokes')) this.onJokePile();
    else if (el?.closest('.hud, .topbar')) this.returnHand();
    else if (this.orig && this.orig.releaseAt(ev)) {
      /* delivered to the original scene */
    } else if (el?.closest('svg.scene [data-idx]')) {
      el.closest('svg.scene [data-idx]')!.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
    } else if (el) {
      // board (points / figures): like a tap there
      const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 1, isPrimary: true, pointerType: 'mouse' };
      el.dispatchEvent(new PointerEvent('pointerdown', opts));
      el.dispatchEvent(new PointerEvent('pointerup', opts));
      el.dispatchEvent(new MouseEvent('click', { ...opts, detail: 1 }));
    }
    // nothing accepted it (ports may react asynchronously): back to where it came from
    setTimeout(() => {
      if (this.hand === held && this.handSeq === seq) this.returnHand();
    }, 0);
  }

  private takeCoin() {
    if (this.hand) return this.returnHand();
    const pc = playerChar(this.g);
    if (this.g.chars[pc].coins < 1) return toast('Keine Münzen mehr.', 'bad');
    this.g.chars[pc].coins--;
    sfx.coin();
    this.setHand('OI007', { kind: 'coin' });
  }

  private takeJoke() {
    if (this.hand) return this.returnHand();
    const pc = playerChar(this.g);
    if (this.g.chars[pc].jokes < 1) return toast('Du hast keine Witze. Lauf über Witzfelder oder besuche den Witzomaten!', 'info', 3500);
    this.g.chars[pc].jokes--;
    sfx.click();
    this.setHand('OI006', { kind: 'joke' });
    if (this.mode === 'board') toast('Lege die Witzkarte auf ein blaues Feld.', 'info');
  }

  /** #inHand: sprite(110).member = item, mySourceSprite = from (a held item goes back first) */
  private setHand(item: string, from: HandFrom) {
    if (this.hand) this.returnHand(false);
    this.hand = item;
    this.handFrom = from;
    this.handSeq++;
    this.renderHud();
  }

  /** put the returned item into a game state (#returnToSource); false = no place for it */
  private applyReturn(g: GameState, item: string, from: HandFrom): boolean {
    const pc = playerChar(g);
    switch (from.kind) {
      case 'slot': {
        const inv = g.chars[from.ch].inventory;
        if (inv[from.index] === 'OI000') inv[from.index] = item;
        else if (!giveItem(g, from.ch, item) && !giveItem(g, pc, item)) return false;
        return true;
      }
      case 'coin':
        g.chars[pc].coins++;
        return true;
      case 'joke':
        g.chars[pc].jokes++;
        return true;
      case 'scene':
        for (const t of [{ screen: from.screen, key: from.key }, ...from.links]) (g.sceneState[t.screen] ??= {})[t.key] = from.value;
        return true;
      case 'fn':
        from.back(item);
        return true;
      case 'pocket':
        if (item === 'OI007') g.chars[pc].coins++;
        else if (item === 'OI006') g.chars[pc].jokes++;
        else return giveItem(g, pc, item);
        return true;
      case 'lost':
        return true;
    }
  }

  /**
   * #aboutToReturn / #returnToSource: the held item goes back to its source (inventarSound), with
   * the original "fly back" from the pointer to the source when `fly`.
   */
  returnHand(fly = true) {
    if (!this.hand || !this.handFrom || !this.game) return;
    const item = this.hand, from = this.handFrom;
    const target = fly ? this.sourceRect(from) : null;
    if (!this.applyReturn(this.g, item, from)) {
      toast('Die Hosentasche ist voll.', 'bad');
      return;
    }
    this.hand = null;
    this.handFrom = null;
    sfx.item(item);
    if (target) this.flyBack(item, target);
    this.afterHandChange();
  }

  /** #stayHere: the held item stays at the target / is used up (inventarSound) */
  private stayHere() {
    const item = this.hand;
    if (!item) return;
    this.hand = null;
    this.handFrom = null;
    sfx.item(item);
    this.afterHandChange();
  }

  /** give the held item to a character (Character Visibility / Character im Schauplatz) */
  giveHandTo(ch: CharId): boolean {
    const g = this.g;
    const item = this.hand;
    if (!item) return false;
    const pc = playerChar(g);
    // coins / joke cards cannot be given away; only to a figure on the same screen
    if (item === 'OI006' || item === 'OI007' || g.chars[ch].screen !== g.chars[pc].screen || !giveItem(g, ch, item)) {
      this.returnHand();
      return false;
    }
    if (ch !== pc) toast(`${itemName(item)} an ${LOOKS[ch].name} gegeben.`, 'info');
    this.stayHere();
    return true;
  }

  private afterHandChange() {
    this.renderHud();
    if (this.mode === 'scene' && !this.orig) {
      const id = this.g.chars[playerChar(this.g)].screen;
      if (getScene(id)) this.renderScene(id);
    }
    this.persist();
  }

  /** scene-bound hand items return to their scene when it is left */
  private leaveScene(next: string | null) {
    const f = this.handFrom;
    if (this.hand && f && (f.kind === 'scene' || f.kind === 'fn') && f.screen !== next) this.returnHand(false);
  }

  /** where the source of the held item is on screen (fly-back target) */
  private sourceRect(from: HandFrom): DOMRect | null {
    const q = (sel: string) => (this.hudEl?.isConnected ? this.hudEl.querySelector(sel)?.getBoundingClientRect() ?? null : null);
    switch (from.kind) {
      case 'slot':
        return q(`button.slot[data-slot="${from.index}"]`);
      case 'coin':
        return q('button.pile.coins');
      case 'joke':
        return q('button.pile.jokes');
      case 'scene': {
        const r = this.orig?.alive && this.orig.id === from.screen ? this.orig.sourceRect(from.key) : null;
        if (r) return r;
        const el = this.stageEl?.querySelector(`svg.scene [data-key="${from.key}"]`);
        return el ? el.getBoundingClientRect() : null;
      }
      case 'pocket':
        return q('.pocket');
      default:
        return null;
    }
  }

  /** the original "fly back": the item glides from the pointer to its source */
  private flyBack(item: string, to: DOMRect) {
    if (this.ptr.x < 0 || !to.width) return;
    const ghost = h('div', { class: 'hand-sprite fly' }, fromSVG(itemSVG(item)));
    ghost.style.left = `${this.ptr.x}px`;
    ghost.style.top = `${this.ptr.y}px`;
    document.body.append(ghost);
    const dx = to.left + to.width / 2 - this.ptr.x, dy = to.top + to.height / 2 - this.ptr.y;
    const dist = Math.hypot(dx, dy);
    if (typeof ghost.animate !== 'function' || dist < 8) return ghost.remove();
    const a = ghost.animate([{ translate: '0 0' }, { translate: `${dx}px ${dy}px` }], { duration: Math.min(450, 120 + dist / 3), easing: 'ease-in' });
    a.onfinish = a.oncancel = () => ghost.remove();
  }

  /** sprite 110 follows the pointer (mouse) / sits above the finger (touch) */
  private placeHandChip() {
    // hand chip in the HUD: fixed just above the HUD (not in the landscape side-column layout)
    const chip = this.hudEl?.querySelector<HTMLElement>(':scope > .hand');
    if (chip && !matchMedia('(orientation: landscape) and (max-height: 520px)').matches) {
      const r = this.hudEl.getBoundingClientRect();
      chip.style.top = `${Math.max(4, r.top - 56)}px`;
      chip.style.left = `${r.left + r.width / 2}px`;
    }
  }

  private placeHandEl() {
    const el = this.handEl;
    const it = this.hand;
    if (!it || !this.game || this.ptr.x < 0) {
      el.classList.remove('show');
      el.dataset.item = '';
      return;
    }
    if (el.dataset.item !== it) {
      el.replaceChildren(fromSVG(itemSVG(it)));
      el.dataset.item = it;
    }
    el.classList.add('show');
    el.classList.toggle('touch', this.ptr.touch);
    el.style.left = `${this.ptr.x}px`;
    el.style.top = `${this.ptr.y}px`;
  }

  // ---------------------------------------------------------------- board

  private renderBoard() {
    this.destroyOrig();
    this.mode = 'board';
    const g = this.g;
    const tgt = this.viewBoard === g.chars[g.currentCharacter].screen ? this.targets : this.targets.filter((t) => t.startsWith(this.viewBoard));
    this.boardView.show(g, this.viewBoard, tgt);
    if (hasOriginals()) void applyMovieAudio(this.viewBoard); // Landscape SPxxx music/ambience
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

  /** Obstacles (BS41): open a blocked gate / close an open one (only on a free point); new targets if rolled. */
  private onObstacle(board: string, n: number) {
    const g = this.g;
    if (this.busy || this.hand) return;
    const st = g.boardState[board]?.[n - 1];
    if (st === undefined) return;
    sfx.obstacle(st !== 'BLK', board); // open gate clicked: Blocker-1, blocked gate: Blocker-2
    if (st !== 'BLK' && st !== '___') return; // occupied point: the original only plays the sound
    toggleBlocker(g, board, n);
    if (g.cubePoints && g.currentCharacter === playerChar(g)) this.targets = currentTargets(g);
    const tgt = this.viewBoard === g.chars[g.currentCharacter].screen ? this.targets : this.targets.filter((t) => t.startsWith(this.viewBoard));
    this.boardView.targets = tgt;
    this.boardView.renderPoints(g);
    this.persist();
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
      let lastDir: number | null = null;
      await this.boardView.animatePath(ch, path, this.stepMs(), (pid, i) => {
        const pt = getPoint(pid);
        // turning before the next jump (Character im Schauplatz: Stone-T/Sand-T/Dirt-T/Grass-T)
        const nx = i + 1 < path.length ? getPoint(path[i + 1]) : null;
        if (pt && nx) {
          const d = Math.abs(nx.x - pt.x) > Math.abs(nx.y - pt.y) ? (nx.x > pt.x ? 2 : 4) : nx.y > pt.y ? 3 : 1;
          if (lastDir !== null && d !== lastDir) sfx.turn(pt.g);
          lastDir = d;
        }
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
      // Character im Schauplatz.mouseUp: give the item if the figure has a free place and stands on
      // the same screen (not coins / joke cards); otherwise it returns to its source
      this.giveHandTo(ch);
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
    if (hasOriginals()) void applyMovieAudio('Exchange');
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
      consumeHand: () => self.stayHere(),
      putInHand: (item, source?: HandSource) => {
        const screen = source && typeof source === 'object' ? source.screen ?? def.id : def.id;
        const from: HandFrom =
          source === undefined || source === 'pocket' ? { kind: 'pocket' }
          : source === 'lost' ? { kind: 'lost' }
          : typeof source === 'function' ? { kind: 'fn', screen: def.id, back: source }
          : { kind: 'scene', screen, key: source.key, value: source.value ?? 'activ', links: source.links ?? [] };
        self.setHand(item, from);
      },
      returnHand: () => self.returnHand(),
      giveHandTo: (ch) => self.giveHandTo(ch),
      give: (item) => {
        const ok = giveItem(g, playerChar(g), item);
        self.scheduleRefresh();
        return ok;
      },
      refresh: () => {
        self.renderHud();
        self.persist();
      },
      jumpToCurrent: () => {
        self.persist();
        self.showCurrent();
      },
      toMainMenu: () => self.toMainMenu(),
      showScene: (id) => {
        self.renderScene(id);
        self.renderTop();
        self.renderHud();
      },
      ch: playerChar(g),
      gotoScene: (id) => {
        g.chars[playerChar(g)].screen = id;
        g.chars[playerChar(g)].position = 0;
        if (!hasOriginals()) sfx.enter();
        self.persist();
        self.renderScene(id);
        self.renderTop();
        self.renderHud();
      },
      gotoBoard: (board, pos, dir) => {
        const id = pointId(board, pos);
        if (!checkPointFree(g, id)) {
          // Hotspot-SP: field occupied -> playerTalk(random(101,103)) (Shared/Audio-2)
          if (hasOriginals()) {
            const pc = g.playerCharacter === 'Puck' ? 'Puck' : 'Bingo';
            void talk(`Shared_Audio-2/${pc}Talk-${101 + Math.floor(Math.random() * 3)}`, { movie: '', speaker: pc, host: self.orig?.el ?? null });
          } else self.say('Da steht schon jemand. Ich warte lieber.');
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
      addCoins: (n) => {
        g.chars[playerChar(g)].coins += n;
        self.scheduleRefresh();
      },
      addJokes: (n) => {
        g.chars[playerChar(g)].jokes += n;
        self.scheduleRefresh();
      },
    };
  }

  private refreshQueued = false;
  /** showInventar() after scene logic changed coins / jokes / pocket (batched per task) */
  private scheduleRefresh() {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    queueMicrotask(() => {
      this.refreshQueued = false;
      if (!this.game || !this.hudEl?.isConnected) return;
      this.renderHud();
      this.persist();
    });
  }

  say(text: string) {
    toast(`${LOOKS[playerChar(this.g)].name}: „${text}“`, 'info', 3200);
  }

  /** default click / drop handling of an engine object, then re-render (shared by SVG + original view) */
  private activateObject(def: SceneDef, ctx: SceneCtx, o: SceneObject) {
    if (this.busy) return;
    if (this.hand) {
      const item = this.hand;
      const seq = this.handSeq;
      const accepted = defaultUse(ctx, def, o, item);
      const same = this.hand === item && this.handSeq === seq;
      // accepted = #stayHere (inventarSound), otherwise #aboutToReturn
      if (same) accepted ? this.stayHere() : this.returnHand();
    } else {
      defaultClick(ctx, def, o);
      if (!hasOriginals() && !this.hand) sfx.click();
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
    this.leaveScene(id);
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
      // scenes with a registered original port count as ported
      const note = def.reconstructed || hasOrigPort(id) ? null : h('div', { class: 'scene-note' }, '[Prüfung erforderlich] ', def.note ?? 'Diese Szene ist noch nicht vollständig rekonstruiert.');
      const wrap = h('div', { class: 'scene-wrap orig' }, note);
      // a press on something that goes into the hand (item, box place, filled slot) can be dragged
      wrap.addEventListener('pointerdown', (e) => {
        const sc = this.orig;
        if (this.hand || !sc || sc.el.parentElement !== wrap || !sc.pickableAt(e.clientX, e.clientY)) return;
        this.startDrag(e, () => sc.clickAt(e));
      }, true);
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
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 800 448');
    svg.setAttribute('class', 'scene');
    let markup = def.backdrop(ctx);
    def.objects.forEach((o, idx) => {
      if (!isVisible(ctx, def, o)) {
        // passiv item place: invisible, but the held item can be put back there
        if (this.hand && isDropSpot(ctx, def, o)) {
          markup += `<g class="obj obj-spot hot" data-key="${o.key}" data-idx="${idx}"><rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="10" class="hit spot"/><title>${escapeAttr(o.label)}</title></g>`;
        }
        return;
      }
      const st = objState(ctx, o);
      const art = o.draw ? o.draw(ctx, st) : defaultObjectArt(o, st);
      const interactive = o.kind !== 'deco' || !!o.onClick;
      const pick = o.kind === 'item' && st === 'activ';
      markup += `<g class="obj obj-${o.kind}${interactive ? ' hot' : ''}" data-key="${o.key}" data-idx="${idx}"${pick ? ' data-pick="1"' : ''} ${interactive ? `role="button" tabindex="0" aria-label="${escapeAttr(o.label)}"` : ''}>${art}${interactive ? `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="10" class="hit"/>` : ''}<title>${escapeAttr(o.label)}</title></g>`;
    });
    if (def.overlay) markup += `<g class="scene-overlay" pointer-events="none">${def.overlay(ctx)}</g>`;
    svg.innerHTML = markup;
    const objOf = (el: Element | null) => {
      const g = el?.closest('[data-idx]') as SVGGElement | null;
      return g ? def.objects[+g.dataset.idx!] : undefined;
    };
    const activate = (el: Element | null) => {
      const o = objOf(el);
      if (!o || this.busy) return;
      this.activateObject(def, ctx, o);
    };
    svg.addEventListener('pointerdown', (e) => {
      const g = (e.target as Element).closest('[data-pick]');
      if (g && !this.hand) this.startDrag(e, () => activate(g));
    });
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


