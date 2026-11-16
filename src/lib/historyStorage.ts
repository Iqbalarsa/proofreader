import { HistoryItem } from '@/types';

const HISTORY_KEY = 'academic_proofreader_history_v1';
const DRAFT_KEY = 'academic_proofreader_current_draft_v1';

export function getHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load history from localStorage', e);
    return [];
  }
}

export function saveHistoryItem(
  content: string,
  issueCount: number = 0,
  titleOverride?: string,
  isAutoSaved: boolean = false
): HistoryItem | null {
  if (typeof window === 'undefined') return null;
  const trimmed = content.trim();
  if (!trimmed) return null;

  try {
    const history = getHistory();
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    const charCount = content.length;

    // Generate smart title from first sentence or first 50 chars
    const firstLine = trimmed.split('\n')[0].replace(/[#*_`]/g, '').trim();
    const title =
      titleOverride ||
      (firstLine.length > 55 ? firstLine.slice(0, 52) + '...' : firstLine) ||
      'Untitled Draft';

    // If auto-saved, check if previous item was also auto-saved recently (< 3 minutes ago) and update it
    const now = Date.now();
    if (isAutoSaved && history.length > 0) {
      const latest = history[0];
      if (latest.isAutoSaved && now - latest.timestamp < 3 * 60 * 1000) {
        latest.content = content;
        latest.timestamp = now;
        latest.wordCount = words;
        latest.charCount = charCount;
        latest.issueCount = issueCount;
        latest.title = title;
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        return latest;
      }
    }

    const newItem: HistoryItem = {
      id: 'hist_' + now + '_' + Math.random().toString(36).substring(2, 7),
      title,
      content,
      timestamp: now,
      wordCount: words,
      charCount,
      issueCount,
      isAutoSaved,
    };

    // Keep max 50 recent items
    const updated = [newItem, ...history].slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return newItem;
  } catch (e) {
    console.error('Failed to save history item', e);
    return null;
  }
}

export function deleteHistoryItem(id: string): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const history = getHistory();
    const updated = history.filter((item) => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to delete history item', e);
    return [];
  }
}

export function clearAllHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    console.error('Failed to clear history');
  }
}

export function saveCurrentDraft(content: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DRAFT_KEY, content);
  } catch {
    console.error('Failed to save draft');
  }
}

export function getCurrentDraft(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(DRAFT_KEY) || '';
  } catch {
    return '';
  }
}
