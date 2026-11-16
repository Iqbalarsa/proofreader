import { DocumentItem } from '@/types';

const DOCUMENTS_KEY = 'academic_proofreader_documents_v2';
const ACTIVE_DOC_ID_KEY = 'academic_proofreader_active_doc_id_v2';

export function getAllDocuments(): DocumentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DOCUMENTS_KEY);
    if (!raw) return [];
    const list: DocumentItem[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error('Failed to load documents from localStorage', e);
    return [];
  }
}

export function getActiveDocumentId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_DOC_ID_KEY);
  } catch {
    return null;
  }
}

export function setActiveDocumentId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_DOC_ID_KEY, id);
  } catch {
    console.error('Failed to set active document id');
  }
}

export function getOrInitActiveDocument(defaultContent: string = ''): DocumentItem {
  if (typeof window === 'undefined') {
    return {
      id: 'doc_default',
      title: 'Untitled Document',
      content: defaultContent,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      wordCount: 0,
      charCount: 0,
      issueCount: 0,
    };
  }

  const docs = getAllDocuments();
  const activeId = getActiveDocumentId();

  if (activeId) {
    const found = docs.find((d) => d.id === activeId);
    if (found) return found;
  }

  if (docs.length > 0) {
    setActiveDocumentId(docs[0].id);
    return docs[0];
  }

  // Create initial document
  const trimmed = defaultContent.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const newDoc: DocumentItem = {
    id: 'doc_' + Date.now(),
    title: 'Research Abstract',
    content: defaultContent,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    wordCount: words,
    charCount: defaultContent.length,
    issueCount: 0,
  };

  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify([newDoc]));
  setActiveDocumentId(newDoc.id);
  return newDoc;
}

export function saveOrUpdateDocument(
  id: string,
  content: string,
  title?: string,
  issueCount: number = 0
): DocumentItem {
  const docs = getAllDocuments();
  const now = Date.now();
  const trimmed = content.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;

  // Determine smart title if not provided or empty
  let finalTitle = title?.trim();
  if (!finalTitle) {
    const firstLine = trimmed.split('\n')[0].replace(/[#*_`]/g, '').trim();
    finalTitle =
      firstLine.length > 40
        ? firstLine.slice(0, 37) + '...'
        : firstLine || 'Untitled Document';
  }

  const existingIndex = docs.findIndex((d) => d.id === id);

  if (existingIndex !== -1) {
    // UPDATE EXISTING DOCUMENT IN-PLACE (No duplicate history!)
    const current = docs[existingIndex];
    const updated: DocumentItem = {
      ...current,
      title: finalTitle,
      content,
      updatedAt: now,
      wordCount: words,
      charCount: content.length,
      issueCount,
    };

    docs[existingIndex] = updated;
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
    setActiveDocumentId(id);
    return updated;
  } else {
    // Create new document if ID was not found
    const newDoc: DocumentItem = {
      id,
      title: finalTitle,
      content,
      createdAt: now,
      updatedAt: now,
      wordCount: words,
      charCount: content.length,
      issueCount,
    };

    const updatedList = [newDoc, ...docs];
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(updatedList));
    setActiveDocumentId(id);
    return newDoc;
  }
}

export function createNewDocument(
  title: string = 'Untitled Document',
  content: string = ''
): DocumentItem {
  const docs = getAllDocuments();
  const now = Date.now();
  const trimmed = content.trim();
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;

  const newDoc: DocumentItem = {
    id: 'doc_' + now + '_' + Math.random().toString(36).substring(2, 6),
    title: title.trim() || 'Untitled Document',
    content,
    createdAt: now,
    updatedAt: now,
    wordCount: words,
    charCount: content.length,
    issueCount: 0,
  };

  const updatedList = [newDoc, ...docs];
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(updatedList));
  setActiveDocumentId(newDoc.id);
  return newDoc;
}

export function deleteDocument(id: string): {
  remainingDocs: DocumentItem[];
  newActiveDoc: DocumentItem | null;
} {
  const docs = getAllDocuments();
  const remaining = docs.filter((d) => d.id !== id);
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(remaining));

  let newActiveDoc: DocumentItem | null = null;
  const currentActiveId = getActiveDocumentId();

  if (currentActiveId === id) {
    if (remaining.length > 0) {
      newActiveDoc = remaining[0];
      setActiveDocumentId(newActiveDoc.id);
    } else {
      // Create a fresh blank document
      newActiveDoc = createNewDocument('Untitled Document', '');
    }
  } else {
    newActiveDoc = remaining.find((d) => d.id === currentActiveId) || remaining[0] || null;
  }

  return { remainingDocs: remaining, newActiveDoc };
}

export function clearAllDocuments(): DocumentItem {
  localStorage.removeItem(DOCUMENTS_KEY);
  localStorage.removeItem(ACTIVE_DOC_ID_KEY);
  return createNewDocument('Untitled Document', '');
}
