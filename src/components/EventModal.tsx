import React from 'react';
import { GameEvent, GameState } from '../types';
import { AlertCircle, Flame, Sparkles, TrendingUp, X, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Language, t } from '../utils/localization';

interface EventModalProps {
  events: GameEvent[];
  activeEventIndex?: number;
  onChangeEventIndex?: (newIndex: number) => void;
  state: GameState;
  onResolveOption: (optionIndex: number, eventIndex?: number) => void;
  onClose: () => void;
  lang: Language;
}

export const EventModal: React.FC<EventModalProps> = ({
  events,
  activeEventIndex = 0,
  onChangeEventIndex,
  state,
  onResolveOption,
  onClose,
  lang
}) => {
  const event = events[activeEventIndex] || events[0];
  if (!event) return null;

  const getSeverityStyle = (severity: GameEvent['severity']) => {
    switch (severity) {
      case 'BOOM':
        return {
          border: 'border-emerald-500/80',
          bg: 'bg-emerald-950/40',
          badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          icon: <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />,
          titleColor: 'text-emerald-300'
        };
      case 'CRISIS':
        return {
          border: 'border-red-600/80',
          bg: 'bg-red-950/40',
          badge: 'bg-red-500/20 text-red-300 border-red-500/40',
          icon: <Flame className="w-5 h-5 text-red-400 shrink-0" />,
          titleColor: 'text-red-300'
        };
      case 'WARNING':
        return {
          border: 'border-amber-500/80',
          bg: 'bg-amber-950/40',
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />,
          titleColor: 'text-amber-300'
        };
      default:
        return {
          border: 'border-cyan-500/80',
          bg: 'bg-cyan-950/40',
          badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          icon: <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />,
          titleColor: 'text-cyan-300'
        };
    }
  };

  const style = getSeverityStyle(event.severity);
  const player = state.countries[state.playerCountryId];
  const freeResources = state.isDevMode && state.unlimitedResourcesDev;
  const canAffordOption = (cost?: Partial<Record<string, number>>) => {
    if (!cost || freeResources || !player) return true;
    return Object.entries(cost).every(([k, v]) => (player.resources[k as keyof typeof player.resources] || 0) >= (v || 0));
  };
  const totalEvents = events.length;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 backdrop-blur-md select-none font-mono"
      role="dialog"
      aria-modal="true"
    >
      <div className={`w-full max-w-xl max-h-[92vh] bg-slate-950 border ${style.border} rounded-xl shadow-2xl overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className={`p-3.5 sm:p-4 border-b border-slate-800 ${style.bg} flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            {style.icon}
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border ${style.badge}`}>
                  {lang === 'ar' ? ({ BOOM: 'فرصة', CRISIS: 'أزمة', WARNING: 'تحذير', INFO: 'معلومة' }[event.severity]) : event.severity} · {t('directives', lang)}
                </span>
                {totalEvents > 1 && (
                  <span className="text-[10px] text-cyan-400 font-bold">
                    ({activeEventIndex + 1}/{totalEvents})
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                {t('turn', lang)} {state.currentTurn} · {state.currentDate}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {totalEvents > 1 && onChangeEventIndex && (
              <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded p-0.5 mr-1">
                <button
                  onClick={() => onChangeEventIndex((activeEventIndex - 1 + totalEvents) % totalEvents)}
                  className="p-1 text-slate-300 hover:text-white rounded"
                  title={lang === 'ar' ? 'التوجيه السابق' : 'Previous Directive'}
                >
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
                </button>
                <button
                  onClick={() => onChangeEventIndex((activeEventIndex + 1) % totalEvents)}
                  className="p-1 text-slate-300 hover:text-white rounded"
                  title={lang === 'ar' ? 'التوجيه التالي' : 'Next Directive'}
                >
                  <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            )}

            {/* Close / Decide Later button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
              title={t('decide_later', lang)}
              aria-label={t('close', lang)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Narrative Description & Context */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          <h3 className="text-base sm:text-lg font-bold text-white tracking-wide leading-snug">
            {t(event.titleKey, lang)}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded-lg border border-slate-800/60">
            {t(event.descKey, lang)}
          </p>

          <div className="pt-2">
            <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider block mb-2">
              {lang === 'ar' ? 'حدد مسار السياسة والاستجابة الوطنية:' : 'SELECT NATIONAL RESPONSE DIRECTIVE:'}
            </span>

            {/* Strategic Decision Choices */}
            <div className="space-y-2.5">
              {event.options.map((opt, idx) => {
                const affordable = canAffordOption(opt.cost);
                return (
                <button
                  key={idx}
                  disabled={!affordable}
                  title={affordable ? undefined : (lang === 'ar' ? 'الموارد غير كافية' : 'Insufficient resources')}
                  onClick={() => onResolveOption(idx, activeEventIndex)}
                  className={`w-full p-3 sm:p-3.5 rounded-lg bg-slate-900 border text-left rtl:text-right transition-all flex flex-col gap-1.5 group ${
                    affordable
                      ? 'hover:bg-slate-850 border-slate-700/80 hover:border-cyan-400 cursor-pointer active:scale-[0.99]'
                      : 'border-red-900/60 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white text-xs sm:text-sm group-hover:text-cyan-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 opacity-70 group-hover:opacity-100" />
                    {t(opt.label, lang)}
                    </span>
                    <span className="text-[10px] text-cyan-400 font-bold uppercase whitespace-nowrap px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
                      {t('execute_policy', lang)} →
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-normal">
                    {t(opt.description, lang)}
                  </p>

                  {(opt.cost || opt.reward || opt.stabilityDelta) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] text-slate-400 border-t border-slate-800/60">
                      {opt.cost && (
                        <span className="text-rose-400">
                          {lang === 'ar' ? 'التكلفة: ' : 'Cost: '}
                          {Object.entries(opt.cost).map(([k, v]) => `${t(`res_${k}`, lang)} -${v}`).join(', ')}
                        </span>
                      )}
                      {opt.reward && (
                        <span className="text-emerald-400">
                          {lang === 'ar' ? 'العائد: ' : 'Reward: '}
                          {Object.entries(opt.reward).map(([k, v]) => `${t(`res_${k}`, lang)} +${v}`).join(', ')}
                        </span>
                      )}
                      {opt.stabilityDelta && (
                        <span className={opt.stabilityDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {lang === 'ar' ? 'الاستقرار: ' : 'Stability: '}
                          {opt.stabilityDelta > 0 ? `+${opt.stabilityDelta}%` : `${opt.stabilityDelta}%`}
                        </span>
                      )}
                    </div>
                  )}
                </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-500">
            {lang === 'ar' ? 'يمكنك تأجيل القرار والرجوع إليه لاحقاً من شريط التوجيهات' : 'You can postpone decision and revisit via Directives badge'}
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            {t('decide_later', lang)}
          </button>
        </div>
      </div>
    </div>
  );
};
