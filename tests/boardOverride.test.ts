import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/game/data';
import { applyWalk, boardItemKey, pointNeighbours, pointTarget, searchTargets } from '../src/game/logic';
import type { GameEvent } from '../src/game/types';
import { DEFAULT_SETTINGS, SaveError, parseSave, serialize } from '../src/save/save';

const session = { view: 'board', settings: { ...DEFAULT_SETTINGS } };

// AS038-01 (Hängebrücke) rewrites member("SP038").line[15].item[4] / line[7].item[7] on leaving and
// line[18].item[10] after the blasting. Stored as sceneState.SP038["L<line>I<item>"].
describe('runtime board field overrides (AS038-01)', () => {
  it('bridge: SP038-15 up / SP038-07 left only after the planks are in', () => {
    const s = createInitialState('Bingo', 1);
    expect(pointNeighbours(s, 'SP038-15')[0]).toBeNull();
    expect(pointNeighbours(s, 'SP038-07')[3]).toBeNull();
    s.sceneState.SP038 = { [boardItemKey(15, 4)]: 'SP038-14', [boardItemKey(7, 7)]: 'SP038-06' };
    expect(pointNeighbours(s, 'SP038-15')).toEqual(['SP038-14', 'SP038-16', 'SP043-01', null]);
    expect(pointNeighbours(s, 'SP038-07')[3]).toBe('SP038-06');
    // a figure on 15 can now walk up over the bridge
    s.chars.CH1.screen = 'SP038';
    s.chars.CH1.position = 15;
    s.chars.CH1.direction = 1;
    expect(searchTargets(s, 'CH1', 2, 'all')).toContain('SP038-13');
    // planks taken away again: "________" = no neighbour
    s.sceneState.SP038[boardItemKey(15, 4)] = '________';
    expect(pointNeighbours(s, 'SP038-15')[0]).toBeNull();
    expect(searchTargets(s, 'CH1', 2, 'all')).not.toContain('SP038-14');
  });

  it('blasting: SP038-18 leads to AS045-02', () => {
    const s = createInitialState('Bingo', 1);
    expect(pointTarget(s, 'SP038-18')).toBe('AS045-01');
    s.sceneState.SP038 = { [boardItemKey(18, 10)]: 'AS045-02' };
    expect(pointTarget(s, 'SP038-18')).toBe('AS045-02');
    s.chars.CH1.screen = 'SP038';
    s.chars.CH1.position = 17;
    const ev: GameEvent[] = [];
    applyWalk(s, 'CH1', ['SP038-17', 'SP038-18'], ev);
    expect(s.chars.CH1.screen).toBe('AS045-02');
  });

  it('survives save/load and the validation rejects bad board keys', () => {
    const g = createInitialState('Bingo', 7);
    g.sceneState.SP038 = { L15I4: 'SP038-14', L7I7: '________', L18I10: 'AS045-02' };
    const text = JSON.stringify(serialize(g, session));
    expect(parseSave(text).game.sceneState.SP038).toEqual(g.sceneState.SP038);
    const bad = JSON.parse(text);
    bad.game.sceneState.SP038 = { OH1: 'state1' };
    expect(() => parseSave(JSON.stringify(bad))).toThrow(SaveError);
    bad.game.sceneState.XY038 = {};
    delete bad.game.sceneState.SP038;
    expect(() => parseSave(JSON.stringify(bad))).toThrow(SaveError);
  });
});
