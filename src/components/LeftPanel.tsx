'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { GrammarMatch } from '@/types';

interface LeftPanelProps {
  title: string;
  onTitleChange: (val: string) => void;
  text: string;
  onTextChange: (val: string) => void;
  matches: GrammarMatch[];
  activeMatchId: string | null;
  onSelectMatch: (match: GrammarMatch | null) => void;
  onApplyFix: (matchId: string, replacement: string) => void;
  onIgnoreMatch: (matchId: string) => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  title,
  onTitleChange,
  text,
  onTextChange,
  matches,
  activeMatchId,
  onSelectMatch,
  onApplyFix,
  onIgnoreMatch,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'inspect'>('edit');
  const [cursorMatch, setCursorMatch] = useState<GrammarMatch | null>(null);

  // Track cursor position in textarea to identify current error under caret
  const handleCursorMove = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const match = matches.find((m) => pos >= m.offset && pos <= m.offset + m.length);
    if (match) {
      setCursorMatch(match);
      onSelectMatch(match);
    } else {
      setCursorMatch(null);
    }
  };

  // Render text with interactive underline markup for Review mode
  const renderedTextElements = useMemo(() => {
    if (!text) return null;
    if (matches.length === 0) {
      return <span className="whitespace-pre-wrap">{text}</span>;
    }

    const sorted = [...matches].sort((a, b) => a.offset - b.offset);
    const elements: React.ReactNode[] = [];
    let currentIndex = 0;

    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i];

      // Avoid overlapping indexes
      if (m.offset < currentIndex) continue;

      // Normal text before match
      if (m.offset > currentIndex) {
        elements.push(
          <span key={`plain_${currentIndex}`} className="whitespace-pre-wrap">
            {text.substring(currentIndex, m.offset)}
          </span>
        );
      }

      const matchText = text.substring(m.offset, m.offset + m.length);
      const isGrammar =
        m.rule.category.id === 'GRAMMAR' ||
        m.rule.category.id === 'COLLOCATIONS' ||
        m.rule.issueType === 'grammar';
      const isActive = m.id === activeMatchId;

      elements.push(
        <mark
          key={m.id}
          onClick={(e) => {
            e.stopPropagation();
            onSelectMatch(m);
          }}
          className={`cursor-pointer px-1 py-0.5 rounded transition-all whitespace-pre-wrap ${
            isGrammar
              ? 'bg-rose-50/80 text-neutral-900 underline decoration-rose-500 decoration-wavy underline-offset-4 hover:bg-rose-100/90'
              : 'bg-amber-50/80 text-neutral-900 underline decoration-amber-500 decoration-wavy underline-offset-4 hover:bg-amber-100/90'
          } ${
            isActive
              ? 'ring-2 ring-neutral-800 bg-neutral-200/90 font-medium'
              : ''
          }`}
          title={`${m.rule.category.name}: ${m.message}`}
        >
          {matchText}
        </mark>
      );

      currentIndex = m.offset + m.length;
    }

    // Remaining text
    if (currentIndex < text.length) {
      elements.push(
        <span key={`plain_end_${currentIndex}`} className="whitespace-pre-wrap">
          {text.substring(currentIndex)}
        </span>
      );
    }

    return elements;
  }, [text, matches, activeMatchId, onSelectMatch]);

  // When activeMatchId changes from the outside (e.g. clicked in Right Panel), sync cursorMatch
  useEffect(() => {
    if (activeMatchId && viewMode === 'edit') {
      const match = matches.find((m) => m.id === activeMatchId);
      if (match) {
        setCursorMatch(match);
      }
    }
  }, [activeMatchId, matches, viewMode]);

  return (
    <section className="flex-1 flex flex-col h-full min-w-0 p-3 sm:p-4">
      {/* Liquid Glass Canvas Container */}
      <div className="liquid-glass rounded-3xl flex-1 flex flex-col overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.03)] border border-white/80">
        {/* Canvas Toolbar: Ultra-Clean Mode Switcher */}
        <div className="flex items-center justify-between border-b border-neutral-200/50 px-5 sm:px-6 py-2.5 bg-white/40 backdrop-blur-md select-none text-xs">
          {/* View Mode Toggle Pill */}
          <div className="flex items-center p-0.5 bg-neutral-200/50 rounded-full border border-neutral-300/30">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3.5 py-1 rounded-full font-medium transition-all ${
                viewMode === 'edit'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Write
            </button>
            <button
              onClick={() => setViewMode('inspect')}
              className={`px-3.5 py-1 rounded-full font-medium transition-all ${
                viewMode === 'inspect'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Review ({matches.length})
            </button>
          </div>

          <div className="text-[11px] text-neutral-400 font-mono">
            {viewMode === 'edit' ? 'Direct Typing' : 'Interactive Highlights'}
          </div>
        </div>

        {/* Floating Context Pill when caret lands on an error */}
        {viewMode === 'edit' && cursorMatch && (
          <div className="bg-neutral-100/80 backdrop-blur-md border-b border-neutral-200/60 px-5 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono uppercase text-[10px] bg-neutral-800 text-white px-2 py-0.5 rounded-full">
                {cursorMatch.rule.category.name}
              </span>
              <span className="text-neutral-600">
                &ldquo;{cursorMatch.originalText}&rdquo;
              </span>
              {cursorMatch.replacements.length > 0 && (
                <span className="text-neutral-900 font-medium">
                  → Suggestion: <strong>{cursorMatch.replacements[0].value}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {cursorMatch.replacements.length > 0 && (
                <button
                  onClick={() =>
                    onApplyFix(cursorMatch.id, cursorMatch.replacements[0].value)
                  }
                  className="bg-neutral-900 hover:bg-neutral-800 text-white px-3 py-1 rounded-full font-medium transition shadow-sm text-xs"
                >
                  Apply
                </button>
              )}
              <button
                onClick={() => onIgnoreMatch(cursorMatch.id)}
                className="bg-white/80 hover:bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-300/60 px-3 py-1 rounded-full transition text-xs"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main Writing Area with Compact Natural Margins & Title */}
        <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8 flex flex-col">
          {/* Document Title Input (Optional, Apple Notes / Word Style) */}
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled Document"
            className="w-full text-lg sm:text-xl font-medium tracking-tight text-neutral-900 bg-transparent focus:outline-none placeholder:text-neutral-300 pb-2 mb-3 border-b border-neutral-100/80 focus:border-neutral-300 transition"
          />

          {/* Text Editor Canvas */}
          <div className="w-full flex-1 flex flex-col text-[15px] sm:text-[16px] leading-[1.75] text-neutral-800 font-normal">
            {viewMode === 'edit' ? (
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                onClick={handleCursorMove}
                onKeyUp={handleCursorMove}
                onSelect={handleCursorMove}
                placeholder="Start typing your thesis, research paper, or essay here...

The proofreader checks grammar, spelling, and collocations without altering your natural author style."
                className="w-full flex-1 bg-transparent text-neutral-900 resize-none focus:outline-none placeholder:text-neutral-300 font-sans tracking-normal min-h-[380px]"
                spellCheck={false}
              />
            ) : (
              <div
                onClick={() => onSelectMatch(null)}
                className="w-full flex-1 text-neutral-900 cursor-text select-text font-sans tracking-normal min-h-[380px]"
              >
                {text ? (
                  renderedTextElements
                ) : (
                  <div className="text-neutral-400 italic">
                    Document is empty. Switch to Write mode or select a sample manuscript from the More menu.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Canvas Footer */}
        <div className="border-t border-neutral-200/40 px-5 sm:px-6 py-2 bg-white/30 backdrop-blur-md text-[11px] text-neutral-400 flex items-center justify-between select-none">
          <span>Non-AI Linter • Preserves Authentic Author Voice</span>
          <span>Auto-saved to device</span>
        </div>
      </div>
    </section>
  );
};
