'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { GrammarMatch } from '@/types';

interface RightPanelProps {
  matches: GrammarMatch[];
  activeMatchId: string | null;
  onSelectMatch: (match: GrammarMatch | null) => void;
  onApplyFix: (matchId: string, replacement: string) => void;
  onIgnoreMatch: (matchId: string) => void;
  onAddToJargon: (term: string) => void;
  onApplyAll: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  matches,
  activeMatchId,
  onSelectMatch,
  onApplyFix,
  onIgnoreMatch,
  onAddToJargon,
  onApplyAll,
}) => {
  const [filter, setFilter] = useState<'all' | 'grammar' | 'spelling'>('all');
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filter matches based on selected category tab
  const filteredMatches = useMemo(() => {
    if (filter === 'grammar') {
      return matches.filter(
        (m) =>
          m.rule.category.id === 'GRAMMAR' || m.rule.issueType === 'grammar'
      );
    }
    if (filter === 'spelling') {
      return matches.filter(
        (m) =>
          m.rule.category.id !== 'GRAMMAR' && m.rule.issueType !== 'grammar'
      );
    }
    return matches;
  }, [matches, filter]);

  // Counts for tabs
  const grammarCount = useMemo(
    () =>
      matches.filter(
        (m) =>
          m.rule.category.id === 'GRAMMAR' || m.rule.issueType === 'grammar'
      ).length,
    [matches]
  );
  const spellingCount = matches.length - grammarCount;

  // Scroll active match card into view smoothly
  useEffect(() => {
    if (activeMatchId && cardRefs.current[activeMatchId]) {
      cardRefs.current[activeMatchId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeMatchId]);

  return (
    <aside className="w-full lg:w-[410px] xl:w-[440px] flex flex-col h-full p-3 sm:p-4 pl-0 select-none">
      {/* Liquid Glass Container */}
      <div className="liquid-glass rounded-3xl flex-1 flex flex-col overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.03)] border border-white/80">
        {/* Header */}
        <div className="border-b border-neutral-200/50 px-5 py-3.5 bg-white/40 backdrop-blur-md">
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="font-semibold text-sm text-neutral-900 tracking-tight">
              Suggestions
            </h2>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-neutral-200/50 text-neutral-700">
                {matches.length}
              </span>
              {matches.length > 0 && (
                <button
                  onClick={onApplyAll}
                  className="text-xs text-neutral-900 hover:text-black font-medium underline transition"
                  title="Apply all primary suggestions"
                >
                  Accept All
                </button>
              )}
            </div>
          </div>

          {/* Filter Capsule Tabs */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                filter === 'all'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-white/60 hover:bg-white text-neutral-600 border border-neutral-200/50'
              }`}
            >
              All ({matches.length})
            </button>
            <button
              onClick={() => setFilter('grammar')}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                filter === 'grammar'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-white/60 hover:bg-white text-neutral-600 border border-neutral-200/50'
              }`}
            >
              Grammar ({grammarCount})
            </button>
            <button
              onClick={() => setFilter('spelling')}
              className={`px-3 py-1 rounded-full font-medium transition-all ${
                filter === 'spelling'
                  ? 'bg-neutral-900 text-white shadow-sm'
                  : 'bg-white/60 hover:bg-white text-neutral-600 border border-neutral-200/50'
              }`}
            >
              Spelling ({spellingCount})
            </button>
          </div>
        </div>

        {/* Suggestion Cards Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredMatches.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/40 border border-white/60 rounded-2xl">
              <div className="font-medium text-base text-neutral-900 mb-1">
                All Clear
              </div>
              <p className="text-xs text-neutral-500 max-w-xs leading-relaxed mb-4">
                No grammar or spelling errors detected. Your writing retains 100% authentic voice with zero AI alteration.
              </p>
              <div className="font-mono text-[10px] uppercase text-neutral-400 border border-neutral-200/80 px-3 py-1 rounded-full bg-white/60">
                Rule-Based Linter
              </div>
            </div>
          ) : (
            filteredMatches.map((m) => {
              const isGrammar =
                m.rule.category.id === 'GRAMMAR' ||
                m.rule.issueType === 'grammar';
              const isActive = m.id === activeMatchId;

              return (
                <div
                  key={m.id}
                  ref={(el) => {
                    cardRefs.current[m.id] = el;
                  }}
                  onClick={() => onSelectMatch(m)}
                  className={`liquid-glass-card rounded-2xl p-4 transition-all text-xs cursor-pointer ${
                    isActive
                      ? 'ring-2 ring-neutral-900/20 border-neutral-900 bg-white shadow-md'
                      : ''
                  }`}
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isGrammar ? 'bg-rose-500' : 'bg-amber-500'
                        }`}
                      />
                      <span className="font-mono text-[10px] uppercase tracking-wider font-semibold text-neutral-600">
                        {m.rule.category.name || 'Rule'}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-neutral-400">
                      Offset #{m.offset}
                    </span>
                  </div>

                  {/* Word Comparison Pill */}
                  <div className="bg-neutral-100/70 border border-neutral-200/50 rounded-xl p-2.5 mb-2.5 flex items-center flex-wrap gap-2">
                    <span className="line-through text-rose-700 bg-rose-50/80 px-2 py-0.5 rounded-md font-mono text-[11px]">
                      {m.originalText}
                    </span>
                    <span className="text-neutral-400 font-mono text-xs">→</span>
                    {m.replacements.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {m.replacements.slice(0, 3).map((rep, rIdx) => (
                          <button
                            key={rIdx}
                            onClick={(e) => {
                              e.stopPropagation();
                              onApplyFix(m.id, rep.value);
                            }}
                            className="bg-neutral-900 hover:bg-black text-white px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium transition shadow-sm"
                            title="Click to apply"
                          >
                            {rep.value}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-neutral-400 italic text-[11px]">
                        (Manual correction)
                      </span>
                    )}
                  </div>

                  {/* Explanation Description */}
                  <div className="mb-3 text-neutral-700 leading-relaxed font-sans text-xs">
                    <p className="font-medium text-neutral-900 mb-0.5">
                      {m.shortMessage || m.rule.description}
                    </p>
                    <p className="text-neutral-600">{m.message}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between border-t border-neutral-200/40 pt-2.5 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {m.replacements.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onApplyFix(m.id, m.replacements[0].value);
                          }}
                          className="bg-neutral-900 hover:bg-black text-white px-3 py-1 rounded-full font-medium transition shadow-sm"
                        >
                          Accept
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onIgnoreMatch(m.id);
                        }}
                        className="bg-white/80 hover:bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-300/60 px-3 py-1 rounded-full transition"
                      >
                        Dismiss
                      </button>
                    </div>

                    {/* Jargon Whitelist */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToJargon(m.originalText);
                      }}
                      className="text-neutral-500 hover:text-neutral-900 underline transition text-[11px]"
                      title="Add to custom jargon list to prevent future flags"
                    >
                      Ignore Term
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200/40 px-5 py-2.5 bg-white/30 backdrop-blur-md text-[11px] font-mono text-neutral-400 text-center select-none">
          LanguageTool Engine • Zero AI Modification
        </div>
      </div>
    </aside>
  );
};
