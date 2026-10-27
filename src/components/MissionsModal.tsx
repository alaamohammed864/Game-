import React from 'react';
import { Mission, ResourceKey } from '../types';
import { X, Award, CheckCircle, Gift, Sparkles } from 'lucide-react';
import { Language, t } from '../utils/localization';

const MISSION_TRANSLATION_KEYS: Record<string, [string, string]> = {
  mission_industrial_giant: ['mission_industrial_title', 'mission_industrial_desc'],
  mission_strategic_territory: ['mission_territory_title', 'mission_territory_desc'],
  mission_tech_mastery: ['mission_tech_title', 'mission_tech_desc'],
  mission_coalition_architect: ['mission_alliance_title', 'mission_alliance_desc'],
  mission_oil_autarky: ['mission_oil_title', 'mission_oil_desc'],
};

interface MissionsModalProps {
  missions: Mission[];
  onClaimReward: (missionId: string) => void;
  onClose: () => void;
  lang: Language;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  missions,
  onClaimReward,
  onClose,
  lang
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col h-[75vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-yellow-400" />
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white uppercase">
                {t('missions', lang)}
              </h2>
              <span className="text-xs text-slate-400">
                {lang === 'ar' ? 'أكمل الأهداف الاستراتيجية للحصول على الذهب والموارد والمكافآت.' : 'Complete strategic objectives to earn gold, resources, and rewards.'}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mission List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {missions.map(mission => {
            const pct = Math.min(100, Math.round((mission.progress / mission.goal) * 100));
            const translationKeys = MISSION_TRANSLATION_KEYS[mission.id];

            return (
              <div
                key={mission.id}
                className={`p-3.5 rounded border transition-all ${
                  mission.isClaimed
                    ? 'bg-slate-900/30 border-slate-800/60 opacity-60'
                    : mission.isCompleted
                    ? 'bg-yellow-950/40 border-yellow-500/80 shadow-lg'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-white text-xs flex items-center gap-2">
                      <span>{translationKeys ? t(translationKeys[0], lang) : mission.titleKey}</span>
                      {mission.isCompleted && !mission.isClaimed && (
                        <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[10px] font-bold animate-pulse">
                          {t('ready_to_claim', lang)}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      {translationKeys ? t(translationKeys[1], lang) : mission.descKey}
                    </p>
                  </div>

                  {/* Reward Action */}
                  {mission.isCompleted && !mission.isClaimed && (
                    <button
                      onClick={() => onClaimReward(mission.id)}
                      className="px-3.5 py-1.5 rounded bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs uppercase flex items-center gap-1.5 shadow-md flex-shrink-0"
                    >
                      <Gift className="w-4 h-4" />
                      <span>{t('claim_bounty', lang)}</span>
                    </button>
                  )}

                  {mission.isClaimed && (
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 flex-shrink-0">
                      <CheckCircle className="w-4 h-4" />
                      <span>{t('fulfilled', lang)}</span>
                    </span>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{t('progress', lang)}: {mission.progress} / {mission.goal}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded bg-slate-800 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        mission.isCompleted ? 'bg-yellow-400' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Rewards Breakdown */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-3 text-[11px] text-yellow-300/90">
                  <span className="text-slate-400 text-[10px]">{t('rewards', lang)}</span>
                  {Object.entries(mission.rewards).map(([res, val]) => (
                    <span key={res} className="font-bold">
                      +{val} {t(`res_${res}`, lang)}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
