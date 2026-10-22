import React from 'react';
import { 
  Play, 
  Pause, 
  FastForward, 
  Volume2, 
  VolumeX, 
  Save, 
  Globe, 
  Terminal, 
  ShieldAlert, 
  Flame, 
  Coins, 
  Droplet, 
  Hammer, 
  Wheat, 
  Zap, 
  Gem, 
  Microchip, 
  Users 
} from 'lucide-react';
import { GameState, ResourceKey } from '../types';
import { sound } from '../audio/soundSystem';
import { Language, t } from '../utils/localization';
import { calculateCountryEconomy } from '../economy/economyEngine';

interface TopBarProps {
  state: GameState;
  onTogglePause: () => void;
  onSetSpeed: (speed: 1 | 2 | 5) => void;
  onOpenSaveModal: () => void;
  onOpenDevConsole: () => void;
  lang: Language;
  onToggleLanguage: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  viewMode: '3D' | '2D';
  onToggleViewMode: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  state,
  onTogglePause,
  onSetSpeed,
  onOpenSaveModal,
  onOpenDevConsole,
  lang,
  onToggleLanguage,
  isMuted,
  onToggleMute,
  viewMode,
  onToggleViewMode
}) => {
  const player = state.countries[state.playerCountryId];
  if (!player) return null;

  const { balance, shortages } = calculateCountryEconomy(player, state.provinces, state.countries);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return Math.round(num).toLocaleString();
  };

  const renderResource = (
    key: ResourceKey, 
    icon: React.ReactNode, 
    labelKey: string, 
    isCritical: boolean = false
  ) => {
    const value = player.resources[key];
    const net = balance[key]?.net || 0;
    const isUnlimited = state.isDevMode && key === 'gold';

    return (
      <div 
        className={`flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900/80 border ${
          isCritical 
            ? 'border-red-500/80 bg-red-950/40 text-red-300 animate-pulse' 
            : 'border-slate-800 text-slate-200'
        } text-xs font-mono select-none`}
        title={`${t(labelKey, lang)}: ${value.toLocaleString()} (${net >= 0 ? '+' : ''}${net}/turn)`}
      >
        <span className="text-slate-400">{icon}</span>
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1 font-semibold">
            <span>{isUnlimited ? '∞' : formatNumber(value)}</span>
          </div>
          {key !== 'gold' && (
            <span className={`text-[9px] ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {net >= 0 ? `+${formatNumber(net)}` : formatNumber(net)}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <header className="w-full bg-slate-950/95 border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2 z-30 select-none shadow-md">
      {/* Brand & Date / Turn */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-3.5 h-3.5 rounded-sm"
            style={{ backgroundColor: player.color }}
          />
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-1.5">
              {player.name}
              {state.isDevMode && (
                <span className="px-1.5 py-0.2 text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded font-mono">
                  DEV
                </span>
              )}
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400/90">
              <span>{t('turn', lang)} {state.currentTurn}</span>
              <span>·</span>
              <span className="text-slate-400">{state.currentDate}</span>
            </div>
          </div>
        </div>

        {/* View Mode Toggle (3D Globe vs 2D Theatre) */}
        <button
          onClick={onToggleViewMode}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold rounded bg-cyan-950/50 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900/60 transition-colors"
          title="Toggle 3D Orbital Globe / 2D Theatre Command"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>{viewMode}</span>
        </button>
      </div>

      {/* Main Resource Stockpiles */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
        {renderResource('gold', <Coins className="w-3.5 h-3.5 text-yellow-400" />, 'res_gold')}
        {renderResource('money', <span className="font-bold text-emerald-400">$</span>, 'res_money', shortages.money)}
        {renderResource('oil', <Droplet className="w-3.5 h-3.5 text-amber-500" />, 'res_oil', shortages.oil)}
        {renderResource('steel', <Hammer className="w-3.5 h-3.5 text-slate-300" />, 'res_steel')}
        {renderResource('food', <Wheat className="w-3.5 h-3.5 text-lime-400" />, 'res_food', shortages.food)}
        {renderResource('energy', <Zap className="w-3.5 h-3.5 text-yellow-300" />, 'res_energy', shortages.energy)}
        {renderResource('rareMaterials', <Gem className="w-3.5 h-3.5 text-indigo-400" />, 'res_rareMaterials')}
        {renderResource('techPoints', <Microchip className="w-3.5 h-3.5 text-cyan-400" />, 'res_techPoints')}
        {renderResource('manpower', <Users className="w-3.5 h-3.5 text-rose-400" />, 'res_manpower')}
      </div>

      {/* Time & Global Controls */}
      <div className="flex items-center gap-2">
        {/* Pause/Play */}
        <button
          onClick={onTogglePause}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
            state.isPaused 
              ? 'bg-amber-600 hover:bg-amber-500 text-white' 
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {state.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          <span>{state.isPaused ? t('play', lang) : t('pause', lang)}</span>
        </button>

        {/* Speed Controls */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 text-xs font-mono">
          {([1, 2, 5] as const).map(s => (
            <button
              key={s}
              onClick={() => onSetSpeed(s)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                state.gameSpeed === s 
                  ? 'bg-cyan-600 text-white' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Audio Mute */}
        <button
          onClick={onToggleMute}
          className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
          title="Toggle Audio"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        {/* Save / Load */}
        <button
          onClick={onOpenSaveModal}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-mono"
          title={t('save', lang)}
        >
          <Save className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">{t('save', lang)}</span>
        </button>

        {/* Language Toggle (EN/AR) */}
        <button
          onClick={onToggleLanguage}
          className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-mono font-bold"
          title="Switch Language (English / العربية)"
        >
          {lang === 'en' ? 'عربي' : 'EN'}
        </button>

        {/* Developer Console Button */}
        <button
          onClick={onOpenDevConsole}
          className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-mono ${
            state.isDevMode 
              ? 'bg-amber-950/70 border-amber-500 text-amber-300' 
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
          title={t('developer_console', lang)}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span className="hidden md:inline">DEV</span>
        </button>
      </div>
    </header>
  );
};
