import { describe, expect, it } from 'vitest';
import { createInitialState, BOARDS } from '../src/game/data';
import {
  applyWalk, checkPointFree, location, nextCharacter, npcTurn, playerMoveTo, rollDice,
  searchTargets, searchTrack, stealInventar,
} from '../src/game/logic';
import { makeRng } from '../src/game/rng';
import type { GameEvent } from '../src/game/types';

function onBoard(seed = 1) {
  const s = createInitialState('Bingo', seed);
  s.chars.CH1.screen = 'SP001';
  s.chars.CH1.position = 7;
  s.chars.CH1.direction = 2;
  return s;
}

describe('board data', () => {
  it('contains the 33 landscape boards plus stubs, with consistent links', () => {
    expect(Object.keys(BOARDS).length).toBe(37);
    for (const [b, pts] of Object.entries(BOARDS)) {
      pts.forEach((p, i) => {
        expect(p.n).toBe(i + 1);
        for (const nb of p.nb) if (nb) expect(BOARDS[nb.split('-')[0]], `${b} -> ${nb}`).toBeTruthy();
      });
    }
  });
});

describe('path search (Pfadsuche)', () => {
  it('targets are all points within N steps, including the start', () => {
    const s = onBoard();
    const t1 = searchTargets(s, 'CH1', 1, 'all');
    expect(t1.sort()).toEqual(['SP001-01', 'SP001-06', 'SP001-07', 'SP001-08'].sort());
    const t2 = searchTargets(s, 'CH1', 2, 'all');
    expect(t2).toContain('SP001-05');
    expect(t2).toContain('SP008-12'); // crosses to the neighbouring board
  });

  it('occupied and blocked points are not walkable', () => {
    const s = onBoard();
    s.chars.CH4.screen = 'SP001';
    s.chars.CH4.position = 8;
    expect(checkPointFree(s, 'SP001-08')).toBe(false);
    expect(searchTargets(s, 'CH1', 3, 'all')).not.toContain('SP001-09');
    s.boardState.SP001[5] = 'BLK';
    expect(searchTargets(s, 'CH1', 1, 'all')).not.toContain('SP001-06');
  });

  it('searchTrack finds a path within the move limit', () => {
    const s = onBoard();
    const p = searchTrack(s, 'CH1', 'SP001-13', 3);
    expect(p).toEqual(['SP001-07', 'SP001-06', 'SP001-05', 'SP001-13']);
    expect(searchTrack(s, 'CH1', 'SP001-13', 2)).toEqual(['SP001-07']);
  });
});

describe('turns', () => {
  it('dice are 2..12 and landing on an adventure point enters the scene', () => {
    const s = onBoard(42);
    const rng = makeRng(s);
    for (let i = 0; i < 200; i++) {
      rollDice(s, rng);
      expect(s.cubePoints).toBeGreaterThanOrEqual(2);
      expect(s.cubePoints).toBeLessThanOrEqual(12);
    }
    s.cubePoints = 3;
    const r = playerMoveTo(s, 'SP001-13');
    expect(r.events).toContainEqual({ type: 'enterScene', ch: 'CH1', scene: 'AS001-02' });
    expect(s.chars.CH1.screen).toBe('AS001-02');
    expect(s.cubePoints).toBe(0);
  });

  it('joke points give the player a joke and turn blue again', () => {
    const s = onBoard();
    s.boardState.SP001[7] = 'JOK';
    const ev: GameEvent[] = [];
    applyWalk(s, 'CH1', ['SP001-07', 'SP001-08', 'SP001-09'], ev);
    expect(s.chars.CH1.jokes).toBe(1);
    expect(s.boardState.SP001[7]).toBe('___');
    expect(location(s, 'CH1')).toBe('SP001-09');
  });

  it('turn order: player -> CH3..CH9 -> player', () => {
    const s = onBoard();
    const order = [s.currentCharacter];
    for (let i = 0; i < 8; i++) {
      nextCharacter(s);
      order.push(s.currentCharacter);
    }
    expect(order).toEqual(['CH1', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7', 'CH8', 'CH9', 'CH1']);
  });

  it('NPCs wander 2..6 steps and stay on free points; runs are deterministic per seed', () => {
    const run = (seed: number) => {
      const s = onBoard(seed);
      const rng = makeRng(s);
      const out: string[] = [];
      for (let i = 0; i < 30; i++) {
        for (const ch of ['CH4', 'CH5', 'CH7', 'CH8', 'CH9'] as const) {
          s.currentCharacter = ch;
          const r = npcTurn(s, ch, rng);
          out.push(r.path.join('>'));
          expect(r.path.length).toBeLessThanOrEqual(7);
        }
      }
      return out;
    };
    expect(run(7)).toEqual(run(7));
  });

  it('Rocco steals a random item into his slot', () => {
    const s = onBoard();
    const rng = makeRng(s);
    s.chars.CH1.inventory = ['OI010', 'OI000', 'OI000'];
    const ev: GameEvent[] = [];
    expect(stealInventar(s, 'CH1', rng, ev)).toBe(true);
    expect(s.chars.CH9.inventory[0]).toBe('OI010');
    expect(s.chars.CH1.inventory[0]).toBe('OI000');
  });
});
