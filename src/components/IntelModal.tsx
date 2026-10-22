import React from 'react';
import { Country, IntelReport, Province } from '../types';
import { X, Eye, ShieldAlert, Satellite, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Language, t } from '../utils/localization';

interface IntelModalProps {
  intelReports: IntelReport[];
  countries: Record<string, Country>;
  provinces: Record<string, Province>;
  onClose: () => void;
  lang: Language;
}

export const IntelModal: React.FC<IntelModalProps> = ({
  intelReports,
  countries,
  provinces,
  onClose,
  lang
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Eye className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white uppercase">
                {t('intelligence', lang)} · Foreign Signals & Recon Dossiers
              </h2>
              <span className="text-xs text-slate-400">
                Satellite telemetry, troop estimation bounds, and covert counter-intelligence
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reports List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {intelReports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <Satellite className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No Active Intelligence Dossiers</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Select any foreign province on the strategic world map and commission a satellite recon mission to evaluate troop counts, fortifications, and invasion preparations.
              </p>
            </div>
          ) : (
            intelReports.map(report => {
              const targetCountry = countries[report.targetCountryId];
              const targetProv = report.targetProvinceId ? provinces[report.targetProvinceId] : null;

              return (
                <div 
                  key={report.id}
                  className="p-3.5 rounded border border-slate-800 bg-slate-900/60 space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: targetCountry?.color || '#94a3b8' }} />
                      <span className="font-bold text-white text-xs">
                        {targetProv ? targetProv.name : targetCountry?.name}
                      </span>
                      <span className="text-slate-400 text-[11px]">({targetCountry?.name})</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <span>Turn Gathered: <strong className="text-white">{report.turnGathered}</strong></span>
                      <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 font-bold">
                        {t('confidence', lang)}: {report.confidence}%
                      </span>
                    </div>
                  </div>

                  {/* Estimation Metrics */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{t('estimated_forces', lang)}</span>
                      <span className="text-cyan-400 font-bold">
                        ~{report.estimatedTroops.min.toLocaleString()} - {report.estimatedTroops.max.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Estimated Air Wing</span>
                      <span className="text-indigo-400 font-bold">
                        ~{report.estimatedAirpower.min} - {report.estimatedAirpower.max} aircraft
                      </span>
                    </div>

                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{t('economic_health', lang)}</span>
                      <span className={`font-bold ${
                        report.economicStrength === 'BOOMING' ? 'text-emerald-400' :
                        report.economicStrength === 'STABLE' ? 'text-cyan-400' :
                        report.economicStrength === 'STRUGGLING' ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {report.economicStrength}
                      </span>
                    </div>
                  </div>

                  {/* Hostile Intent Warning */}
                  <div className={`p-2 rounded border flex items-center justify-between text-xs ${
                    report.hostileIntentDetected 
                      ? 'bg-red-950/40 border-red-800/80 text-red-300' 
                      : 'bg-emerald-950/30 border-emerald-900/60 text-emerald-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      {report.hostileIntentDetected ? (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                      <span>
                        Hostile Incursion Status: <strong className="uppercase">
                          {report.hostileIntentDetected ? 'Imminent Aggression Detected' : 'Perimeter Secure'}
                        </strong>
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic leading-relaxed">
                    "{report.summary}"
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
