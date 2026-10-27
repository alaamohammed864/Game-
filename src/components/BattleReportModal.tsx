import React from 'react';
import { BattleReport } from '../types';
import { X, Swords, Shield, Trophy, Skull, AlertTriangle, Wind } from 'lucide-react';
import { Language, t } from '../utils/localization';

interface BattleReportModalProps {
  report: BattleReport | null;
  onClose: () => void;
  lang: Language;
}

export const BattleReportModal: React.FC<BattleReportModalProps> = ({
  report,
  onClose,
  lang
}) => {
  if (!report) return null;

  const isAttackerWin = report.victor === 'ATTACKER';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 backdrop-blur-sm select-none">
      <div className="w-full max-w-xl bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isAttackerWin ? 'bg-emerald-950/40 border-emerald-800/80' : 'bg-red-950/40 border-red-800/80'
        }`}>
          <div className="flex items-center gap-2.5">
            <Swords className={`w-5 h-5 ${isAttackerWin ? 'text-emerald-400' : 'text-red-400'}`} />
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white uppercase font-mono">
                {t('battle_report_title', lang)}
              </h2>
              <span className="text-xs font-mono text-slate-400">
                {t('theatre', lang)}: {report.provinceName} · {t('turn', lang)} {report.turn}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Victory/Defeat Banner */}
        <div className={`px-4 py-2.5 text-center font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 ${
          isAttackerWin 
            ? 'bg-emerald-600/20 text-emerald-300 border-b border-emerald-900/50' 
            : 'bg-red-600/20 text-red-300 border-b border-red-900/50'
        }`}>
          {isAttackerWin ? <Trophy className="w-4 h-4 text-emerald-400" /> : <Skull className="w-4 h-4 text-red-400" />}
          <span>{report.victor === 'ATTACKER' ? report.attackerCountryName : report.defenderCountryName} · {t('victorious', lang)}</span>
          {report.provinceCaptured && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
              {t('territory_captured_badge', lang)}
            </span>
          )}
        </div>

        {/* Combatant Comparison Grid */}
        <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 font-mono text-xs border-b border-slate-900">
          {/* Attacker */}
          <div className="p-3 rounded bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-white truncate">{report.attackerCountryName}</span>
              <span className="text-[10px] text-cyan-400">{t('attacker_label', lang)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>{t('combat_power', lang)}:</span>
              <span className="font-bold text-cyan-300">{report.attackerPower.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>{t('supply_line', lang)}:</span>
              <span className="text-emerald-400">{report.attackerSupplyPct}%</span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px]">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('casualty_report', lang)}:</span>
              <div className="flex justify-between text-rose-300">
                <span>{t('troops_lost', lang)}:</span>
                <span>-{report.attackerLosses.totalTroops.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-300">
                <span>{t('vehicles_lost', lang)}:</span>
                <span>-{report.attackerLosses.vehicles.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-300">
                <span>{t('aircraft_lost', lang)}:</span>
                <span>-{report.attackerLosses.aircraft.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Defender */}
          <div className="p-3 rounded bg-slate-900/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-white truncate">{report.defenderCountryName}</span>
              <span className="text-[10px] text-rose-400">{t('defender_label', lang)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>{t('combat_power', lang)}:</span>
              <span className="font-bold text-rose-300">{report.defenderPower.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>{t('supply_line', lang)}:</span>
              <span className="text-emerald-400">{report.defenderSupplyPct}%</span>
            </div>
            <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px]">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">{t('casualty_report', lang)}:</span>
              <div className="flex justify-between text-rose-300">
                <span>{t('troops_lost', lang)}:</span>
                <span>-{report.defenderLosses.totalTroops.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-300">
                <span>{t('vehicles_lost', lang)}:</span>
                <span>-{report.defenderLosses.vehicles.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-rose-300">
                <span>{t('aircraft_lost', lang)}:</span>
                <span>-{report.defenderLosses.aircraft.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Strategic Tactical Variables */}
        <div className="px-4 py-3 bg-slate-900/40 border-b border-slate-800 flex items-center justify-around text-xs font-mono">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>{t('terrain', lang)}: <strong className="text-white">{report.terrain}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Wind className="w-4 h-4 text-indigo-400" />
            <span>{t('air_superiority', lang)}: <strong className="text-white">{report.airSuperiority}</strong></span>
          </div>
        </div>

        {/* Tactical Log */}
        <div className="p-4 overflow-y-auto space-y-1.5 font-mono text-xs text-slate-300 bg-slate-950">
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">
            {t('tactical_feed', lang)}
          </span>
          {report.detailsLog.map((log, idx) => (
            <div key={idx} className="flex gap-2 text-[11px]">
              <span className="text-cyan-500">›</span>
              <span>{log}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold"
          >
            {t('acknowledge_report', lang)}
          </button>
        </div>
      </div>
    </div>
  );
};
