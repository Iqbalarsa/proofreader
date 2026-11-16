'use client';

import React, { useState } from 'react';
import { AppSettings } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus('Pinging server endpoint...');
    const startTime = Date.now();

    try {
      const endpoint =
        localSettings.engineMode === 'public'
          ? 'https://api.languagetool.org/v2/check'
          : localSettings.engineMode === 'docker'
          ? 'http://localhost:8010/v2/check'
          : localSettings.customEndpoint;

      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'This is a test sentence.',
          language: 'en-US',
          customEndpoint: endpoint,
        }),
      });

      const latency = Date.now() - startTime;
      if (res.ok) {
        setTestStatus(`✓ Connected successfully! Latency: ${latency}ms.`);
      } else {
        const data = await res.json().catch(() => ({}));
        setTestStatus(
          `Failed (${res.status}): ${data.error || 'Server did not respond.'}`
        );
      }
    } catch (err: unknown) {
      setTestStatus(`Network error: ${(err as Error)?.message || 'Could not connect'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-md select-none">
      <div className="liquid-glass rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-white/80">
        {/* Header */}
        <div className="border-b border-neutral-200/50 px-6 py-4 flex items-center justify-between bg-white/40">
          <div>
            <h2 className="font-semibold text-base text-neutral-900 tracking-tight">
              Engine & Processing Settings
            </h2>
            <p className="text-xs text-neutral-500 font-sans mt-0.5">
              Configure rule-based LanguageTool endpoints and checking behaviors.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs rounded-full bg-white/80 hover:bg-white text-neutral-600 hover:text-neutral-900 border border-neutral-200/60 shadow-sm transition"
          >
            Close
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-neutral-800">
          {/* Section 1: Grammar Engine Endpoint */}
          <div className="space-y-3">
            <div className="font-medium text-sm text-neutral-900 border-b border-neutral-200/60 pb-1">
              Grammar & Proofreading Engine
            </div>
            <p className="text-neutral-600 leading-relaxed">
              Choose the LanguageTool server endpoint. The public endpoint is free with no API key needed. For complete manuscript confidentiality, run a local Docker container.
            </p>

            <div className="space-y-2 mt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="engineMode"
                  checked={localSettings.engineMode === 'public'}
                  onChange={() =>
                    setLocalSettings({
                      ...localSettings,
                      engineMode: 'public',
                      customEndpoint: 'https://api.languagetool.org/v2/check',
                    })
                  }
                  className="mt-0.5 accent-neutral-900"
                />
                <div>
                  <div className="font-medium text-neutral-900">
                    Official Public Endpoint (Default)
                  </div>
                  <div className="text-[11px] font-mono text-neutral-500">
                    https://api.languagetool.org/v2/check (Zero registration)
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="engineMode"
                  checked={localSettings.engineMode === 'docker'}
                  onChange={() =>
                    setLocalSettings({
                      ...localSettings,
                      engineMode: 'docker',
                      customEndpoint: 'http://localhost:8010/v2/check',
                    })
                  }
                  className="mt-0.5 accent-neutral-900"
                />
                <div>
                  <div className="font-medium text-neutral-900">
                    Local Docker Container (Offline / Private)
                  </div>
                  <div className="text-[11px] font-mono text-neutral-500">
                    http://localhost:8010/v2/check
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="engineMode"
                  checked={localSettings.engineMode === 'custom'}
                  onChange={() =>
                    setLocalSettings({ ...localSettings, engineMode: 'custom' })
                  }
                  className="mt-0.5 accent-neutral-900"
                />
                <div className="flex-1">
                  <div className="font-medium text-neutral-900">
                    Custom Server URL
                  </div>
                  {localSettings.engineMode === 'custom' && (
                    <input
                      type="text"
                      value={localSettings.customEndpoint}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          customEndpoint: e.target.value,
                        })
                      }
                      placeholder="http://your-server-ip:8010/v2/check"
                      className="mt-1 w-full bg-white/80 border border-neutral-300 rounded-full px-3 py-1 text-xs font-mono"
                    />
                  )}
                </div>
              </label>
            </div>

            {/* Test Connection Button */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="bg-white/80 hover:bg-white text-neutral-800 border border-neutral-300/80 px-3 py-1.5 rounded-full font-medium transition shadow-sm disabled:opacity-50"
              >
                {isTesting ? 'Pinging...' : 'Test Connection'}
              </button>
              {testStatus && (
                <span
                  className={`font-mono text-[11px] ${
                    testStatus.startsWith('✓')
                      ? 'text-neutral-900 font-semibold'
                      : 'text-rose-600'
                  }`}
                >
                  {testStatus}
                </span>
              )}
            </div>
          </div>

          {/* Section 2: Typing & Auto-Check Behavior */}
          <div className="space-y-3">
            <div className="font-medium text-sm text-neutral-900 border-b border-neutral-200/60 pb-1">
              Automatic Checking
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={localSettings.autoCheck}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    autoCheck: e.target.checked,
                  })
                }
                className="accent-neutral-900 rounded"
              />
              <span>
                Automatically check text when typing pauses (1.5s debounce)
              </span>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-neutral-200/40 px-6 py-3 bg-white/30 text-xs flex items-center justify-between">
          <button
            onClick={onClose}
            className="bg-white/80 hover:bg-white text-neutral-600 px-3.5 py-1.5 rounded-full border border-neutral-200/60 transition shadow-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-neutral-900 hover:bg-black text-white px-4 py-1.5 rounded-full font-medium transition shadow-sm"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
