import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/game/data';
import { npcTurn, rollDice } from '../src/game/logic';
import { makeRng } from '../src/game/rng';
import { DEFAULT_SETTINGS, SaveError, autosave, loadAutosave, parseSave, serialize } from '../src/save/save';

const session = { view: 'board', settings: { ...DEFAULT_SETTINGS } };

describe('save format', () => {
  it('round-trips through JSON and continues the same random sequence', () => {
    const g = createInitialState('Puck', 1234);
    const rng = makeRng(g);
    rollDice(g, rng);
    g.chars.CH2.inventory[1] = 'OI014';
    g.boardState.SP001[3] = 'JOK';
    const text = JSON.stringify(serialize(g, session));
    const loaded = parseSave(text).game;
    expect(loaded).toEqual(g);
    // identical continuation
    const a = npcTurn(g, 'CH4', makeRng(g));
    const b = npcTurn(loaded, 'CH4', makeRng(loaded));
    expect(b.path).toEqual(a.path);
  });

  it('rejects foreign, broken and manipulated files with a readable message', () => {
    expect(() => parseSave('not json')).toThrow(SaveError);
    expect(() => parseSave('{"hello":1}')).toThrow(/kein Spielstand/);
    const ok = serialize(createInitialState(), session) as any;
    const bad1 = JSON.parse(JSON.stringify(ok));
    bad1.game.chars.CH1.coins = -5;
    expect(() => parseSave(bad1)).toThrow(SaveError);
    const bad2 = JSON.parse(JSON.stringify(ok));
    bad2.game.chars.CH1.inventory[0] = '<script>';
    expect(() => parseSave(bad2)).toThrow(SaveError);
    const bad3 = JSON.parse(JSON.stringify(ok));
    bad3.game.boardState.SP001 = ['___'];
    expect(() => parseSave(bad3)).toThrow(SaveError);
    const newer = JSON.parse(JSON.stringify(ok));
    newer.version = 99;
    expect(() => parseSave(newer)).toThrow(/neueren/);
  });

  it('autosaves to localStorage', () => {
    const g = createInitialState('Bingo', 5);
    expect(autosave(g, session)).toBe(true);
    expect(loadAutosave()?.game).toEqual(g);
  });
});
