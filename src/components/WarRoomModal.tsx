import React from 'react';
import { BattleReport, Country } from '../types';
import { X, Swords, Trophy, Skull, Eye } from 'lucide-react';
import { Language, t } from '../utils/localization';

interface WarRoomModalProps {
  battles: BattleReport[];
  countries: Record<string, Country>;
  onInspectBattle: (report: BattleReport) => void;
  onClose: () => void;
  lang: Language;
}

export const WarRoomModal: React.FC<WarRoomModalProps> = ({
  battles,
  countries,
  onInspectBattle,
  onClose,
  lang
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Swords className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white uppercase">
                {t('war_room', lang)}
              </h2>
              <span className="text-xs text-slate-400">
                {t('archived_engagements', lang)}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Battles Feed */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5 text-xs">
          {battles.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {t('no_recent_battles', lang)}
            </div>
          ) : (
            battles.map(battle => {
              const isAttackerWin = battle.victor === 'ATTACKER';
              return (
                <div
                  key={battle.id}
                  className="p-3 rounded border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-white text-xs">{battle.provinceName}</strong>
                      <span className="text-[10px] text-slate-400">{t('turn', lang)} {battle.turn}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        isAttackerWin ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                      }`}>
                        {battle.victor === 'ATTACKER' ? `${battle.attackerCountryName} · ${t('victory_label', lang)}` : `${battle.defenderCountryName} · ${t('victory_label', lang)}`}
                      </span>
                    </div>

                    <div className="flex gap-4 text-[11px] text-slate-400 mt-1">
                      <span>{t('attacker', lang)}: <strong className="text-cyan-300">{battle.attackerCountryName}</strong> ({battle.attackerPower.toLocaleString()} pwr)</span>
                      <span>{t('versus', lang)}</span>
                      <span>{t('defender', lang)}: <strong className="text-rose-300">{battle.defenderCountryName}</strong> ({battle.defenderPower.toLocaleString()} pwr)</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onInspectBattle(battle)}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto flex-shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t('inspect_dossier', lang)}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
