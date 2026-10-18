import { describe, it, expect } from 'vitest';
import { shuffle, getFullName, cleanBookName } from './utils';

describe('Utils Logic', () => {
  it('cleanBookName removes trailing punctuation', () => {
    expect(cleanBookName('Gen.')).toBe('Gen');
    expect(cleanBookName('1 John,')).toBe('1 John');
  });

  it('getFullName maps abbreviations to full names', () => {
    expect(getFullName('Gen')).toBe('Genesis');
    expect(getFullName('1 Cor')).toBe('1 Corinthians');
    expect(getFullName('UnknownBook')).toBe(null);
  });

  it('shuffle returns an array of the same length', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffle(arr);
    expect(shuffled.length).toBe(5);
    expect(shuffled).not.toBe(arr); // Should be a new array
  });
});