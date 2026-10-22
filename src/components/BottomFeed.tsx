import React, { useState } from 'react';
import { GameNotification } from '../types';
import { Bell, ChevronUp, ChevronDown, Swords, Shield, AlertCircle, Info } from 'lucide-react';
import { Language } from '../utils/localization';

interface BottomFeedProps {
  notifications: GameNotification[];
  onSelectProvince?: (provinceId: string) => void;
  lang: Language;
}

export const BottomFeed: React.FC<BottomFeedProps> = ({
  notifications,
  onSelectProvince,
  lang
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const latestNotif = notifications[0];

  const getIcon = (type: GameNotification['type']) => {
    switch (type) {
      case 'COMBAT':
        return <Swords className="w-3.5 h-3.5 text-red-400" />;
      case 'DIPLOMACY':
        return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
      case 'ECONOMY':
        return <AlertCircle className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Info className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  return (
    <div className="absolute bottom-2 left-2 right-2 sm:left-4 sm:right-auto sm:max-w-xl z-20 font-mono text-xs select-none">
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg shadow-xl overflow-hidden backdrop-blur-md">
        {/* Compact Ticker Bar */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 transition-colors"
        >
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            <span className="p-1 rounded bg-slate-900">
              {latestNotif ? getIcon(latestNotif.type) : <Bell className="w-3.5 h-3.5 text-slate-400" />}
            </span>
            <div className="truncate text-[11px]">
              <strong className="text-white mr-1.5">{latestNotif?.title || 'Radar Quiet'}</strong>
              <span className="text-slate-400">{latestNotif?.message || 'No active operational alerts.'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] text-slate-500 font-bold">
              {notifications.length} ALERTS
            </span>
            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
          </div>
        </div>

        {/* Expanded Notifications Drawer */}
        {isExpanded && (
          <div className="p-3 border-t border-slate-900 max-h-48 overflow-y-auto space-y-2 text-[11px] bg-slate-950">
            {notifications.map(n => (
              <div 
                key={n.id}
                onClick={() => {
                  if (n.provinceId && onSelectProvince) {
                    onSelectProvince(n.provinceId);
                  }
                }}
                className={`p-2 rounded border border-slate-900 bg-slate-900/50 flex items-start gap-2 ${
                  n.provinceId ? 'cursor-pointer hover:border-cyan-500/50' : ''
                }`}
              >
                <span className="mt-0.5">{getIcon(n.type)}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <strong className="text-slate-200">{n.title}</strong>
                    <span className="text-[9px] text-slate-500">Turn {n.turn}</span>
                  </div>
                  <p className="text-slate-400 mt-0.5 leading-snug">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
