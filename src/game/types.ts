// Core data types. Names mirror the original Director fields (CHn-Info, SPxxx, ASxxx-yy)
// so that save data maps 1:1 onto the reconstructed original state.

export type CharId = 'CH1' | 'CH2' | 'CH3' | 'CH4' | 'CH5' | 'CH6' | 'CH7' | 'CH8' | 'CH9';
export const ALL_CHARS: CharId[] = ['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7', 'CH8', 'CH9'];
export const NPCS: CharId[] = ['CH3', 'CH4', 'CH5', 'CH6', 'CH7', 'CH8'];

export type PlayerCharacter = 'Bingo' | 'Puck';
/** Original "mode" item of CHn-Info. */
export type CharMode = 'player' | 'stopped' | 'random' | 'hunt' | 'deliver';

/** One board point, from the SPxxx field: nr,locH,locV,up,right,down,left,ground,state,target */
export interface BoardPoint {
  n: number;
  x: number;
  y: number;
  /** neighbours [up, right, down, left] as "SPxxx-nn" or null */
  nb: (string | null)[];
  /** ground: 1 stone, 2 sand, 3 dirt, 4 grass (0 = unspecified) */
  g: number;
  /** initial state: ___ / JOK / BLK (CHn markers are runtime occupancy) */
  s: string;
  /** adventure (ASxxx-yy) or game (GSxxx-yy) screen entered when a player lands here */
  t: string | null;
}

export interface CharInfo {
  /** board (SPxxx) or scene (ASxxx-yy / GSxxx-yy) the character is on; '' = not placed */
  screen: string;
  /** point number on the board; 0 inside scenes */
  position: number;
  /** 1 up, 2 right, 3 down, 4 left, 0 none */
  direction: number;
  mode: CharMode;
  referenceCharacter: string;
  targetPosition: string;
  inventory: [string, string, string];
  coins: number;
  jokes: number;
  /** 1..90 */
  mood: number;
}

export interface GameState {
  playerCharacter: PlayerCharacter;
  currentCharacter: CharId;
  chars: Record<CharId, CharInfo>;
  /** per board: state item (___ / JOK / BLK) for each point index (0-based) */
  boardState: Record<string, string[]>;
  /** per scene: key/value state (e.g. "HS1" -> "activ") */
  sceneState: Record<string, Record<string, string>>;
  /** original "cubePoints" field: 0 = not rolled */
  cubePoints: number;
  /** PRNG state, needed for exact restoration of random sequences */
  rng: number;
  /** number of completed rounds (informational) */
  round: number;
  /** last board point a player entered a scene from (fallback return point) */
  lastBoardPoint: Partial<Record<CharId, string>>;
}

export type GameEvent =
  | { type: 'joke'; ch: CharId; point: string }
  | { type: 'steal'; from: CharId; item: string }
  | { type: 'sell'; to: CharId; item: string }
  | { type: 'enterScene'; ch: CharId; scene: string }
  | { type: 'moodDown'; ch: CharId };

export interface MoveResult {
  ch: CharId;
  /** list of points walked, first = start */
  path: string[];
  events: GameEvent[];
}
