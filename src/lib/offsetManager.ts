import { GrammarMatch } from '@/types';

/**
 * Replaces a single match in current text and recalibrates offsets of remaining matches
 */
export function applySingleReplacement(
  currentText: string,
  matches: GrammarMatch[],
  targetMatchId: string,
  replacementValue: string
): { updatedText: string; updatedMatches: GrammarMatch[] } {
  const targetIndex = matches.findIndex((m) => m.id === targetMatchId);
  if (targetIndex === -1) {
    return { updatedText: currentText, updatedMatches: matches };
  }

  const target = matches[targetIndex];
  const prefix = currentText.slice(0, target.offset);
  const suffix = currentText.slice(target.offset + target.length);
  const updatedText = prefix + replacementValue + suffix;

  const delta = replacementValue.length - target.length;

  const updatedMatches = matches
    .filter((m) => m.id !== targetMatchId)
    .map((m) => {
      if (m.offset > target.offset) {
        return {
          ...m,
          offset: m.offset + delta,
        };
      }
      return m;
    });

  return { updatedText, updatedMatches };
}

/**
 * Applies all primary replacements for non-overlapping matches from right to left
 */
export function applyAllReplacements(
  currentText: string,
  matches: GrammarMatch[]
): { updatedText: string; appliedCount: number } {
  const actionable = matches
    .filter((m) => m.replacements && m.replacements.length > 0)
    .sort((a, b) => b.offset - a.offset); // Process rightmost matches first

  let text = currentText;
  let appliedCount = 0;
  let lastProcessedOffset = Infinity;

  for (const m of actionable) {
    // Avoid overlapping collisions
    if (m.offset + m.length <= lastProcessedOffset) {
      const rep = m.replacements[0].value;
      const prefix = text.slice(0, m.offset);
      const suffix = text.slice(m.offset + m.length);
      text = prefix + rep + suffix;
      lastProcessedOffset = m.offset;
      appliedCount++;
    }
  }

  return { updatedText: text, appliedCount };
}

/**
 * Filters out matches whose original text or lemma matches any jargon word in whitelist
 */
export function filterMatchesWithJargon(
  matches: GrammarMatch[],
  jargonList: string[]
): GrammarMatch[] {
  if (!jargonList || jargonList.length === 0) return matches;

  const lowerJargon = new Set(jargonList.map((j) => j.trim().toLowerCase()));

  return matches.filter((m) => {
    const rawWord = m.originalText.trim().toLowerCase();
    // Check exact word or clean word without punctuation
    const cleanWord = rawWord.replace(/^[^\w]+|[^\w]+$/g, '');
    return !lowerJargon.has(rawWord) && !lowerJargon.has(cleanWord);
  });
}

/**
 * Calculates text statistics
 */
export function calculateMetrics(text: string) {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const charsWithSpaces = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const paragraphs = trimmed
    ? trimmed.split(/\n+/).filter((p) => p.trim().length > 0).length
    : 0;
  const readingTimeMin = Math.ceil(words / 200); // 200 words per minute average academic reading

  return {
    words,
    charsWithSpaces,
    charsNoSpaces,
    paragraphs,
    readingTimeMin,
  };
}
