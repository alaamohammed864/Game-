import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Save, 
  Globe, 
  Terminal, 
  AlertTriangle, 
  Coins, 
  Droplet, 
  Hammer, 
  Wheat, 
  Zap, 
  Gem, 
  Microchip, 
  Users,
  MoreVertical,
  X
} from 'lucide-react';
import { GameState, ResourceKey } from '../types';
import { Language, t } from '../utils/localization';
import { calculateCountryEconomy } from '../economy/economyEngine';

interface TopBarProps {
  state: GameState;
  activeEventsCount?: number;
  onOpenDirectives?: () => void;
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
  activeEventsCount = 0,
  onOpenDirectives,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    const net = key !== 'gold' ? (balance[key as keyof typeof balance]?.net ?? 0) : 0;
    const isUnlimited = Boolean(
      state.isDevMode && (
        (key === 'gold' && (state.unlimitedGoldDev || state.unlimitedResourcesDev)) ||
        (key !== 'gold' && state.unlimitedResourcesDev)
      )
    );

    return (
      <div 
        className={`flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900/90 border shrink-0 ${
          isCritical 
            ? 'border-red-500/80 bg-red-950/40 text-red-300 animate-pulse' 
            : 'border-slate-800 text-slate-200'
        } text-xs font-mono select-none`}
        title={`${t(labelKey, lang)}: ${value.toLocaleString()} (${net >= 0 ? '+' : ''}${net}/turn)`}
      >
        <span className="text-slate-400 shrink-0">{icon}</span>
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
    <header className="w-full bg-slate-950/95 border-b border-slate-800 z-30 select-none shadow-md backdrop-blur-md">
      {/* Primary Top Bar Row */}
      <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between gap-2">
        {/* Brand, Country & Turn Info */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div 
              className="w-3.5 h-3.5 rounded-sm shrink-0 shadow-sm"
              style={{ backgroundColor: player.color }}
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-wider text-white uppercase flex items-center gap-1 max-w-[120px] sm:max-w-none truncate">
                {player.name}
                {state.isDevMode && (
                  <span className="px-1 py-0.2 text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded font-mono">
                    DEV
                  </span>
                )}
              </span>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-cyan-400/90">
                <span>{t('turn', lang)} {state.currentTurn}</span>
                <span>·</span>
                <span className="text-slate-400 truncate hidden xs:inline">{state.currentDate}</span>
              </div>
            </div>
          </div>

          {/* View Mode Toggle (3D Globe vs 2D Theatre) */}
          <button
            onClick={onToggleViewMode}
            className="flex items-center gap-1 px-2 py-1 text-xs font-mono font-semibold rounded bg-cyan-950/50 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900/60 transition-colors"
            title="Toggle 3D Orbital Globe / 2D Theatre Command"
            aria-label="Toggle View Mode"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px]">{viewMode}</span>
          </button>

          {/* Interactive Directives / Crisis Beacon Button */}
          {activeEventsCount > 0 && onOpenDirectives && (
            <button
              onClick={onOpenDirectives}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/90 border border-red-500 text-red-200 animate-pulse hover:bg-red-900 text-xs font-mono font-bold shadow-lg shadow-red-950/50 cursor-pointer"
              title={t('pending_events', lang)}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="hidden sm:inline">{t('directives', lang)}</span>
              <span className="px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px]">
                {activeEventsCount}
              </span>
            </button>
          )}
        </div>

        {/* Desktop / Tablet Resources strip */}
        <div className="hidden lg:flex items-center gap-1.5 overflow-x-auto py-0.5">
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

        {/* Global Controls & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Pause / Resume Button */}
          <button
            onClick={onTogglePause}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold transition-all shadow-sm ${
              state.isPaused 
                ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse' 
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {state.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{state.isPaused ? t('play', lang) : t('pause', lang)}</span>
          </button>

          {/* Desktop Speed Controls */}
          <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 text-xs font-mono">
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

          {/* Desktop Audio Mute */}
          <button
            onClick={onToggleMute}
            className="hidden md:flex p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            title="Toggle Audio"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Desktop Save / Load */}
          <button
            onClick={onOpenSaveModal}
            className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-mono"
            title={t('save', lang)}
          >
            <Save className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden xl:inline">{t('save', lang)}</span>
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
            className={`hidden md:flex items-center gap-1 px-2 py-1 rounded border text-xs font-mono ${
              state.isDevMode 
                ? 'bg-amber-950/70 border-amber-500 text-amber-300' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title={t('developer_console', lang)}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">DEV</span>
          </button>

          {/* Mobile Quick Menu Hamburger */}
          <button
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            className="md:hidden p-1.5 rounded bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800"
            title={t('quick_menu', lang)}
            aria-label="Toggle Quick Menu"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Horizontal Scrolling Resource Ribbon */}
      <div className="lg:hidden px-2.5 py-1 border-t border-slate-900/80 bg-slate-950/70 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {renderResource('gold', <Coins className="w-3.5 h-3.5 text-yellow-400" />, 'res_gold')}
        {renderResource('money', <span className="font-bold text-emerald-400">$</span>, 'res_money', shortages.money)}
        {renderResource('oil', <Droplet className="w-3.5 h-3.5 text-amber-500" />, 'res_oil', shortages.oil)}
        {renderResource('manpower', <Users className="w-3.5 h-3.5 text-rose-400" />, 'res_manpower')}
        {renderResource('food', <Wheat className="w-3.5 h-3.5 text-lime-400" />, 'res_food', shortages.food)}
        {renderResource('steel', <Hammer className="w-3.5 h-3.5 text-slate-300" />, 'res_steel')}
        {renderResource('energy', <Zap className="w-3.5 h-3.5 text-yellow-300" />, 'res_energy', shortages.energy)}
        {renderResource('rareMaterials', <Gem className="w-3.5 h-3.5 text-indigo-400" />, 'res_rareMaterials')}
        {renderResource('techPoints', <Microchip className="w-3.5 h-3.5 text-cyan-400" />, 'res_techPoints')}
      </div>

      {/* Mobile Quick Menu Dropdown Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden flex justify-end p-3 animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="w-64 bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3 font-mono shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                {t('quick_menu', lang)}
              </span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile Speed Controls */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">
                {t('speed', lang)}:
              </span>
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded p-1">
                {([1, 2, 5] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      onSetSpeed(s);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex-1 py-1 rounded text-xs font-bold ${
                      state.gameSpeed === s ? 'bg-cyan-600 text-white' : 'text-slate-400'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Audio & Save & Dev */}
            <div className="space-y-1 pt-1">
              <button
                onClick={() => {
                  onToggleMute();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-2 rounded bg-slate-900 hover:bg-slate-850 text-xs text-slate-200"
              >
                <span className="flex items-center gap-2">
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  <span>{t('audio', lang)}</span>
                </span>
                <span className="text-[10px] text-slate-400">{isMuted ? 'Muted' : 'Active'}</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenSaveModal();
                }}
                className="w-full flex items-center gap-2 p-2 rounded bg-slate-900 hover:bg-slate-850 text-xs text-slate-200"
              >
                <Save className="w-4 h-4 text-sky-400" />
                <span>{t('save', lang)} / {t('load', lang)}</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenDevConsole();
                }}
                className={`w-full flex items-center gap-2 p-2 rounded text-xs ${
                  state.isDevMode ? 'bg-amber-950/70 border border-amber-500/60 text-amber-300' : 'bg-slate-900 text-slate-200'
                }`}
              >
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>{t('developer_console', lang)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
