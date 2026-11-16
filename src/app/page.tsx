'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { TopBar } from '@/components/TopBar';
import { LeftPanel } from '@/components/LeftPanel';
import { RightPanel } from '@/components/RightPanel';
import { HistoryModal } from '@/components/HistoryModal';
import { JargonModal } from '@/components/JargonModal';
import { SettingsModal } from '@/components/SettingsModal';
import { GrammarMatch, HistoryItem, AppSettings } from '@/types';
import {
  applySingleReplacement,
  applyAllReplacements,
  filterMatchesWithJargon,
  calculateMetrics,
} from '@/lib/offsetManager';
import {
  getHistory,
  saveHistoryItem,
  deleteHistoryItem,
  clearAllHistory,
  saveCurrentDraft,
  getCurrentDraft,
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
  const [text, setText] = useState<string>('');
  const [matches, setMatches] = useState<GrammarMatch[]>([]);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>('en-US');

  // Modals
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isJargonOpen, setIsJargonOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Storage states
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [jargonList, setJargonList] = useState<string[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Temporary feedback flags
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);

  // Debounce refs
  const checkDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Initial load from localStorage
  useEffect(() => {
    const loadedDraft = getCurrentDraft();
    const loadedHistory = getHistory();
    const loadedJargon = getJargonList();

    setHistory(loadedHistory);
    setJargonList(loadedJargon);

    if (loadedDraft && loadedDraft.trim().length > 0) {
      setText(loadedDraft);
    } else {
      // Default to Sample 1
      setText(ACADEMIC_SAMPLES[0].text);
    }
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

  // Debounced auto-check & auto-save whenever text or language changes
  useEffect(() => {
    if (!text) {
      setMatches([]);
      return;
    }

    // Auto-save current draft continuously
    saveCurrentDraft(text);

    // Auto-save to history after typing settles
    if (autoSaveDebounceRef.current) clearTimeout(autoSaveDebounceRef.current);
    autoSaveDebounceRef.current = setTimeout(() => {
      const saved = saveHistoryItem(text, matches.length, undefined, true);
      if (saved) {
        setHistory(getHistory());
      }
    }, 4000);

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
  }, [text, language, settings, runGrammarCheck, matches.length]);

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

  // Manual save snapshot to history
  const handleSaveSnapshot = () => {
    if (!text.trim()) return;
    const saved = saveHistoryItem(text, activeMatches.length, undefined, false);
    if (saved) {
      setHistory(getHistory());
      setSaveFeedback(true);
      setTimeout(() => setSaveFeedback(false), 2000);
    }
  };

  // Load sample academic text
  const handleLoadSample = (sample: AcademicSample) => {
    setText(sample.text);
    setActiveMatchId(null);
    runGrammarCheck(sample.text, language, settings);
  };

  // Clear canvas
  const handleClearText = () => {
    if (text.trim() && window.confirm('Clear all text from canvas?')) {
      saveHistoryItem(text, activeMatches.length, 'Archived Before Clearing', false);
      setHistory(getHistory());
      setText('');
      setMatches([]);
      setActiveMatchId(null);
    }
  };

  // Load specific item from history
  const handleLoadHistoryItem = (item: HistoryItem) => {
    setText(item.content);
    setActiveMatchId(null);
    runGrammarCheck(item.content, language, settings);
  };

  // Delete item from history
  const handleDeleteHistoryItem = (id: string) => {
    const updated = deleteHistoryItem(id);
    setHistory(updated);
  };

  // Clear all history
  const handleClearAllHistory = () => {
    clearAllHistory();
    setHistory([]);
  };

  // Start fresh document
  const handleNewDraft = () => {
    if (text.trim()) {
      saveHistoryItem(text, activeMatches.length, undefined, false);
      setHistory(getHistory());
    }
    setText('');
    setMatches([]);
    setActiveMatchId(null);
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
        onSaveSnapshot={handleSaveSnapshot}
        saveFeedback={saveFeedback}
        historyCount={history.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
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

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onLoadItem={handleLoadHistoryItem}
        onDeleteItem={handleDeleteHistoryItem}
        onClearAll={handleClearAllHistory}
        onNewDraft={handleNewDraft}
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
          runGrammarCheck(text, language, newSettings);
        }}
      />
    </div>
  );
}
