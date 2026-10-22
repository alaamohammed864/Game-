import React from 'react';
import { Country, Province } from '../types';
import { X, BarChart3, Shield, Users, Landmark, Award, Swords, TrendingUp } from 'lucide-react';
import { Language, t } from '../utils/localization';

interface OverviewModalProps {
  player: Country;
  provinces: Record<string, Province>;
  countries: Record<string, Country>;
  onClose: () => void;
  lang: Language;
}

export const OverviewModal: React.FC<OverviewModalProps> = ({
  player,
  provinces,
  countries,
  onClose,
  lang
}) => {
  const ownedProvinces = Object.values(provinces).filter(p => p.countryId === player.id);
  const totalPopulation = ownedProvinces.reduce((sum, p) => sum + p.population, 0);
  const totalGdp = ownedProvinces.reduce((sum, p) => sum + p.economicValue, 0);
  const totalDivisions = ownedProvinces.reduce((sum, p) => sum + p.units.reduce((s, u) => s + u.count, 0), 0);
  const averageStability = ownedProvinces.length > 0 
    ? Math.round(ownedProvinces.reduce((sum, p) => sum + p.stability, 0) / ownedProvinces.length)
    : 0;

  const activeWars = Object.values(player.relations).filter(r => r.status === 'WAR');
  const activeAlliances = Object.values(player.relations).filter(r => r.status === 'ALLIANCE');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white uppercase">
                {player.name} · National Command Dossier
              </h2>
              <span className="text-xs text-slate-400">
                Sovereign Score: <strong className="text-cyan-300">{player.score}</strong> · Personality: {player.aiProfile.personality}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Controlled Provinces</span>
              <span className="text-white font-bold text-lg">{ownedProvinces.length} / {Object.keys(provinces).length}</span>
            </div>
            <div className="p-3 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Citizenry</span>
              <span className="text-cyan-400 font-bold text-lg">{totalPopulation.toFixed(1)} Million</span>
            </div>
            <div className="p-3 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Mobilized Divisions</span>
              <span className="text-rose-400 font-bold text-lg">{totalDivisions} Regiments</span>
            </div>
            <div className="p-3 rounded bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Average Stability</span>
              <span className="text-amber-400 font-bold text-lg">{averageStability}%</span>
            </div>
          </div>

          {/* Conflict & Treaties Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Active Theatres of War ({activeWars.length})
              </span>
              {activeWars.length === 0 ? (
                <span className="text-slate-500 italic text-xs">At peace with all sovereign states.</span>
              ) : (
                activeWars.map(w => (
                  <div key={w.targetCountryId} className="flex items-center justify-between p-2 rounded bg-red-950/40 border border-red-900 text-red-200">
                    <span className="font-bold">{countries[w.targetCountryId]?.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">ACTIVE WAR</span>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                Formal Military Alliances ({activeAlliances.length})
              </span>
              {activeAlliances.length === 0 ? (
                <span className="text-slate-500 italic text-xs">No formal defensive treaties ratified.</span>
              ) : (
                activeAlliances.map(a => (
                  <div key={a.targetCountryId} className="flex items-center justify-between p-2 rounded bg-emerald-950/40 border border-emerald-900 text-emerald-200">
                    <span className="font-bold">{countries[a.targetCountryId]?.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">ALLIED</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Combat Statistics */}
          <div className="p-3 rounded bg-slate-900/70 border border-slate-800 flex items-center justify-around text-center">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Casualties Inflicted</span>
              <span className="text-emerald-400 font-bold text-base">{player.totalKills.toLocaleString()} troops</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Friendly Losses</span>
              <span className="text-rose-400 font-bold text-base">{player.totalLosses.toLocaleString()} troops</span>
            </div>
            <div className="w-px h-8 bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Tech Breakthroughs</span>
              <span className="text-cyan-400 font-bold text-base">{player.completedTechs.length} Unlocked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
