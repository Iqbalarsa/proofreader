const JARGON_KEY = 'academic_proofreader_jargon_v1';

export const DEFAULT_ACADEMIC_JARGON = [
  'in vitro',
  'in vivo',
  'et al.',
  'i.e.',
  'e.g.',
  'ANOVA',
  'p-value',
  'post-hoc',
  'heteroscedasticity',
  'multivariate',
  'CRISPR-Cas9',
  'backpropagation',
  'eigenvector',
  'bioavailability',
  'hyperparameters',
];

export function getJargonList(): string[] {
  if (typeof window === 'undefined') return DEFAULT_ACADEMIC_JARGON;
  try {
    const raw = localStorage.getItem(JARGON_KEY);
    if (!raw) {
      localStorage.setItem(JARGON_KEY, JSON.stringify(DEFAULT_ACADEMIC_JARGON));
      return DEFAULT_ACADEMIC_JARGON;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load jargon list', e);
    return DEFAULT_ACADEMIC_JARGON;
  }
}

export function addJargonTerm(term: string): string[] {
  if (typeof window === 'undefined') return [];
  const clean = term.trim();
  if (!clean) return getJargonList();

  try {
    const current = getJargonList();
    if (!current.some((item) => item.toLowerCase() === clean.toLowerCase())) {
      const updated = [...current, clean];
      localStorage.setItem(JARGON_KEY, JSON.stringify(updated));
      return updated;
    }
    return current;
  } catch (e) {
    console.error('Failed to add jargon term', e);
    return getJargonList();
  }
}

export function removeJargonTerm(term: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getJargonList();
    const updated = current.filter(
      (item) => item.toLowerCase() !== term.toLowerCase()
    );
    localStorage.setItem(JARGON_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to remove jargon term', e);
    return getJargonList();
  }
}

export function resetJargonToDefault(): string[] {
  if (typeof window === 'undefined') return DEFAULT_ACADEMIC_JARGON;
  try {
    localStorage.setItem(JARGON_KEY, JSON.stringify(DEFAULT_ACADEMIC_JARGON));
    return DEFAULT_ACADEMIC_JARGON;
  } catch {
    return DEFAULT_ACADEMIC_JARGON;
  }
}
