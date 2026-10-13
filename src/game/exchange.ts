// Trading with NPCs, reconstructed from Exchange.dxr (prepareMovie/startMovie/enterFrame/stopMovie).
// The NPC's mood decides the deal; exactly one deal per visit.

import { checkFreeInventar, checkOneInventar, giveItem } from './logic';
import type { CharId, GameState } from './types';

export type ExchangeMode = 'impossible' | 'money' | 'exchange' | 'gift' | 'done';

export interface ExchangeSession {
  npc: CharId;
  player: CharId;
  mode: ExchangeMode;
  /** price in coins for #money (5/10/20) */
  price: number;
  /** reason shown to the player (own wording) */
  line: 'nothingToGive' | 'sell' | 'swap' | 'gift' | 'tooPoor' | 'nothingToOffer';
  paid: boolean;
}

export function startExchange(s: GameState, npc: CharId): ExchangeSession {
  const player = s.currentCharacter;
  const base = { npc, player, price: 0, paid: false };
  if (!checkOneInventar(s, npc)) return { ...base, mode: 'impossible', line: 'nothingToGive' };
  const mood = s.chars[npc].mood;
  if (mood <= 30) {
    const price = mood <= 10 ? 20 : mood <= 20 ? 10 : 5;
    if (s.chars[player].coins < price) return { ...base, price, mode: 'impossible', line: 'tooPoor' };
    return { ...base, price, mode: 'money', line: 'sell' };
  }
  if (mood <= 60) {
    if (!checkOneInventar(s, player)) return { ...base, mode: 'impossible', line: 'nothingToOffer' };
    return { ...base, mode: 'exchange', line: 'swap' };
  }
  if (!checkFreeInventar(s, player)) return { ...base, mode: 'exchange', line: 'swap' };
  return { ...base, mode: 'gift', line: 'gift' };
}

export type ExchangeResult = { ok: true } | { ok: false; reason: 'noSpace' | 'wrongMode' | 'emptySlot' | 'notPaid' };

/** #money: pay the price (Drop Coins: subCoins immediately). */
export function payCoins(s: GameState, ex: ExchangeSession): boolean {
  if (ex.mode !== 'money' || ex.paid) return false;
  if (s.chars[ex.player].coins < ex.price) return false;
  s.chars[ex.player].coins -= ex.price;
  ex.paid = true;
  return true;
}

/** Undo the payment (coin stack dropped back on the pile / leaving with the stack in the offer slot). */
export function refundCoins(s: GameState, ex: ExchangeSession) {
  if (ex.paid && ex.mode === 'money') {
    s.chars[ex.player].coins += ex.price;
    ex.paid = false;
  }
}

/** #gift / #money: take the NPC's item from slot npcSlot. */
export function takeItem(s: GameState, ex: ExchangeSession, npcSlot: number): ExchangeResult {
  if (ex.mode !== 'gift' && ex.mode !== 'money') return { ok: false, reason: 'wrongMode' };
  const item = s.chars[ex.npc].inventory[npcSlot];
  if (!item || item === 'OI000') return { ok: false, reason: 'emptySlot' };
  if (!checkFreeInventar(s, ex.player)) return { ok: false, reason: 'noSpace' };
  if (ex.mode === 'money' && !ex.paid) return { ok: false, reason: 'notPaid' };
  s.chars[ex.npc].inventory[npcSlot] = 'OI000';
  giveItem(s, ex.player, item);
  ex.mode = 'done';
  return { ok: true };
}

/** #exchange: swap one player item with one NPC item (any item for any item). */
export function swapItems(s: GameState, ex: ExchangeSession, playerSlot: number, npcSlot: number): ExchangeResult {
  // original: in #gift mode an item placed in the offer slot is swapped as well
  if (ex.mode !== 'exchange' && ex.mode !== 'gift') return { ok: false, reason: 'wrongMode' };
  const a = s.chars[ex.player].inventory[playerSlot];
  const b = s.chars[ex.npc].inventory[npcSlot];
  if (a === 'OI000' || b === 'OI000') return { ok: false, reason: 'emptySlot' };
  s.chars[ex.player].inventory[playerSlot] = b;
  s.chars[ex.npc].inventory[npcSlot] = a;
  ex.mode = 'done';
  return { ok: true };
}
