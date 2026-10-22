import React, { useEffect, useState } from 'react';
import { GameState } from '../types';
import { storage, SaveMetadata } from '../storage/db';
import { X, Save, Download, Upload, Trash2, FolderOpen, Clock } from 'lucide-react';
import { Language, t } from '../utils/localization';

interface SaveLoadModalProps {
  currentState: GameState;
  onLoadState: (loaded: GameState) => void;
  onClose: () => void;
  lang: Language;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
  currentState,
  onLoadState,
  onClose,
  lang
}) => {
  const [saves, setSaves] = useState<SaveMetadata[]>([]);
  const [newSaveName, setNewSaveName] = useState<string>('');
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [showImportArea, setShowImportArea] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  const refreshSaves = async () => {
    const list = await storage.listSaves();
    setSaves(list);
  };

  useEffect(() => {
    refreshSaves();
  }, []);

  const handleCreateSave = async () => {
    const name = newSaveName.trim() || `Campaign Turn ${currentState.currentTurn}`;
    const slotId = `slot_${Date.now()}`;
    const ok = await storage.saveGame(slotId, name, currentState);
    if (ok) {
      setNewSaveName('');
      setStatusMsg('Game saved successfully.');
      refreshSaves();
    } else {
      setStatusMsg('Error saving game.');
    }
  };

  const handleLoadSlot = async (slotId: string) => {
    const loaded = await storage.loadGame(slotId);
    if (loaded) {
      onLoadState(loaded);
      onClose();
    } else {
      setStatusMsg('Error loading save slot.');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    await storage.deleteSave(slotId);
    refreshSaves();
  };

  const handleExportJson = () => {
    const jsonStr = storage.exportSaveJson(currentState);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GlobalCommand_Save_Turn_${currentState.currentTurn}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = () => {
    if (!importJsonText.trim()) return;
    const parsed = storage.importSaveJson(importJsonText);
    if (parsed) {
      onLoadState(parsed);
      onClose();
    } else {
      setStatusMsg('Invalid save JSON file structure.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-2xl bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Save className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white uppercase">
                Campaign Persistence Vault
              </h2>
              <span className="text-xs text-slate-400">
                IndexedDB Local Storage & JSON Military Archives
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Prompt */}
        {statusMsg && (
          <div className="px-4 py-2 bg-cyan-950/60 border-b border-cyan-800 text-cyan-200 text-xs">
            {statusMsg}
          </div>
        )}

        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Create New Save Slot */}
          <div className="p-3 rounded bg-slate-900/70 border border-slate-800 space-y-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Record New Campaign Checkpoint
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Name your save checkpoint..."
                value={newSaveName}
                onChange={(e) => setNewSaveName(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 text-white rounded px-3 py-1.5 text-xs font-mono"
              />
              <button
                onClick={handleCreateSave}
                className="px-4 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* Existing Save Slots */}
          <div className="space-y-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              Stored Campaign Slots
            </span>
            {saves.length === 0 ? (
              <div className="p-4 rounded bg-slate-900/40 text-center text-slate-500 text-xs">
                No archived saves recorded yet.
              </div>
            ) : (
              saves.map(s => (
                <div
                  key={s.id}
                  className={`p-3 rounded border flex items-center justify-between ${
                    s.isAutosave
                      ? 'bg-indigo-950/30 border-indigo-900/60'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-white text-xs">{s.name}</strong>
                      {s.isAutosave && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px]">
                          AUTOSAVE
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 text-[10px] text-slate-400 mt-0.5">
                      <span>Turn {s.turn} ({s.date})</span>
                      <span>·</span>
                      <span>{s.playerCountryName}</span>
                      <span>·</span>
                      <span>{new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLoadSlot(s.id)}
                      className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-1"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Load</span>
                    </button>
                    {!s.isAutosave && (
                      <button
                        onClick={() => handleDeleteSlot(s.id)}
                        className="p-1.5 rounded bg-slate-800 hover:bg-red-900 text-slate-400 hover:text-red-200"
                        title="Delete slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Export / Import JSON Options */}
          <div className="pt-2 border-t border-slate-900 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <button
                onClick={handleExportJson}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1.5 text-xs font-mono"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Export Save File (JSON)</span>
              </button>
              <button
                onClick={() => setShowImportArea(!showImportArea)}
                className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1.5 text-xs font-mono"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>Import JSON</span>
              </button>
            </div>

            {showImportArea && (
              <div className="p-3 rounded bg-slate-900/70 border border-slate-800 space-y-2 mt-2">
                <textarea
                  rows={4}
                  placeholder="Paste raw save JSON code here..."
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded p-2 text-[10px] font-mono"
                />
                <button
                  onClick={handleImportJson}
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  Load Pasted Save
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
