// Shared_Graphic-1: Bongo (Bingo*) and Pucki (Puck*) at 10/25/50/75/90/100 % with all part members.
import { defineMovie } from '../lib/api';
import { characterMember } from '../lib/characters';

export default defineMovie({
  '*': (m, w, h) => characterMember(m.name, w, h, m.regX, m.regY),
});
