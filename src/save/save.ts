// Portable save format. Everything happens client-side: autosave to localStorage, export as a
// JSON download, import via <input type=file> (works on Android/iOS file pickers).

import { BOARDS, createInitialState } from '../game/data';
import { ALL_CHARS, type CharId, type CharInfo, type CharMode, type GameState } from '../game/types';

export const SAVE_FORMAT = 'bingo-schatzsuche-save';
export const SAVE_VERSION = 1;
export const SAVE_FILENAME = 'bingo-schatzsuche-spielstand.json';
const LS_KEY = 'bingo-schatzsuche.autosave.v1';

/** UI-level state saved together with the game state. */
export interface SessionState {
  /** screen shown when saving: 'board' or a scene id */
  view: string;
  settings: Settings;
}

export interface Settings {
  voiceVolume: number;
  effectVolume: number;
  musicVolume: number;
  turboJump: boolean;
  /** subtitles for voice lines (original voices only); default on */
  subtitles: boolean;
}

export const DEFAULT_SETTINGS: Settings = { voiceVolume: 150, effectVolume: 150, musicVolume: 150, turboJump: false, subtitles: true };

const SETTINGS_KEY = 'bingo-schatzsuche.settings';

/** settings stored outside a game (main menu) */
export function loadSettings(): Settings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? validateSettings(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function storeSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export interface SaveFile {
  format: typeof SAVE_FORMAT;
  version: number;
  savedAt: string;
  game: GameState;
  session: SessionState;
}

export class SaveError extends Error {}

export function serialize(game: GameState, session: SessionState): SaveFile {
  return {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    game: JSON.parse(JSON.stringify(game)),
    session: JSON.parse(JSON.stringify(session)),
  };
}

// ------------------------------------------------------------------ validation

const MODES: CharMode[] = ['player', 'stopped', 'random', 'hunt', 'deliver'];
const ITEM_RE = /^OI\d{3}$/;
const SCREEN_RE = /^(|SP\d{3}|AS\d{3}-\d{2}|GS\d{3}-\d{2})$/;
const SCENE_RE = /^(AS|GS)\d{3}-\d{2}$/;

function fail(msg: string): never {
  throw new SaveError(msg);
}
function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function int(v: unknown, min: number, max: number, what: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) fail(`Ungültiger Wert: ${what}`);
  return v;
}
function str(v: unknown, re: RegExp, what: string, maxLen = 64): string {
  if (typeof v !== 'string' || v.length > maxLen || !re.test(v)) fail(`Ungültiger Wert: ${what}`);
  return v;
}

function validateChar(v: unknown, id: string): CharInfo {
  if (!isObj(v)) fail(`Figur ${id} fehlt`);
  const inv = v.inventory;
  if (!Array.isArray(inv) || inv.length !== 3) fail(`Inventar von ${id} ungültig`);
  return {
    screen: str(v.screen, SCREEN_RE, `${id}.screen`),
    position: int(v.position, 0, 99, `${id}.position`),
    direction: int(v.direction, 0, 4, `${id}.direction`),
    mode: MODES.includes(v.mode as CharMode) ? (v.mode as CharMode) : fail(`${id}.mode`),
    referenceCharacter: str(v.referenceCharacter, /^(none|CH\d)$/, `${id}.referenceCharacter`),
    targetPosition: str(v.targetPosition, /^(none|SP\d{3}-\d{2})$/, `${id}.targetPosition`),
    inventory: inv.map((x, i) => str(x, ITEM_RE, `${id}.inventory[${i}]`)) as [string, string, string],
    coins: int(v.coins, 0, 99999, `${id}.coins`),
    jokes: int(v.jokes, 0, 9999, `${id}.jokes`),
    mood: int(v.mood, 1, 90, `${id}.mood`),
  };
}

function validateGame(v: unknown): GameState {
  if (!isObj(v)) fail('Spielzustand fehlt');
  if (v.playerCharacter !== 'Bingo' && v.playerCharacter !== 'Puck') fail('Ungültige Spielfigur');
  if (!isObj(v.chars)) fail('Figuren fehlen');
  const chars = {} as Record<CharId, CharInfo>;
  for (const id of ALL_CHARS) chars[id] = validateChar((v.chars as Record<string, unknown>)[id], id);
  if (!ALL_CHARS.includes(v.currentCharacter as CharId)) fail('Ungültige aktuelle Figur');

  if (!isObj(v.boardState)) fail('Spielfelder fehlen');
  const boardState: Record<string, string[]> = {};
  for (const [b, pts] of Object.entries(BOARDS)) {
    const arr = (v.boardState as Record<string, unknown>)[b];
    if (!Array.isArray(arr) || arr.length !== pts.length) fail(`Spielfeld ${b} ungültig`);
    boardState[b] = arr.map((x) => str(x, /^(___|JOK|BLK)$/, `Feld ${b}`));
  }

  if (!isObj(v.sceneState)) fail('Szenenzustand fehlt');
  const sceneState: Record<string, Record<string, string>> = {};
  const scenes = Object.entries(v.sceneState);
  if (scenes.length > 500) fail('Zu viele Szenen');
  for (const [k, kv] of scenes) {
    str(k, SCENE_RE, 'Szenenname');
    if (!isObj(kv)) fail(`Szene ${k} ungültig`);
    const entries = Object.entries(kv);
    if (entries.length > 200) fail(`Szene ${k} zu groß`);
    sceneState[k] = {};
    for (const [a, b] of entries) sceneState[k][str(a, /^[\w-]{1,32}$/, `Schlüssel ${k}`)] = str(b, /^[\w-]{0,32}$/, `Wert ${k}.${a}`);
  }

  const last: GameState['lastBoardPoint'] = {};
  if (v.lastBoardPoint !== undefined) {
    if (!isObj(v.lastBoardPoint)) fail('lastBoardPoint ungültig');
    for (const [k, p] of Object.entries(v.lastBoardPoint)) {
      if (!ALL_CHARS.includes(k as CharId)) fail('lastBoardPoint ungültig');
      last[k as CharId] = str(p, /^SP\d{3}-\d{2}$/, 'lastBoardPoint');
    }
  }

  return {
    playerCharacter: v.playerCharacter,
    currentCharacter: v.currentCharacter as CharId,
    chars,
    boardState,
    sceneState,
    cubePoints: int(v.cubePoints, 0, 12, 'Würfelwert'),
    rng: int(v.rng, -2147483648, 4294967295, 'Zufallszustand') | 0,
    round: int(v.round, 0, 1e9, 'Runde'),
    lastBoardPoint: last,
  };
}

function validateSettings(v: unknown): Settings {
  if (!isObj(v)) return { ...DEFAULT_SETTINGS };
  const vol = (x: unknown, d: number) => (typeof x === 'number' && x >= 0 && x <= 255 ? Math.round(x) : d);
  return {
    voiceVolume: vol(v.voiceVolume, DEFAULT_SETTINGS.voiceVolume),
    effectVolume: vol(v.effectVolume, DEFAULT_SETTINGS.effectVolume),
    musicVolume: vol(v.musicVolume, DEFAULT_SETTINGS.musicVolume),
    turboJump: v.turboJump === true,
    subtitles: v.subtitles !== false,
  };
}

/** Upgrade older save versions to the current one. Add a case per future version bump. */
function migrate(file: Record<string, unknown>): Record<string, unknown> {
  let version = file.version as number;
  // version 1 is current; future: if (version === 1) { ...; version = 2; }
  if (version > SAVE_VERSION) fail('Dieser Spielstand stammt aus einer neueren Spielversion.');
  return { ...file, version };
}

/** Parse + validate an untrusted save (string or object). Throws SaveError with a German message. */
export function parseSave(input: string | unknown): SaveFile {
  let obj: unknown = input;
  if (typeof input === 'string') {
    if (input.length > 2_000_000) fail('Die Datei ist zu groß für einen Spielstand.');
    try {
      obj = JSON.parse(input);
    } catch {
      fail('Die Datei ist keine gültige JSON-Datei.');
    }
  }
  if (!isObj(obj) || obj.format !== SAVE_FORMAT) fail('Die Datei ist kein Spielstand von „Bingo auf Schatzsuche“.');
  if (typeof obj.version !== 'number' || !Number.isInteger(obj.version) || obj.version < 1) fail('Unbekannte Spielstand-Version.');
  const m = migrate(obj);
  const game = validateGame(m.game);
  const sess = isObj(m.session) ? m.session : {};
  const view = typeof sess.view === 'string' && (sess.view === 'board' || SCENE_RE.test(sess.view)) ? sess.view : 'board';
  return {
    format: SAVE_FORMAT,
    version: SAVE_VERSION,
    savedAt: typeof m.savedAt === 'string' ? m.savedAt.slice(0, 40) : '',
    game,
    session: { view, settings: validateSettings(sess.settings) },
  };
}

// ------------------------------------------------------------------ local autosave

export function autosave(game: GameState, session: SessionState): boolean {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(serialize(game, session)));
    return true;
  } catch {
    return false;
  }
}

export function loadAutosave(): SaveFile | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? parseSave(raw) : null;
  } catch {
    return null;
  }
}

export function clearAutosave() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* storage unavailable */
  }
}

// ------------------------------------------------------------------ download / upload

export function downloadSave(game: GameState, session: SessionState) {
  const blob = new Blob([JSON.stringify(serialize(game, session), null, 1)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = SAVE_FILENAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function readSaveFile(file: File): Promise<SaveFile> {
  if (file.size > 2_000_000) return Promise.reject(new SaveError('Die Datei ist zu groß für einen Spielstand.'));
  return file.text().then(parseSave);
}

export { createInitialState };
