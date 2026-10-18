import { describe, it, expect } from 'vitest';
import { pickVerseRef } from './api';

describe('Verse Reference Parsing', () => {
  it('extracts a C:V reference from parentheses in the question text', () => {
    const q = 'How many years old was Joseph when he died (Gen. 50:26)?';
    // Even if DB is null, it should find the Gen. 50:26 in the text
    expect(pickVerseRef(q, null, 'Genesis 1:1')).toBe('Gen. 50:26');
  });

  it('falls back to the DB reference if there is no parenthesis', () => {
    const q = 'What did God create?';
    expect(pickVerseRef(q, 'Genesis 1:1', null)).toBe('Genesis 1:1');
  });

  it('appends :1 if the DB only has a chapter (e.g. Genesis 1)', () => {
    const q = 'What did God create?';
    expect(pickVerseRef(q, 'Genesis 1', null)).toBe('Genesis 1:1');
  });

  it('uses the fallback if both text and DB are empty', () => {
    expect(pickVerseRef('No reference here', null, 'Bible 1:1')).toBe('Bible 1:1');
  });
});