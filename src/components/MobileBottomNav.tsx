import React, { useState } from 'react';
import { 
  BarChart3, 
  Shield, 
  Factory, 
  Cpu, 
  Handshake, 
  MoreHorizontal, 
  Award, 
  Swords, 
  Eye, 
  Save, 
  Terminal,
  X
} from 'lucide-react';
import { ViewTab } from '../types';
import { Language, t } from '../utils/localization';

interface MobileBottomNavProps {
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  lang: Language;
  unreadBattlesCount: number;
  availableMissionsCount: number;
  onOpenSaveModal: () => void;
  onOpenDevConsole: () => void;
  isDevMode: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  lang,
  unreadBattlesCount,
  availableMissionsCount,
  onOpenSaveModal,
  onOpenDevConsole,
  isDevMode
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const mainTabs: Array<{ tab: ViewTab; icon: React.ReactNode; labelKey: string }> = [
    { tab: 'OVERVIEW', icon: <BarChart3 className="w-5 h-5" />, labelKey: 'overview' },
    { tab: 'MILITARY', icon: <Shield className="w-5 h-5 text-rose-400" />, labelKey: 'military' },
    { tab: 'ECONOMY', icon: <Factory className="w-5 h-5 text-amber-400" />, labelKey: 'economy' },
    { tab: 'RESEARCH', icon: <Cpu className="w-5 h-5 text-cyan-400" />, labelKey: 'research' },
    { tab: 'DIPLOMACY', icon: <Handshake className="w-5 h-5 text-emerald-400" />, labelKey: 'diplomacy' }
  ];

  const secondaryTabs: Array<{ tab: ViewTab; icon: React.ReactNode; labelKey: string; badge?: number }> = [
    { tab: 'WAR_ROOM', icon: <Swords className="w-5 h-5 text-red-500" />, labelKey: 'war_room', badge: unreadBattlesCount },
    { tab: 'MISSIONS', icon: <Award className="w-5 h-5 text-yellow-400" />, labelKey: 'missions', badge: availableMissionsCount },
    { tab: 'GENERALS', icon: <Award className="w-5 h-5 text-amber-400" />, labelKey: 'generals' },
    { tab: 'INTELLIGENCE', icon: <Eye className="w-5 h-5 text-indigo-400" />, labelKey: 'intelligence' }
  ];

  const handleSelectMoreItem = (tab: ViewTab) => {
    setIsMoreMenuOpen(false);
    onSelectTab(tab);
  };

  const hasSecondaryBadge = unreadBattlesCount > 0 || availableMissionsCount > 0;

  return (
    <>
      {/* Slide-up "More" Command Sheet */}
      {isMoreMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col justify-end md:hidden animate-in fade-in"
          onClick={() => setIsMoreMenuOpen(false)}
        >
          <div 
            className="w-full bg-slate-950 border-t border-slate-800 rounded-t-2xl p-4 space-y-3 font-mono shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Grab handle */}
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-2" />

            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                {t('more_tabs', lang)} · Command Panels
              </span>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1 rounded bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {secondaryTabs.map(item => (
                <button
                  key={item.tab}
                  onClick={() => handleSelectMoreItem(item.tab)}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs font-medium text-left rtl:text-right transition-colors relative ${
                    activeTab === item.tab
                      ? 'bg-cyan-950/70 border-cyan-500 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="truncate">{t(item.labelKey, lang)}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto rtl:mr-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}

              {/* Save / Load Button */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenSaveModal();
                }}
                className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-850 text-xs font-medium"
              >
                <Save className="w-5 h-5 text-sky-400" />
                <span>{t('save', lang)} / {t('load', lang)}</span>
              </button>

              {/* Developer Console Button */}
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  onOpenDevConsole();
                }}
                className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs font-medium ${
                  isDevMode 
                    ? 'bg-amber-950/60 border-amber-500/80 text-amber-300' 
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                }`}
              >
                <Terminal className="w-5 h-5 text-amber-400" />
                <span>{t('developer_console', lang)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Tab Bar */}
      <nav 
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 h-16 bg-slate-950/95 border-t border-slate-800 backdrop-blur-md z-30 md:hidden flex items-center justify-around px-1 select-none font-mono"
      >
        {mainTabs.map(item => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => onSelectTab(item.tab)}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-w-[50px] transition-colors relative ${
                isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                {item.icon}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[64px]">
                {t(item.labelKey, lang)}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-5 h-0.5 bg-cyan-400 rounded-full" />
              )}
            </button>
          );
        })}

        {/* More Button */}
        <button
          onClick={() => setIsMoreMenuOpen(prev => !prev)}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-w-[50px] transition-colors relative ${
            isMoreMenuOpen ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <MoreHorizontal className="w-5 h-5" />
            {hasSecondaryBadge && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">
            {t('more_tabs', lang)}
          </span>
        </button>
      </nav>
    </>
  );
};
