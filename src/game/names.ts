// Display names of the game's own characters. Internally (save format, member names of the original
// layout data, speaker ids) the original ids stay: playerCharacter 'Bingo' | 'Puck', CH1..CH9.
//   CH1 Bingo → Bongo, CH2 Puck → Pucki, CH3 Reeling → Käpt'n Reling, CH4 Alfred → Alfons,
//   CH5 Magnus → Mats, CH6 Ben → Bert, CH7 Arnold → Arno, CH8 Tim → Tom, CH9 Rocco → Rocko.

export const DISPLAY_NAMES: Record<string, string> = {
  Bingo: 'Bongo',
  Puck: 'Pucki',
  Reeling: 'Käpt’n Reling',
  Alfred: 'Alfons',
  Magnus: 'Mats',
  Ben: 'Bert',
  Arnold: 'Arno',
  Tim: 'Tom',
  Rocco: 'Rocko',
};

/** display name for an internal character / speaker id (unknown ids are returned unchanged) */
export function displayName(id: string): string {
  return DISPLAY_NAMES[id] ?? id;
}
