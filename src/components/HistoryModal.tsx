'use client';

import React, { useState } from 'react';
import { HistoryItem } from '@/types';
import { formatRelativeTime, formatFullDate } from '@/lib/formatTime';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onLoadItem: (item: HistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onNewDraft: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onLoadItem,
  onDeleteItem,
  onClearAll,
  onNewDraft,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredHistory = history.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (item: HistoryItem) => {
    const blob = new Blob([item.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = item.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    a.download = `${safeTitle || 'draft'}_${item.timestamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proofreader_history_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-md select-none">
      <div className="liquid-glass rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-white/80">
        {/* Header */}
        <div className="border-b border-neutral-200/50 px-6 py-4 flex items-center justify-between bg-white/40">
          <div>
            <h2 className="font-semibold text-base text-neutral-900 tracking-tight">
              Writing History
            </h2>
            <p className="text-xs text-neutral-500 font-sans mt-0.5">
              Drafts and revisions are safely persisted locally on your device.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs rounded-full bg-white/80 hover:bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200/60 shadow-sm transition"
          >
            Close
          </button>
        </div>

        {/* Toolbar & Search */}
        <div className="border-b border-neutral-200/40 px-6 py-3 bg-white/30 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search drafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/80 border border-neutral-200/80 rounded-full px-4 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-800/10"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onNewDraft();
                onClose();
              }}
              className="bg-neutral-900 hover:bg-black text-white px-3.5 py-1.5 rounded-full font-medium transition shadow-sm"
            >
              + New Draft
            </button>
            {history.length > 0 && (
              <>
                <button
                  onClick={handleExportJSON}
                  className="bg-white/80 hover:bg-white text-neutral-700 px-3 py-1.5 rounded-full border border-neutral-200/60 transition shadow-sm"
                  title="Export entire history as JSON backup"
                >
                  Backup JSON
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete all saved writing history?')) {
                      onClearAll();
                    }
                  }}
                  className="text-neutral-400 hover:text-rose-600 px-2 py-1.5 transition text-[11px]"
                >
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>

        {/* List of history items */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-neutral-400">
              <div className="font-medium text-sm text-neutral-600 mb-1">
                {searchQuery ? 'No matching drafts found.' : 'No saved drafts yet.'}
              </div>
              <p className="text-xs max-w-sm mx-auto text-neutral-400">
                Type in the editor or click Save in the top bar to archive your manuscript versions.
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="liquid-glass-card rounded-2xl p-4 transition-all hover:bg-white"
              >
                {/* Item Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-neutral-900">
                      {item.title}
                    </span>
                    <span
                      className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${
                        item.isAutoSaved
                          ? 'border-neutral-200 bg-neutral-100/70 text-neutral-600'
                          : 'border-neutral-800 bg-neutral-900 text-white'
                      }`}
                    >
                      {item.isAutoSaved ? 'Auto' : 'Saved'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                    <span title={formatFullDate(item.timestamp)}>
                      {formatRelativeTime(item.timestamp)}
                    </span>
                    <span>•</span>
                    <span>{item.wordCount} words</span>
                  </div>
                </div>

                {/* Excerpt preview */}
                <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2 mb-3 bg-neutral-50/70 p-2.5 rounded-xl border border-neutral-100/80">
                  {item.content}
                </p>

                {/* Item Actions */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        onLoadItem(item);
                        onClose();
                      }}
                      className="bg-neutral-900 hover:bg-black text-white px-3 py-1 rounded-full font-medium transition shadow-sm"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleCopy(item.id, item.content)}
                      className="bg-white/80 hover:bg-white text-neutral-700 px-3 py-1 rounded-full border border-neutral-200/60 transition shadow-sm"
                    >
                      {copiedId === item.id ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={() => handleDownload(item)}
                      className="bg-white/80 hover:bg-white text-neutral-700 px-3 py-1 rounded-full border border-neutral-200/60 transition shadow-sm"
                    >
                      Download .txt
                    </button>
                  </div>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="text-neutral-400 hover:text-rose-600 text-[11px] transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-neutral-200/40 px-6 py-3 bg-white/30 text-[11px] font-mono text-neutral-400 flex items-center justify-between">
          <span>{history.length} drafts archived</span>
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
