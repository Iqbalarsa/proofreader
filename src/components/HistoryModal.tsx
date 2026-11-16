'use client';

import React, { useState } from 'react';
import { DocumentItem } from '@/types';
import { formatRelativeTime, formatFullDate } from '@/lib/formatTime';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  activeDocId: string | null;
  onSelectDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (id: string) => void;
  onClearAll: () => void;
  onNewDocument: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  documents,
  activeDocId,
  onSelectDocument,
  onDeleteDocument,
  onClearAll,
  onNewDocument,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const filteredDocs = documents.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (doc: DocumentItem) => {
    const blob = new Blob([doc.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (doc.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    a.download = `${safeTitle}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(documents, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proofreader_documents_backup_${Date.now()}.json`;
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
              My Documents
            </h2>
            <p className="text-xs text-neutral-500 font-sans mt-0.5">
              Each document saves in-place like Word or Apple Notes.
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
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/80 border border-neutral-200/80 rounded-full px-4 py-1.5 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-800/10"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onNewDocument();
                onClose();
              }}
              className="bg-neutral-900 hover:bg-black text-white px-3.5 py-1.5 rounded-full font-medium transition shadow-sm"
            >
              + New Document
            </button>
            {documents.length > 0 && (
              <>
                <button
                  onClick={handleExportJSON}
                  className="bg-white/80 hover:bg-white text-neutral-700 px-3 py-1.5 rounded-full border border-neutral-200/60 transition shadow-sm"
                  title="Export all documents as JSON backup"
                >
                  Backup JSON
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Delete all saved documents?')) {
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

        {/* List of documents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredDocs.length === 0 ? (
            <div className="py-16 text-center text-neutral-400">
              <div className="font-medium text-sm text-neutral-600 mb-1">
                {searchQuery ? 'No matching documents found.' : 'No documents saved yet.'}
              </div>
              <p className="text-xs max-w-sm mx-auto text-neutral-400">
                Click + New Document to start writing a fresh manuscript.
              </p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isCurrent = doc.id === activeDocId;

              return (
                <div
                  key={doc.id}
                  className={`liquid-glass-card rounded-2xl p-4 transition-all hover:bg-white ${
                    isCurrent ? 'ring-2 ring-neutral-900/15 border-neutral-900 bg-white' : ''
                  }`}
                >
                  {/* Document Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-neutral-900">
                        {doc.title || 'Untitled Document'}
                      </span>
                      {isCurrent && (
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full border border-neutral-800 bg-neutral-900 text-white">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                      <span title={formatFullDate(doc.updatedAt)}>
                        Edited {formatRelativeTime(doc.updatedAt)}
                      </span>
                      <span>•</span>
                      <span>{doc.wordCount} words</span>
                    </div>
                  </div>

                  {/* Excerpt preview */}
                  <p className="text-xs text-neutral-600 leading-relaxed line-clamp-2 mb-3 bg-neutral-50/70 p-2.5 rounded-xl border border-neutral-100/80">
                    {doc.content || '(Empty document)'}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-neutral-100">
                    <div className="flex items-center gap-1.5">
                      {!isCurrent ? (
                        <button
                          onClick={() => {
                            onSelectDocument(doc);
                            onClose();
                          }}
                          className="bg-neutral-900 hover:bg-black text-white px-3 py-1 rounded-full font-medium transition shadow-sm"
                        >
                          Open
                        </button>
                      ) : (
                        <span className="text-neutral-400 text-xs px-2 py-1 font-mono">
                          Currently open
                        </span>
                      )}
                      <button
                        onClick={() => handleCopy(doc.id, doc.content)}
                        className="bg-white/80 hover:bg-white text-neutral-700 px-3 py-1 rounded-full border border-neutral-200/60 transition shadow-sm"
                      >
                        {copiedId === doc.id ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="bg-white/80 hover:bg-white text-neutral-700 px-3 py-1 rounded-full border border-neutral-200/60 transition shadow-sm"
                      >
                        Download .txt
                      </button>
                    </div>

                    {documents.length > 1 && (
                      <button
                        onClick={() => onDeleteDocument(doc.id)}
                        className="text-neutral-400 hover:text-rose-600 text-[11px] transition"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-neutral-200/40 px-6 py-3 bg-white/30 text-[11px] font-mono text-neutral-400 flex items-center justify-between">
          <span>{documents.length} document{documents.length > 1 ? 's' : ''} stored locally</span>
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
