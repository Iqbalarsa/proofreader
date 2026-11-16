'use client';

import React, { useState } from 'react';
import { ACADEMIC_SAMPLES, AcademicSample } from '@/lib/academicSamples';

interface TopBarProps {
  language: string;
  onLanguageChange: (lang: string) => void;
  metrics: {
    words: number;
    charsWithSpaces: number;
  };
  issueCount: number;
  isChecking: boolean;
  onCheckNow: () => void;
  onCopyText: () => void;
  copyFeedback: boolean;
  onSaveSnapshot: () => void;
  saveFeedback: boolean;
  historyCount: number;
  onOpenHistory: () => void;
  jargonCount: number;
  onOpenJargon: () => void;
  onOpenSettings: () => void;
  onLoadSample: (sample: AcademicSample) => void;
  onClearText: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  language,
  onLanguageChange,
  metrics,
  issueCount,
  isChecking,
  onCopyText,
  copyFeedback,
  onSaveSnapshot,
  saveFeedback,
  historyCount,
  onOpenHistory,
  jargonCount,
  onOpenJargon,
  onOpenSettings,
  onLoadSample,
  onClearText,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSampleSubmenu, setShowSampleSubmenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 select-none px-4 pt-3 pb-1">
      <div className="liquid-glass rounded-2xl max-w-7xl mx-auto px-5 py-2.5 flex items-center justify-between gap-4 transition-all">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-neutral-900">
              Proofreader
            </span>
            <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-neutral-200/60 text-neutral-600 border border-neutral-300/40">
              Non-AI
            </span>
          </div>
        </div>

        {/* Center: Minimalist Status Capsule */}
        <div className="hidden sm:flex items-center gap-2.5 text-xs text-neutral-600 bg-white/50 border border-neutral-200/60 rounded-full px-4 py-1 shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
          {/* Dialect selector */}
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="bg-transparent text-neutral-800 text-xs font-medium focus:outline-none cursor-pointer hover:text-black transition"
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="en-CA">English (Canada)</option>
            <option value="en-AU">English (Australia)</option>
          </select>

          <span className="text-neutral-300">•</span>
          <span>{metrics.words.toLocaleString()} words</span>
          <span className="text-neutral-300">•</span>

          <span
            className={
              issueCount > 0
                ? 'font-medium text-neutral-900'
                : 'text-neutral-500'
            }
          >
            {isChecking
              ? 'Checking...'
              : issueCount > 0
              ? `${issueCount} issues`
              : 'All clear'}
          </span>
        </div>

        {/* Right: Essential Clean Liquid Glass Actions */}
        <div className="flex items-center gap-2 text-xs">
          {/* Copy Button */}
          <button
            onClick={onCopyText}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              copyFeedback
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-white/80 hover:bg-white text-neutral-700 hover:text-neutral-900 border border-neutral-200/70 shadow-sm'
            }`}
          >
            {copyFeedback ? 'Copied' : 'Copy'}
          </button>

          {/* Save Button */}
          <button
            onClick={onSaveSnapshot}
            className={`px-3.5 py-1.5 rounded-full font-medium transition-all ${
              saveFeedback
                ? 'bg-neutral-900 text-white shadow-sm'
                : 'bg-white/80 hover:bg-white text-neutral-700 hover:text-neutral-900 border border-neutral-200/70 shadow-sm'
            }`}
          >
            {saveFeedback ? 'Saved' : 'Save'}
          </button>

          {/* History Button */}
          <button
            onClick={onOpenHistory}
            className="px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-white text-neutral-700 hover:text-neutral-900 border border-neutral-200/70 shadow-sm font-medium transition-all"
          >
            History ({historyCount})
          </button>

          {/* More Menu Dropdown for Secondary Settings & Samples */}
          <div className="relative">
            <button
              onClick={() => {
                setShowMoreMenu(!showMoreMenu);
                setShowSampleSubmenu(false);
              }}
              className="px-3 py-1.5 rounded-full bg-white/80 hover:bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200/70 shadow-sm font-medium transition-all"
              title="More options"
            >
              More ▾
            </button>

            {showMoreMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowSampleSubmenu(false);
                  }}
                />
                <div className="absolute right-0 mt-2 w-56 liquid-glass rounded-2xl shadow-xl z-50 py-1.5 text-left border border-white/70 overflow-hidden text-xs">
                  {/* Sample Texts Toggle */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSampleSubmenu(!showSampleSubmenu)}
                      className="w-full text-left px-4 py-2 hover:bg-neutral-100/70 text-neutral-700 transition flex items-center justify-between"
                    >
                      <span>Sample Texts</span>
                      <span className="text-[10px] text-neutral-400">▸</span>
                    </button>

                    {showSampleSubmenu && (
                      <div className="bg-neutral-50/90 border-y border-neutral-200/60 py-1">
                        {ACADEMIC_SAMPLES.map((sample) => (
                          <button
                            key={sample.id}
                            onClick={() => {
                              onLoadSample(sample);
                              setShowMoreMenu(false);
                              setShowSampleSubmenu(false);
                            }}
                            className="w-full text-left px-5 py-1.5 text-[11px] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition truncate"
                          >
                            {sample.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      onOpenJargon();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-neutral-100/70 text-neutral-700 transition flex items-center justify-between"
                  >
                    <span>Jargon Whitelist</span>
                    <span className="font-mono text-[10px] text-neutral-400">
                      ({jargonCount})
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      onOpenSettings();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-neutral-100/70 text-neutral-700 transition"
                  >
                    Engine Settings
                  </button>

                  <div className="my-1 border-t border-neutral-200/50" />

                  <button
                    onClick={() => {
                      onClearText();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition"
                  >
                    Clear Text
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
