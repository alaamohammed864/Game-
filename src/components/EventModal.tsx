import React from 'react';
import { GameEvent, GameState } from '../types';
import { AlertCircle, Flame, Sparkles, TrendingUp, ShieldAlert } from 'lucide-react';
import { Language } from '../utils/localization';

interface EventModalProps {
  event: GameEvent | null;
  state: GameState;
  onResolveOption: (optionIndex: number) => void;
  lang: Language;
}

export const EventModal: React.FC<EventModalProps> = ({
  event,
  state,
  onResolveOption,
  lang
}) => {
  if (!event) return null;

  const getSeverityStyle = (severity: GameEvent['severity']) => {
    switch (severity) {
      case 'BOOM':
        return {
          border: 'border-emerald-500',
          bg: 'bg-emerald-950/40',
          icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
          titleColor: 'text-emerald-300'
        };
      case 'CRISIS':
        return {
          border: 'border-red-600',
          bg: 'bg-red-950/40',
          icon: <Flame className="w-5 h-5 text-red-400" />,
          titleColor: 'text-red-300'
        };
      case 'WARNING':
        return {
          border: 'border-amber-500',
          bg: 'bg-amber-950/40',
          icon: <AlertCircle className="w-5 h-5 text-amber-400" />,
          titleColor: 'text-amber-300'
        };
      default:
        return {
          border: 'border-cyan-500',
          bg: 'bg-cyan-950/40',
          icon: <Sparkles className="w-5 h-5 text-cyan-400" />,
          titleColor: 'text-cyan-300'
        };
    }
  };

  const style = getSeverityStyle(event.severity);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 backdrop-blur-md select-none font-mono">
      <div className={`w-full max-w-xl bg-slate-950 border ${style.border} rounded-lg shadow-2xl overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`p-4 border-b border-slate-800 ${style.bg} flex items-center gap-3`}>
          {style.icon}
          <div>
            <h2 className={`text-sm font-bold tracking-wider uppercase ${style.titleColor}`}>
              GLOBAL GEOPOLITICAL EVENT · {event.severity}
            </h2>
            <span className="text-xs text-slate-400">Turn {state.currentTurn} · Sovereign High Council Directive</span>
          </div>
        </div>

        {/* Narrative Description */}
        <div className="p-4 space-y-3">
          <h3 className="text-base font-bold text-white tracking-wide">
            {event.titleKey}
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {event.descKey}
          </p>
        </div>

        {/* Strategic Decision Choices */}
        <div className="p-4 bg-slate-900/60 border-t border-slate-900 space-y-2.5">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
            Select National Response Policy:
          </span>
          {event.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => onResolveOption(idx)}
              className="w-full p-3 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-400/80 text-left transition-all flex flex-col gap-1 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs group-hover:text-cyan-300">
                  {opt.label}
                </span>
                <span className="text-[10px] text-cyan-400 font-bold uppercase">
                  Execute Policy →
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-normal">
                {opt.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
