import { describe, it, expect } from 'vitest';
import { calculateNextScore, canFinishDuel } from './duelLogic';

describe('Multiplayer Duel Logic', () => {
  describe('Score calculation', () => {
    it('increments the score by 1 if the answer is correct', () => {
      expect(calculateNextScore(0, true)).toBe(1);
      expect(calculateNextScore(5, true)).toBe(6);
    });

    it('does not increment the score if the answer is incorrect', () => {
      expect(calculateNextScore(0, false)).toBe(0);
      expect(calculateNextScore(5, false)).toBe(5);
    });
  });

  describe('Duel finishing', () => {
    it('does not end the duel if only the local player is finished', () => {
      expect(canFinishDuel(true, false)).toBe(false);
    });

    it('does not end the duel if only the opponent is finished', () => {
      expect(canFinishDuel(false, true)).toBe(false);
    });

    it('ends the duel only when both players are finished', () => {
      expect(canFinishDuel(true, true)).toBe(true);
    });
  });
});