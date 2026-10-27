import React from 'react';
import { 
  BarChart3, 
  Shield, 
  Factory, 
  Cpu, 
  Handshake, 
  Eye, 
  Award, 
  Swords, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { ViewTab } from '../types';
import { Language, t } from '../utils/localization';

interface SideNavProps {
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  lang: Language;
  unreadBattlesCount: number;
  availableMissionsCount: number;
}

export const SideNav: React.FC<SideNavProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  lang,
  unreadBattlesCount,
  availableMissionsCount
}) => {
  const navItems: Array<{ tab: ViewTab; icon: React.ReactNode; labelKey: string; badge?: number }> = [
    { tab: 'OVERVIEW', icon: <BarChart3 className="w-4 h-4" />, labelKey: 'overview' },
    { tab: 'MILITARY', icon: <Shield className="w-4 h-4 text-rose-400" />, labelKey: 'military' },
    { tab: 'GENERALS', icon: <Award className="w-4 h-4 text-amber-400" />, labelKey: 'generals' },
    { tab: 'ECONOMY', icon: <Factory className="w-4 h-4 text-amber-400" />, labelKey: 'economy' },
    { tab: 'RESEARCH', icon: <Cpu className="w-4 h-4 text-cyan-400" />, labelKey: 'research' },
    { tab: 'DIPLOMACY', icon: <Handshake className="w-4 h-4 text-emerald-400" />, labelKey: 'diplomacy' },
    { tab: 'INTELLIGENCE', icon: <Eye className="w-4 h-4 text-indigo-400" />, labelKey: 'intelligence' },
    { tab: 'MISSIONS', icon: <Award className="w-4 h-4 text-yellow-400" />, labelKey: 'missions', badge: availableMissionsCount },
    { tab: 'WAR_ROOM', icon: <Swords className="w-4 h-4 text-red-500" />, labelKey: 'war_room', badge: unreadBattlesCount }
  ];

  return (
    <aside 
      className={`hidden md:flex bg-slate-950/90 border-r border-slate-800 transition-all duration-200 z-20 flex-col justify-between select-none ${
        isCollapsed ? 'w-14' : 'w-48 lg:w-56'
      }`}
    >
      <div className="flex flex-col py-2 gap-1">
        {navItems.map(item => {
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => onSelectTab(item.tab)}
              className={`flex items-center gap-3 px-3.5 py-2.5 mx-1 rounded text-xs font-mono font-medium transition-colors relative ${
                isActive
                  ? 'bg-cyan-950/60 text-cyan-300 border-l-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
              }`}
              title={t(item.labelKey, lang)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span>{item.icon}</span>
              {!isCollapsed && (
                <span className="truncate tracking-wide">{t(item.labelKey, lang)}</span>
              )}
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono ${
                  item.tab === 'WAR_ROOM' ? 'bg-red-500 text-white animate-pulse' : 'bg-yellow-500 text-slate-950'
                } ${isCollapsed ? 'absolute top-1 right-1' : 'ml-auto'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse Toggle Button */}
      <div className="p-2 border-t border-slate-900 flex justify-end">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-400 hover:text-white rounded bg-slate-900 hover:bg-slate-800"
          title={t(isCollapsed ? 'expand_navigation' : 'collapse_navigation', lang)}
          aria-label={t(isCollapsed ? 'expand_navigation' : 'collapse_navigation', lang)}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
