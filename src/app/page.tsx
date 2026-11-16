'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TopBar } from '@/components/TopBar';
import { LeftPanel } from '@/components/LeftPanel';
import { RightPanel } from '@/components/RightPanel';
import { HistoryModal } from '@/components/HistoryModal';
import { JargonModal } from '@/components/JargonModal';
import { SettingsModal } from '@/components/SettingsModal';
import { GrammarMatch, DocumentItem, AppSettings } from '@/types';
import {
  applySingleReplacement,
  applyAllReplacements,
  filterMatchesWithJargon,
  calculateMetrics,
} from '@/lib/offsetManager';
import {
  getAllDocuments,
  getOrInitActiveDocument,
  saveOrUpdateDocument,
  createNewDocument,
  deleteDocument,
  clearAllDocuments,
  setActiveDocumentId,
} from '@/lib/historyStorage';
import {
  getJargonList,
  addJargonTerm,
  removeJargonTerm,
  resetJargonToDefault,
} from '@/lib/jargonStorage';
import { ACADEMIC_SAMPLES, AcademicSample } from '@/lib/academicSamples';

const DEFAULT_SETTINGS: AppSettings = {
  engineMode: 'public',
  customEndpoint: 'https://api.languagetool.org/v2/check',
  language: 'en-US',
  fontFamily: 'sans',
  fontSize: 'base',
  autoCheck: true,
};

export default function ProofreaderPage() {
  const [currentDocId, setCurrentDocId] = useState<string>('');
  const [docTitle, setDocTitle] = useState<string>('Untitled Document');
  const [text, setText] = useState<string>('');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const [matches, setMatches] = useState<GrammarMatch[]>([]);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isCheckingDeep, setIsCheckingDeep] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>('en-US');

  // Modals
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isJargonOpen, setIsJargonOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Storage states
  const [jargonList, setJargonList] = useState<string[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Feedback flags
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);

  // Debounce refs
  const checkDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Initial load from localStorage
  useEffect(() => {
    const activeDoc = getOrInitActiveDocument(ACADEMIC_SAMPLES[0].text);
    setCurrentDocId(activeDoc.id);
    setDocTitle(activeDoc.title);
    setText(activeDoc.content);
    setDocuments(getAllDocuments());

    setJargonList(getJargonList());

    try {
      const savedSettings = localStorage.getItem('academic_proofreader_settings_v2');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch {}
  }, []);

  // Filter matches whenever raw matches or jargon list updates
  const activeMatches = useMemo(() => {
    return filterMatchesWithJargon(matches, jargonList);
  }, [matches, jargonList]);

  // Text metrics calculation
  const metrics = useMemo(() => {
    return calculateMetrics(text);
  }, [text]);

  // Core Check Function
  const runGrammarCheck = useCallback(
    async (textToCheck: string, currentLang: string, currentSettings: AppSettings) => {
      const clean = textToCheck.trim();
      if (!clean) {
        setMatches([]);
        setIsChecking(false);
        return;
      }

      setIsChecking(true);
      try {
        const endpoint =
          currentSettings.engineMode === 'public'
            ? 'https://api.languagetool.org/v2/check'
            : currentSettings.engineMode === 'docker'
            ? 'http://localhost:8010/v2/check'
            : currentSettings.customEndpoint;

        const res = await fetch('/api/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToCheck,
            language: currentLang,
            customEndpoint: endpoint,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setMatches(data.matches || []);
        } else {
          console.error('Check failed with status', res.status);
        }
      } catch (e) {
        console.error('Grammar check request failed:', e);
      } finally {
        setIsChecking(false);
      }
    },
    []
  );

  // Deep Sentence Check via Google Gemini (Strict Diff-Lock)
  const handleRunDeepCheck = async () => {
    const clean = text.trim();
    if (!clean) return;

    setIsCheckingDeep(true);
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          language,
          mode: 'deep',
          geminiApiKey: settings.geminiApiKey,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMatches(data.matches || []);
      } else {
        alert(
          data.error ||
            'Gagal menjalankan Deep Sentence Check. Pastikan GEMINI_API_KEY sudah dikonfigurasi.'
        );
        if (data.error?.includes('GEMINI_API_KEY')) {
          setIsSettingsOpen(true);
        }
      }
    } catch (err: unknown) {
      alert(`Gagal menghubungi server: ${(err as Error)?.message}`);
    } finally {
      setIsCheckingDeep(false);
    }
  };

  // Debounced auto-save and auto-check
  useEffect(() => {
    if (!currentDocId) return;

    // In-place auto-save (updates current document in localStorage, does NOT add new history)
    if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current);
    autoSaveDebounceRef.current = setTimeout(() => {
      saveOrUpdateDocument(currentDocId, text, docTitle, matches.length);
      setDocuments(getAllDocuments());
    }, 1500);

    // Auto-check grammar after 1.5s of no typing
    if (settings.autoCheck) {
      if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current);
      checkDebounceRef.current = setTimeout(() => {
        runGrammarCheck(text, language, settings);
      }, 1500);
    }

    return () => {
      if (checkDebounceRef.current) clearTimeout(checkDebounceRef.current);
      if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current);
    };
  }, [text, docTitle, currentDocId, language, settings, runGrammarCheck, matches.length]);

  // Apply single replacement
  const handleApplyFix = (matchId: string, replacement: string) => {
    const { updatedText, updatedMatches } = applySingleReplacement(
      text,
      matches,
      matchId,
      replacement
    );
    setText(updatedText);
    setMatches(updatedMatches);
    setActiveMatchId(null);
  };

  // Apply all non-conflicting replacements
  const handleApplyAll = () => {
    const { updatedText, appliedCount } = applyAllReplacements(text, activeMatches);
    if (appliedCount > 0) {
      setText(updatedText);
      runGrammarCheck(updatedText, language, settings);
    }
  };

  // Ignore single error instance
  const handleIgnoreMatch = (matchId: string) => {
    setMatches((prev) => prev.filter((m) => m.id !== matchId));
    if (activeMatchId === matchId) {
      setActiveMatchId(null);
    }
  };

  // Add term to jargon ignore list
  const handleAddToJargon = (term: string) => {
    const updated = addJargonTerm(term);
    setJargonList(updated);
  };

  // Copy text to clipboard
  const handleCopyText = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Manual save: updates the current document in-place
  const handleSaveDocument = () => {
    if (!currentDocId) return;
    saveOrUpdateDocument(currentDocId, text, docTitle, activeMatches.length);
    setDocuments(getAllDocuments());
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  // Load sample academic text into current document
  const handleLoadSample = (sample: AcademicSample) => {
    setText(sample.text);
    setDocTitle(sample.title);
    setActiveMatchId(null);
    saveOrUpdateDocument(currentDocId, sample.text, sample.title, 0);
    setDocuments(getAllDocuments());
    runGrammarCheck(sample.text, language, settings);
  };

  // Clear canvas
  const handleClearText = () => {
    if (text.trim() && window.confirm('Clear all text from current document?')) {
      setText('');
      setMatches([]);
      setActiveMatchId(null);
      saveOrUpdateDocument(currentDocId, '', docTitle, 0);
      setDocuments(getAllDocuments());
    }
  };

  // Switch to another document
  const handleSelectDocument = (doc: DocumentItem) => {
    // Save current doc first
    if (currentDocId) {
      saveOrUpdateDocument(currentDocId, text, docTitle, activeMatches.length);
    }
    setCurrentDocId(doc.id);
    setActiveDocumentId(doc.id);
    setDocTitle(doc.title);
    setText(doc.content);
    setDocuments(getAllDocuments());
    setActiveMatchId(null);
    runGrammarCheck(doc.content, language, settings);
  };

  // Create a brand new document
  const handleNewDocument = () => {
    if (currentDocId) {
      saveOrUpdateDocument(currentDocId, text, docTitle, activeMatches.length);
    }
    const newDoc = createNewDocument('Untitled Document', '');
    setCurrentDocId(newDoc.id);
    setDocTitle(newDoc.title);
    setText(newDoc.content);
    setMatches([]);
    setActiveMatchId(null);
    setDocuments(getAllDocuments());
  };

  // Delete a document
  const handleDeleteDocument = (id: string) => {
    const { remainingDocs, newActiveDoc } = deleteDocument(id);
    setDocuments(remainingDocs);
    if (newActiveDoc) {
      setCurrentDocId(newActiveDoc.id);
      setDocTitle(newActiveDoc.title);
      setText(newActiveDoc.content);
      setActiveMatchId(null);
      runGrammarCheck(newActiveDoc.content, language, settings);
    }
  };

  // Clear all documents
  const handleClearAllDocuments = () => {
    const fresh = clearAllDocuments();
    setCurrentDocId(fresh.id);
    setDocTitle(fresh.title);
    setText('');
    setMatches([]);
    setActiveMatchId(null);
    setDocuments([fresh]);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#f5f5f7] text-neutral-900 font-sans selection:bg-neutral-300/70 overflow-hidden">
      {/* Ambient Apple Glass Background Glows */}
      <div
        className="pointer-events-none absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-100/40 via-purple-100/30 to-transparent blur-3xl opacity-60"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-0 right-10 w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-sky-100/40 via-blue-100/20 to-transparent blur-3xl opacity-50"
        aria-hidden="true"
      />

      {/* Floating Liquid Glass Top Bar */}
      <TopBar
        language={language}
        onLanguageChange={(newLang) => {
          setLanguage(newLang);
          runGrammarCheck(text, newLang, settings);
        }}
        metrics={metrics}
        issueCount={activeMatches.length}
        isChecking={isChecking}
        onCheckNow={() => runGrammarCheck(text, language, settings)}
        onCopyText={handleCopyText}
        copyFeedback={copyFeedback}
        onSaveSnapshot={handleSaveDocument}
        saveFeedback={saveFeedback}
        docCount={documents.length}
        onOpenDocuments={() => setIsDocsOpen(true)}
        onRunDeepCheck={handleRunDeepCheck}
        isCheckingDeep={isCheckingDeep}
        jargonCount={jargonList.length}
        onOpenJargon={() => setIsJargonOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLoadSample={handleLoadSample}
        onClearText={handleClearText}
      />

      {/* Main Split-Screen Workspace */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-7xl w-full mx-auto pb-4">
        {/* Left Panel: Writing Canvas */}
        <LeftPanel
          title={docTitle}
          onTitleChange={(val) => setDocTitle(val)}
          text={text}
          onTextChange={(val) => setText(val)}
          matches={activeMatches}
          activeMatchId={activeMatchId}
          onSelectMatch={(m) => setActiveMatchId(m ? m.id : null)}
          onApplyFix={handleApplyFix}
          onIgnoreMatch={handleIgnoreMatch}
        />

        {/* Right Panel: Suggestions & Educational Feedback */}
        <RightPanel
          matches={activeMatches}
          activeMatchId={activeMatchId}
          onSelectMatch={(m) => setActiveMatchId(m ? m.id : null)}
          onApplyFix={handleApplyFix}
          onIgnoreMatch={handleIgnoreMatch}
          onAddToJargon={handleAddToJargon}
          onApplyAll={handleApplyAll}
        />
      </main>

      {/* Documents Modal */}
      <HistoryModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        documents={documents}
        activeDocId={currentDocId}
        onSelectDocument={handleSelectDocument}
        onDeleteDocument={handleDeleteDocument}
        onClearAll={handleClearAllDocuments}
        onNewDocument={handleNewDocument}
      />

      {/* Academic Jargon Whitelist Modal */}
      <JargonModal
        isOpen={isJargonOpen}
        onClose={() => setIsJargonOpen(false)}
        jargonList={jargonList}
        onAddTerm={(term) => {
          const updated = addJargonTerm(term);
          setJargonList(updated);
        }}
        onRemoveTerm={(term) => {
          const updated = removeJargonTerm(term);
          setJargonList(updated);
        }}
        onResetDefaults={() => {
          const defaults = resetJargonToDefault();
          setJargonList(defaults);
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          try {
            localStorage.setItem(
              'academic_proofreader_settings_v2',
              JSON.stringify(newSettings)
            );
          } catch {}
          runGrammarCheck(text, language, newSettings);
        }}
      />
    </div>
  );
}
