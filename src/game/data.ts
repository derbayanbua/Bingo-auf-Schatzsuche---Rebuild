import raw from '../data/boards.json';
import type { BoardPoint, CharId, CharInfo, GameState, PlayerCharacter } from './types';
import { randomSeed } from './rng';

interface RawData {
  boards: Record<string, BoardPoint[]>;
  sceneState: Record<string, Record<string, string>>;
}
const data = raw as unknown as RawData;

/** Static board graph, extracted 1:1 from the original Data/Default.cxt (fields SP001..SP048). */
export const BOARDS: Record<string, BoardPoint[]> = data.boards;
/** Boards that actually have a landscape movie in the original (SP007/017/036/037 are 1-point stubs). */
export const PLAYABLE_BOARDS = Object.keys(BOARDS).filter((k) => BOARDS[k].length > 1);

export function splitPoint(id: string): [string, number] {
  const [b, n] = id.split('-');
  return [b, parseInt(n, 10)];
}

export function pointId(board: string, n: number): string {
  return `${board}-${n < 10 ? '0' + n : n}`;
}

export function getPoint(id: string): BoardPoint | undefined {
  const [b, n] = splitPoint(id);
  return BOARDS[b]?.[n - 1];
}

function info(p: Partial<CharInfo>): CharInfo {
  return {
    screen: '',
    position: 0,
    direction: 0,
    mode: 'stopped',
    referenceCharacter: 'CH0',
    targetPosition: 'SP001-04',
    inventory: ['OI000', 'OI000', 'OI000'],
    coins: 0,
    jokes: 0,
    mood: 90,
    ...p,
  };
}

/** Initial game state = content of the original Data/Default.cxt (copied to Active.cxt on "Neues Spiel"). */
export function createInitialState(player: PlayerCharacter = 'Bingo', seed = randomSeed()): GameState {
  const chars: Record<CharId, CharInfo> = {
    CH1: info({ screen: 'AS001-01', mode: 'player', referenceCharacter: 'none', targetPosition: 'none', coins: 10 }),
    CH2: info({ screen: 'AS001-02', mode: 'player', referenceCharacter: 'none', targetPosition: 'none', coins: 10 }),
    CH3: info({}),
    CH4: info({ screen: 'SP014', position: 12, direction: 2, mode: 'random' }),
    CH5: info({ screen: 'SP008', position: 6, direction: 2, mode: 'random' }),
    CH6: info({}),
    CH7: info({ screen: 'SP018', position: 7, direction: 3, mode: 'random' }),
    CH8: info({ screen: 'SP006', position: 7, direction: 2, mode: 'random' }),
    CH9: info({ screen: 'SP006', position: 12, direction: 1, mode: 'random', referenceCharacter: 'CH4', mood: 1 }),
  };
  const boardState: Record<string, string[]> = {};
  for (const [k, pts] of Object.entries(BOARDS)) {
    // CHn markers in the shipped data are stale occupancy; the original updateSP() clears them too.
    boardState[k] = pts.map((p) => (p.s === 'JOK' || p.s === 'BLK' ? p.s : '___'));
  }
  return {
    playerCharacter: player,
    currentCharacter: player === 'Bingo' ? 'CH1' : 'CH2',
    chars,
    boardState,
    sceneState: JSON.parse(JSON.stringify(data.sceneState)),
    cubePoints: 0,
    rng: seed,
    round: 0,
    lastBoardPoint: {},
  };
}
