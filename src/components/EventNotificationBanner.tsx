import React from 'react';
import { GameEvent } from '../types';
import { Flame, AlertCircle, Sparkles, TrendingUp, X, ArrowRight, ShieldAlert } from 'lucide-react';
import { Language, t } from '../utils/localization';

interface EventNotificationBannerProps {
  event: GameEvent | null;
  onOpenEvent: (event: GameEvent) => void;
  onDismissToast: () => void;
  lang: Language;
}

export const EventNotificationBanner: React.FC<EventNotificationBannerProps> = ({
  event,
  onOpenEvent,
  onDismissToast,
  lang
}) => {
  if (!event) return null;

  const getSeverityStyle = (severity: GameEvent['severity']) => {
    switch (severity) {
      case 'BOOM':
        return {
          border: 'border-emerald-500/70',
          bg: 'bg-emerald-950/90',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />,
          titleColor: 'text-emerald-200'
        };
      case 'CRISIS':
        return {
          border: 'border-red-500/70',
          bg: 'bg-red-950/90',
          badgeBg: 'bg-red-500/20 text-red-300 border-red-500/30',
          icon: <Flame className="w-4 h-4 text-red-400 shrink-0" />,
          titleColor: 'text-red-200'
        };
      case 'WARNING':
        return {
          border: 'border-amber-500/70',
          bg: 'bg-amber-950/90',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />,
          titleColor: 'text-amber-200'
        };
      default:
        return {
          border: 'border-cyan-500/70',
          bg: 'bg-cyan-950/90',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          icon: <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />,
          titleColor: 'text-cyan-200'
        };
    }
  };

  const style = getSeverityStyle(event.severity);

  return (
    <aside 
      aria-label="Geopolitical Directive Alert"
      className="fixed top-14 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-lg transition-all duration-300 animate-in fade-in slide-in-from-top-4 select-none"
    >
      <div className={`p-3 rounded-xl border ${style.border} ${style.bg} backdrop-blur-md shadow-2xl flex flex-col gap-2 font-mono`}>
        {/* Header Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="p-1 rounded bg-black/40 border border-white/10">
              {style.icon}
            </span>
            <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border ${style.badgeBg}`}>
              {event.severity} · {t('directives', lang)}
            </span>
          </div>

          <button
            onClick={onDismissToast}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors"
            title={t('decide_later', lang)}
            aria-label="Dismiss toast"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Title and Excerpt */}
        <div className="space-y-0.5">
          <h4 className={`text-xs sm:text-sm font-bold tracking-wide truncate ${style.titleColor}`}>
            {event.titleKey}
          </h4>
          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
            {event.descKey}
          </p>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/10">
          <button
            onClick={onDismissToast}
            className="px-3 py-1.5 text-[11px] text-slate-300 hover:text-white rounded bg-slate-900/80 hover:bg-slate-800 transition-colors"
          >
            {t('decide_later', lang)}
          </button>

          <button
            onClick={() => onOpenEvent(event)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-bold text-white bg-cyan-600 hover:bg-cyan-500 active:scale-95 rounded shadow transition-all"
          >
            <span>{t('review_directive', lang)}</span>
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          </button>
        </div>
      </div>
    </aside>
  );
};
