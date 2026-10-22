import React, { useState } from 'react';
import { GameState, Country, Province } from '../types';
import { 
  X, 
  Terminal, 
  Flame, 
  Coins, 
  Eye, 
  Zap, 
  Cpu, 
  Swords, 
  FastForward, 
  RefreshCw, 
  ShieldAlert, 
  Users 
} from 'lucide-react';
import { Language, t } from '../utils/localization';

interface DevConsoleModalProps {
  state: GameState;
  onClose: () => void;
  onToggleDevMode: () => void;
  onToggleUnlimitedResources: (enabled: boolean) => void;
  onToggleFog: () => void;
  onAddResources: () => void;
  onCompleteResearch: () => void;
  onSpawnStrikeCorps: (provinceId: string) => void;
  onAdvanceTurns: (count: number) => void;
  onSwitchCountry: (countryId: string) => void;
  onTriggerEvent: () => void;
  onResetWorld: () => void;
  lang: Language;
}

export const DevConsoleModal: React.FC<DevConsoleModalProps> = ({
  state,
  onClose,
  onToggleDevMode,
  onToggleUnlimitedResources,
  onToggleFog,
  onAddResources,
  onCompleteResearch,
  onSpawnStrikeCorps,
  onAdvanceTurns,
  onSwitchCountry,
  onTriggerEvent,
  onResetWorld,
  lang
}) => {
  const [selectedProvId, setSelectedProvId] = useState<string>(
    Object.keys(state.provinces)[0] || ''
  );
  const [selectedSwitchCountryId, setSelectedSwitchCountryId] = useState<string>(
    state.playerCountryId
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 backdrop-blur-md select-none font-mono">
      <div className="w-full max-w-3xl bg-slate-950 border border-amber-500/80 rounded-lg shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 border-b border-amber-900/60 bg-amber-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold tracking-wider text-amber-300 uppercase flex items-center gap-2">
                <span>{t('dev_tools_title', lang)}</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px]">
                  OVERRIDE LEVEL 5
                </span>
              </h2>
              <span className="text-[11px] text-amber-200/70">
                Single-Player Sandbox & Developer Diagnostic Console · Ctrl+Shift+D
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-amber-400 hover:text-white rounded hover:bg-amber-900/40">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Console Controls */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Master Dev Mode Toggle */}
          <div className="p-3 rounded bg-amber-950/20 border border-amber-500/40 flex items-center justify-between">
            <div>
              <span className="font-bold text-white block">Developer Mode Sandbox Override</span>
              <span className="text-[11px] text-slate-400">
                Unlocks infinite Gold (∞), testing spawners, instant building, and time manipulation.
              </span>
            </div>
            <button
              onClick={onToggleDevMode}
              className={`px-4 py-1.5 rounded font-bold text-xs uppercase tracking-wider ${
                state.isDevMode 
                  ? 'bg-amber-500 text-slate-950' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              DEV MODE: {state.isDevMode ? 'ENABLED (ON)' : 'DISABLED (OFF)'}
            </button>
          </div>

          {/* Quick Cheat Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Infinite Resources */}
            <button
              onClick={() => onToggleUnlimitedResources(!state.unlimitedResourcesDev)}
              className={`p-3 rounded border text-left flex items-start gap-3 transition-colors ${
                state.unlimitedResourcesDev
                  ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
              }`}
            >
              <Coins className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white text-xs">Toggle Infinite Stockpiles</strong>
                <span className="text-[10px] text-slate-400">
                  Sets Money, Oil, Steel, Food, Manpower to 999,999 and instant build.
                </span>
              </div>
            </button>

            {/* Replenish 50,000 */}
            <button
              onClick={onAddResources}
              className="p-3 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left flex items-start gap-3"
            >
              <Zap className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white text-xs">{t('add_resources', lang)}</strong>
                <span className="text-[10px] text-slate-400">
                  Adds +50k Money, Oil, Steel, Food, Manpower & +2k Tech Points.
                </span>
              </div>
            </button>

            {/* Complete All Tech */}
            <button
              onClick={onCompleteResearch}
              className="p-3 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left flex items-start gap-3"
            >
              <Cpu className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white text-xs">{t('instant_research', lang)}</strong>
                <span className="text-[10px] text-slate-400">
                  Immediately unlocks every doctrine in all 4 technology trees.
                </span>
              </div>
            </button>

            {/* Toggle Fog of War */}
            <button
              onClick={onToggleFog}
              className="p-3 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left flex items-start gap-3"
            >
              <Eye className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white text-xs">{t('toggle_fog', lang)}</strong>
                <span className="text-[10px] text-slate-400">
                  Reveals complete enemy troop disposition on the globe.
                </span>
              </div>
            </button>

            {/* Advance 10 Turns */}
            <button
              onClick={() => onAdvanceTurns(10)}
              className="p-3 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left flex items-start gap-3"
            >
              <FastForward className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white text-xs">{t('advance_10_turns', lang)}</strong>
                <span className="text-[10px] text-slate-400">
                  Simulates economy, AI nations, battles, and construction by 10 turns.
                </span>
              </div>
            </button>

            {/* Trigger Random Crisis */}
            <button
              onClick={onTriggerEvent}
              className="p-3 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left flex items-start gap-3"
            >
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block text-white text-xs">{t('trigger_random_event', lang)}</strong>
                <span className="text-[10px] text-slate-400">
                  Forces a world geopolitical dilemma popup with choice branches.
                </span>
              </div>
            </button>
          </div>

          {/* Spawn Military Strike Corps to Province */}
          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-[11px] text-slate-300 font-bold block">
              Air-Drop Heavy Strike Corps (5x Tanks, 3x Special Ops, 4x Stealth Fighters)
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedProvId}
                onChange={(e) => setSelectedProvId(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 text-white rounded p-1.5 text-xs font-mono"
              >
                {Object.values(state.provinces).map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({state.countries[p.countryId]?.name})
                  </option>
                ))}
              </select>
              <button
                onClick={() => onSpawnStrikeCorps(selectedProvId)}
                className="px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-1.5"
              >
                <Swords className="w-4 h-4" />
                <span>Deploy Corps</span>
              </button>
            </div>
          </div>

          {/* Switch Active Player Nation */}
          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-[11px] text-slate-300 font-bold block">
              {t('switch_country', lang)}
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedSwitchCountryId}
                onChange={(e) => setSelectedSwitchCountryId(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 text-white rounded p-1.5 text-xs font-mono"
              >
                {Object.values(state.countries).map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.aiProfile.personality} doctrine)
                  </option>
                ))}
              </select>
              <button
                onClick={() => onSwitchCountry(selectedSwitchCountryId)}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase"
              >
                Assume Sovereignty
              </button>
            </div>
          </div>

          {/* Scenario Reset */}
          <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
            <span className="text-[10px] text-slate-500">
              Reset entire tactical map state back to Turn 1 initial campaign.
            </span>
            <button
              onClick={onResetWorld}
              className="px-3 py-1.5 rounded bg-red-950/60 hover:bg-red-900/60 border border-red-700 text-red-200 text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('reset_world', lang)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
