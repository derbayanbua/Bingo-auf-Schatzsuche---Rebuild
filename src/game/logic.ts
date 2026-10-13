// Board-game rules, ported from the original Lingo (shared cast "Lingo.cxt"):
//   MovieScript 35 "Pfadsuche"   -> searchTrack, searchTargets, searchRandomTargets, checkPointFree/Typ
//   MovieScript 2  "Character"   -> nextCharacter, inventory/coins/jokes/mood, contact, steal/sell
//   MovieScript 83 "Autopilot Rocco" -> pirate AI (CH9)
//   BehaviorScript 33 "Character im Schauplatz" -> walking, joke fields, entering scenes
//   BehaviorScript 36 "Shaker"   -> dice: random(2, 12)
// Ported quirks are kept on purpose and marked "original:".

import { BOARDS, getPoint, pointId, splitPoint } from './data';
import type { Rng } from './rng';
import type { CharId, GameEvent, GameState, MoveResult } from './types';

const EMPTY_ITEM = 'OI000';
type SlotIdx = 0 | 1 | 2;

export function isBoard(screen: string): boolean {
  return /^SP\d{3}$/.test(screen);
}

/** getCharacterLocation: "SPxxx-nn" (also for scenes, where it never matches a board point). */
export function location(s: GameState, ch: CharId): string {
  const c = s.chars[ch];
  return `${c.screen}-${c.position < 10 ? '0' + c.position : c.position}`;
}

/** Item 9 of a board point at runtime: ___ / JOK / BLK / CHn (occupancy, like updateSP()). */
export function pointState(s: GameState, id: string): string | undefined {
  const [b, n] = splitPoint(id);
  const st = s.boardState[b]?.[n - 1];
  if (st === undefined) return undefined;
  for (const [ch, c] of Object.entries(s.chars)) {
    if (c.screen === b && c.position === n) return ch;
  }
  return st;
}

export function checkPointFree(s: GameState, id: string): boolean {
  const st = pointState(s, id);
  return st === '___' || st === 'JOK';
}

export type PointType = 'adventure' | 'game' | 'standard';
export function checkPointTyp(id: string): PointType {
  const t = getPoint(id)?.t;
  if (t?.startsWith('AS')) return 'adventure';
  if (t?.startsWith('GS')) return 'game';
  return 'standard';
}

/**
 * Board field changes at runtime: scenes may rewrite items of a board field line, e.g. AS038-01
 * (Hängebrücke) `member("SP038").line[15].item[4] = "SP038-14"` and the blasting
 * `member("SP038").line[18].item[10] = "AS045-02"`. They are stored in the save as
 * `sceneState["SPxxx"]["L<line>I<item>"] = value` (item 4..7 = up/right/down/left, 10 = target;
 * "________" / "" = no neighbour). Missing keys = the static board data.
 */
export function boardItemKey(line: number, item: number): string {
  return `L${line}I${item}`;
}

/** value of a runtime board item override, undefined = static data */
function boardOverride(s: GameState, id: string, item: number): string | undefined {
  const [b, n] = splitPoint(id);
  return s.sceneState[b]?.[boardItemKey(n, item)];
}

const isPointRef = (v: string) => /^SP\d{3}-\d{2}$/.test(v);

/** neighbours [up, right, down, left] of a point incl. runtime overrides (AS038-01 bridge) */
export function pointNeighbours(s: GameState, id: string): (string | null)[] {
  const nb = [...(getPoint(id)?.nb ?? [null, null, null, null])];
  for (let d = 0; d < 4; d++) {
    const v = boardOverride(s, id, 4 + d);
    if (v !== undefined) nb[d] = isPointRef(v) ? v : null;
  }
  return nb;
}

/** target scene (item 10) of a point incl. runtime overrides (AS038-01: SP038-18 -> AS045-02) */
export function pointTarget(s: GameState, id: string): string | null {
  const v = boardOverride(s, id, 10);
  if (v !== undefined) return /^(AS|GS)\d{3}-\d{2}$/.test(v) ? v : null;
  return getPoint(id)?.t ?? null;
}

const neighbours = (s: GameState, id: string) => pointNeighbours(s, id);

/**
 * searchTargets: every point reachable with 1..distance steps (no immediate reversal,
 * no occupied/blocked points). The start point itself is part of the list, as in the original.
 */
export function searchTargets(s: GameState, ch: CharId, distance: number, allowed: 'all' | 'standard'): string[] {
  const start = location(s, ch);
  const targets: string[] = [start];
  const walk = (track: string[]) => {
    if (track.length > distance) return; // original: a point pushed at depth == distance gets direction 5
    const cur = track[track.length - 1];
    const prev = track[track.length - 2];
    for (const nxt of neighbours(s, cur)) {
      if (!nxt || nxt === prev || !checkPointFree(s, nxt)) continue;
      if (allowed === 'all' || checkPointTyp(nxt) === 'standard') targets.push(nxt);
      walk([...track, nxt]);
    }
  };
  walk([start]);
  return Array.from(new Set(targets));
}

/**
 * searchTrack: depth-first search (direction order up, right, down, left) for a path of at most
 * numberOfMoves steps. Occupied points may only be the target. Returns [start] if none found.
 */
export function searchTrack(s: GameState, ch: CharId, target: string, numberOfMoves: number): string[] {
  const start = location(s, ch);
  if (start === target) return [start];
  const track = [start];
  const dfs = (): boolean => {
    if (track.length > numberOfMoves) return false;
    const cur = track[track.length - 1];
    for (const nxt of neighbours(s, cur)) {
      if (!nxt || track.includes(nxt)) continue;
      if (!checkPointFree(s, nxt) && nxt !== target) continue;
      track.push(nxt);
      if (nxt === target || dfs()) return true;
      track.pop();
    }
    return false;
  };
  return dfs() ? track : [start];
}

/** searchRandomTargets: NPC wandering; prefers turning right, straight, left, then back. */
export function searchRandomTargets(s: GameState, ch: CharId, distance: number, events: GameEvent[]): string[] {
  const track = [location(s, ch)];
  // original: uses the direction of the *current* character, which is the walking NPC itself.
  let oldDir = s.chars[s.currentCharacter].direction || 1;
  const wrap = (d: number) => ((d - 1 + 4) % 4) + 1;
  for (;;) {
    const cur = track[track.length - 1];
    const nb = neighbours(s, cur);
    const possible: number[] = [];
    for (let d = 1; d <= 4; d++) {
      const nxt = nb[d - 1];
      if (!nxt) continue;
      if (track.length !== 1 && nxt === track[track.length - 2]) continue;
      if (!checkPointFree(s, nxt)) continue;
      possible.push(d);
    }
    if (possible.length === 0 || track.length === distance + 1) break;
    const tryDir = (d: number, needStandard: boolean): boolean => {
      if (!possible.includes(d)) return false;
      const nxt = nb[d - 1]!;
      if (needStandard && checkPointTyp(nxt) !== 'standard') return false;
      oldDir = d;
      track.push(nxt);
      return true;
    };
    if (tryDir(wrap(oldDir + 1), true)) continue;
    if (tryDir(oldDir, true)) continue;
    if (tryDir(wrap(oldDir - 1), true)) continue;
    if (tryDir(wrap(oldDir + 2), true)) {
      subMood(s, ch, 5);
      events.push({ type: 'moodDown', ch });
      continue;
    }
    if (tryDir(wrap(oldDir + 1), false)) continue;
    if (tryDir(wrap(oldDir - 1), false)) continue;
    if (tryDir(oldDir, false)) continue;
    if (tryDir(wrap(oldDir + 2), false)) continue;
    break;
  }
  // original: tries to drop a non-standard end point but deletes from the wrong variable (no effect).
  return track;
}

// ---------------------------------------------------------------- character data helpers

export function addMood(s: GameState, ch: CharId, n: number) {
  s.chars[ch].mood = Math.min(90, s.chars[ch].mood + n);
}
export function subMood(s: GameState, ch: CharId, n: number) {
  s.chars[ch].mood = Math.max(1, s.chars[ch].mood - n);
}

export function inventarCharacter(s: GameState): CharId {
  return s.playerCharacter === 'Bingo' ? 'CH1' : 'CH2';
}

export function checkFreeInventar(s: GameState, ch: CharId): boolean {
  return s.chars[ch].inventory.includes(EMPTY_ITEM);
}
export function checkOneInventar(s: GameState, ch: CharId): boolean {
  return s.chars[ch].inventory.some((i) => i !== EMPTY_ITEM);
}
export function getFreeInventar(s: GameState, ch: CharId): SlotIdx | -1 {
  return s.chars[ch].inventory.indexOf(EMPTY_ITEM) as SlotIdx | -1;
}
export function giveItem(s: GameState, ch: CharId, item: string): boolean {
  const slot = getFreeInventar(s, ch);
  if (slot === -1) return false;
  s.chars[ch].inventory[slot as SlotIdx] = item;
  return true;
}

/** characterContact: character2 stands on a direct neighbour point of character1. */
export function characterContact(s: GameState, c1: CharId, c2: CharId): boolean {
  if (!isBoard(s.chars[c1].screen)) return false;
  const loc2 = location(s, c2);
  return neighbours(s, location(s, c1)).includes(loc2);
}

/** locationNearAnyCharacter: first NPC (CH3..CH8) standing next to the given point. */
export function locationNearAnyCharacter(s: GameState, loc: string): CharId | 'CH0' {
  for (let p = 3; p <= 8; p++) {
    const c2 = ('CH' + p) as CharId;
    if (neighbours(s, loc).includes(location(s, c2))) return c2;
  }
  return 'CH0';
}

export function stealInventar(s: GameState, victim: CharId, rng: Rng, events: GameEvent[]): boolean {
  const slots = [0, 1, 2].filter((i) => s.chars[victim].inventory[i] !== EMPTY_ITEM);
  if (slots.length === 0) return false;
  const slot = slots[rng.int(slots.length) - 1];
  const item = s.chars[victim].inventory[slot];
  s.chars[victim].inventory[slot] = EMPTY_ITEM;
  s.chars.CH9.inventory[0] = item;
  events.push({ type: 'steal', from: victim, item });
  return true;
}

export function sellInventar(s: GameState, client: CharId, events: GameEvent[]) {
  const item = s.chars.CH9.inventory[0];
  s.chars.CH9.inventory[0] = EMPTY_ITEM;
  giveItem(s, client, item);
  events.push({ type: 'sell', to: client, item });
}

// ---------------------------------------------------------------- turn flow

/** Player character currently controlled (CH1 Bingo / CH2 Puck). */
export function playerChar(s: GameState): CharId {
  return s.playerCharacter === 'Bingo' ? 'CH1' : 'CH2';
}

/** nextCharacter: CH1/CH2 -> CH3 -> ... -> CH9 -> player. Returns true when the round wrapped. */
export function nextCharacter(s: GameState): boolean {
  const n = parseInt(s.currentCharacter.slice(2), 10);
  if (n === 1 || n === 2) {
    s.currentCharacter = 'CH3';
    return false;
  }
  if (n + 1 === 10) {
    s.currentCharacter = playerChar(s);
    s.round++;
    return true;
  }
  s.currentCharacter = ('CH' + (n + 1)) as CharId;
  return false;
}

/** Shaker: roll two dice (2..12) and return the selectable target points. */
export function rollDice(s: GameState, rng: Rng): string[] {
  s.cubePoints = rng.range(2, 12);
  return searchTargets(s, s.currentCharacter, s.cubePoints, 'all');
}

/** Target points for the current dice value (used to restore highlighting after loading). */
export function currentTargets(s: GameState): string[] {
  if (!s.cubePoints) return [];
  return searchTargets(s, s.currentCharacter, s.cubePoints, 'all');
}

/**
 * Walk a character along a track (Character im Schauplatz: nextTrackPoint / checkTargetReached).
 * Joke points on the way are collected; players landing on an AS/GS point enter that scene.
 */
export function applyWalk(s: GameState, ch: CharId, path: string[], events: GameEvent[]) {
  const c = s.chars[ch];
  let dir = c.direction;
  for (let i = 0; i < path.length; i++) {
    const id = path[i];
    const [b, n] = splitPoint(id);
    if (s.boardState[b]?.[n - 1] === 'JOK') {
      s.boardState[b][n - 1] = '___';
      if (ch === 'CH1' || ch === 'CH2') c.jokes += 1;
      else if (ch !== 'CH9') addMood(s, ch, 40);
      events.push({ type: 'joke', ch, point: id });
    }
    if (i + 1 < path.length) {
      const d = neighbours(s, id).indexOf(path[i + 1]);
      if (d >= 0) dir = d + 1;
    }
  }
  const last = path[path.length - 1];
  const [b, n] = splitPoint(last);
  const target = pointTarget(s, last);
  if ((ch === 'CH1' || ch === 'CH2') && target && path.length > 1) {
    s.lastBoardPoint[ch] = last;
    c.screen = target;
    c.position = 0;
    c.direction = 0;
    events.push({ type: 'enterScene', ch, scene: target });
    return;
  }
  c.screen = b;
  c.position = n;
  c.direction = dir;
}

/** Player clicks a highlighted target point. */
export function playerMoveTo(s: GameState, target: string): MoveResult {
  const ch = s.currentCharacter;
  const path = searchTrack(s, ch, target, s.cubePoints);
  s.cubePoints = 0;
  const events: GameEvent[] = [];
  applyWalk(s, ch, path, events);
  return { ch, path, events };
}

/** One NPC turn (autoPilotCharacter3..9). Returns the walked path and events. */
export function npcTurn(s: GameState, ch: CharId, rng: Rng): MoveResult {
  const events: GameEvent[] = [];
  const c = s.chars[ch];
  const none: MoveResult = { ch, path: [], events };
  if (c.mode === 'stopped' || !isBoard(c.screen) || c.position < 1) return none;
  let path: string[] | null = null;

  if (ch !== 'CH9') {
    if (c.mode === 'random') path = searchRandomTargets(s, ch, rng.range(2, 6), events);
  } else {
    path = roccoPlan(s, rng, events);
  }
  if (path && path.length) {
    applyWalk(s, ch, path, events);
    if (ch === 'CH9') roccoAfterMove(s, rng, events);
  }
  return { ch, path: path ?? [], events };
}

const trackLen = (s: GameState, target: string) => searchTrack(s, 'CH9', target, 6);

function roccoPlan(s: GameState, rng: Rng, events: GameEvent[]): string[] | null {
  const r = s.chars.CH9;
  let track: string[] | null = null;
  if (r.mode === 'random') {
    if (r.inventory[0] === EMPTY_ITEM) {
      if (r.mood === 1) {
        let dB = trackLen(s, location(s, 'CH1')).length;
        let dP = trackLen(s, location(s, 'CH2')).length;
        if (!checkOneInventar(s, 'CH1')) dB = 1;
        if (!checkOneInventar(s, 'CH2')) dP = 1;
        if (dB > 1 && dP > 1) r.mode = 'hunt';
        if (dB !== 1) {
          r.mode = 'hunt';
          return null;
        }
        if (dP !== 1) {
          r.mode = 'hunt';
          return null;
        }
      }
    } else {
      r.mode = 'deliver';
    }
    track = searchRandomTargets(s, 'CH9', rng.range(2, 6), events);
  }
  if (r.mode === 'deliver') {
    if (r.inventory[0] === EMPTY_ITEM) {
      r.mode = 'random';
      return track;
    }
    const targets = searchTargets(s, 'CH9', 6, 'standard');
    let test: CharId | 'CH0' = 'CH0';
    let i = 0;
    for (; i < targets.length; i++) {
      test = locationNearAnyCharacter(s, targets[i]);
      if (test !== 'CH0' && checkFreeInventar(s, test)) break;
    }
    if (test === 'CH0') {
      track = searchRandomTargets(s, 'CH9', rng.int(6), events);
    } else {
      r.referenceCharacter = test;
      // original: if no NPC had a free slot, i points past the list and the search fails (no move).
      track = i < targets.length ? searchTrack(s, 'CH9', targets[i], 6) : [location(s, 'CH9')];
    }
    return track;
  }
  if (r.mode === 'hunt') {
    roccoTrySteal(s, rng, events);
    let targetLocation = location(s, 'CH1');
    let t = trackLen(s, targetLocation);
    const dB0 = t.length;
    targetLocation = location(s, 'CH2');
    t = trackLen(s, targetLocation);
    const dP = t.length;
    let dB = dB0;
    if (dP === 1 && dB !== 1) {
      targetLocation = location(s, 'CH1');
      t = trackLen(s, targetLocation);
      dB = t.length;
    }
    if (dB === 1 && dP === 1) {
      r.mode = 'random';
      return null;
    }
    if (dB !== 1 && dP !== 1 && dB < dP) {
      targetLocation = location(s, 'CH1');
      t = trackLen(s, targetLocation);
    }
    if (t[t.length - 1] !== targetLocation) return null;
    t = t.slice(0, t.length - 1).slice(0, rng.range(2, 6));
    if (t.length > 1 && checkPointTyp(t[t.length - 1]) !== 'standard') t.pop();
    return t;
  }
  return track;
}

function roccoTrySteal(s: GameState, rng: Rng, events: GameEvent[]) {
  const r = s.chars.CH9;
  if (characterContact(s, 'CH9', 'CH1') && stealInventar(s, 'CH1', rng, events)) r.mode = 'deliver';
  if (characterContact(s, 'CH9', 'CH2') && stealInventar(s, 'CH2', rng, events)) r.mode = 'deliver';
}

function roccoAfterMove(s: GameState, rng: Rng, events: GameEvent[]) {
  const r = s.chars.CH9;
  if (r.mode === 'deliver') {
    const ref = r.referenceCharacter as CharId;
    if (/^CH[3-8]$/.test(ref) && characterContact(s, 'CH9', ref) && checkFreeInventar(s, ref)) {
      sellInventar(s, ref, events);
      r.mode = 'random';
    }
  } else if (r.mode === 'hunt') {
    roccoTrySteal(s, rng, events);
  }
}

/** Obstacles behaviour: toggle a blocker gate on a board point (BLK <-> ___). */
export function toggleBlocker(s: GameState, board: string, n: number): string {
  const st = s.boardState[board];
  if (!st) return '___';
  if (st[n - 1] === 'BLK') st[n - 1] = '___';
  else if (st[n - 1] === '___' && checkPointFree(s, pointId(board, n))) st[n - 1] = 'BLK';
  return st[n - 1];
}

/** Spielfeldpunkt.mouseUp with joke card OI006 in hand: turn a free blue point into a joke point. */
export function placeJokeCard(s: GameState, id: string): boolean {
  const [b, n] = splitPoint(id);
  if (checkPointTyp(id) !== 'standard') return false;
  if (s.boardState[b]?.[n - 1] !== '___') return false;
  s.boardState[b][n - 1] = 'JOK';
  return true;
}

export { BOARDS };
