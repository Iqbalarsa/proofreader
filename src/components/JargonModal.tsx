'use client';

import React, { useState } from 'react';

interface JargonModalProps {
  isOpen: boolean;
  onClose: () => void;
  jargonList: string[];
  onAddTerm: (term: string) => void;
  onRemoveTerm: (term: string) => void;
  onResetDefaults: () => void;
}

export const JargonModal: React.FC<JargonModalProps> = ({
  isOpen,
  onClose,
  jargonList,
  onAddTerm,
  onRemoveTerm,
  onResetDefaults,
}) => {
  const [newTerm, setNewTerm] = useState('');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTerm.trim()) {
      onAddTerm(newTerm.trim());
      setNewTerm('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-md select-none">
      <div className="liquid-glass rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-white/80">
        {/* Header */}
        <div className="border-b border-neutral-200/50 px-6 py-4 flex items-center justify-between bg-white/40">
          <div>
            <h2 className="font-semibold text-base text-neutral-900 tracking-tight">
              Academic Jargon Whitelist
            </h2>
            <p className="text-xs text-neutral-500 font-sans mt-0.5">
              Technical nomenclature and research terms ignored by the spellchecker.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs rounded-full bg-white/80 hover:bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200/60 shadow-sm transition"
          >
            Close
          </button>
        </div>

        {/* Add Input */}
        <form
          onSubmit={handleAdd}
          className="border-b border-neutral-200/40 p-4 bg-white/30 flex gap-2"
        >
          <input
            type="text"
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            placeholder="Add academic term (e.g., 'in silico', 'heteroscedasticity')..."
            className="flex-1 bg-white/80 border border-neutral-200/80 rounded-full px-4 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-800/10"
          />
          <button
            type="submit"
            className="bg-neutral-900 hover:bg-black text-white px-4 py-1.5 rounded-full text-xs font-medium transition shadow-sm"
          >
            Add
          </button>
        </form>

        {/* List of Whitelisted Jargon */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-3 text-xs text-neutral-500 font-mono">
            <span>Whitelisted Terms ({jargonList.length}):</span>
            <button
              onClick={onResetDefaults}
              className="underline text-neutral-600 hover:text-neutral-900"
            >
              Reset to Defaults
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {jargonList.map((term) => (
              <span
                key={term}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-neutral-200/60 text-neutral-800 text-xs shadow-sm"
              >
                <span>{term}</span>
                <button
                  type="button"
                  onClick={() => onRemoveTerm(term)}
                  className="text-neutral-400 hover:text-rose-600 font-bold ml-0.5"
                  title={`Remove "${term}"`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-neutral-200/40 px-6 py-3 bg-white/30 text-[11px] font-mono text-neutral-400 flex items-center justify-between">
          <span>Synced locally in browser</span>
          <button
            onClick={onClose}
            className="text-neutral-600 hover:text-neutral-900 underline"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
