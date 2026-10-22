import React from 'react';
import { Country, MilitaryQueueItem, Province, UnitType } from '../types';
import { UNIT_DEFINITIONS } from '../game/config';
import { X, Shield, Swords, Plane, Anchor, Users, Clock } from 'lucide-react';
import { Language, t } from '../utils/localization';

interface MilitaryModalProps {
  player: Country;
  provinces: Record<string, Province>;
  militaryQueue: MilitaryQueueItem[];
  onClose: () => void;
  lang: Language;
}

export const MilitaryModal: React.FC<MilitaryModalProps> = ({
  player,
  provinces,
  militaryQueue,
  onClose,
  lang
}) => {
  const ownedProvinces = Object.values(provinces).filter(p => p.countryId === player.id);

  // Group all player units
  const unitsByBranch: { LAND: any[]; AIR: any[]; NAVY: any[] } = {
    LAND: [],
    AIR: [],
    NAVY: []
  };

  ownedProvinces.forEach(p => {
    p.units.forEach(u => {
      const def = UNIT_DEFINITIONS[u.type];
      if (def) {
        unitsByBranch[def.branch].push({
          provinceName: p.name,
          unit: u,
          def
        });
      }
    });
  });

  const playerMilQueue = militaryQueue.filter(q => {
    const p = provinces[q.provinceId];
    return p && p.countryId === player.id;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-rose-400" />
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white uppercase">
                {t('military', lang)} · Supreme High Command Order of Battle
              </h2>
              <span className="text-xs text-slate-400">
                Manpower Pool: <strong className="text-rose-300">{player.resources.manpower.toLocaleString()}</strong> · Armed Forces Distribution
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Active Mobilization Queue */}
          <div className="p-3.5 rounded bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-amber-400">
              <Clock className="w-4 h-4" />
              <span className="font-bold text-xs uppercase">Active Production & Recruitment Queues</span>
            </div>
            {playerMilQueue.length === 0 ? (
              <span className="text-slate-500 italic block text-xs">No active regiment recruitment orders. Select an owned province to mobilize forces.</span>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {playerMilQueue.map(item => {
                  const def = UNIT_DEFINITIONS[item.unitType];
                  const prov = provinces[item.provinceId];
                  return (
                    <div key={item.id} className="p-2 rounded bg-slate-950 border border-slate-800 flex justify-between items-center">
                      <div>
                        <strong className="text-white block">{item.count}x {def?.name || item.unitType}</strong>
                        <span className="text-[10px] text-slate-400">Deploying to: {prov?.name}</span>
                      </div>
                      <span className="text-xs font-bold text-amber-400 px-2 py-1 rounded bg-amber-950/40 border border-amber-800/40">
                        {item.turnsRemaining} turns left
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Forces by Branch */}
          {(['LAND', 'AIR', 'NAVY'] as const).map(branch => {
            const list = unitsByBranch[branch];
            const branchIcon = branch === 'LAND' ? <Swords className="w-4 h-4 text-emerald-400" /> :
              branch === 'AIR' ? <Plane className="w-4 h-4 text-indigo-400" /> :
              <Anchor className="w-4 h-4 text-cyan-400" />;

            return (
              <div key={branch} className="p-3.5 rounded bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div className="flex items-center gap-2">
                    {branchIcon}
                    <span className="font-bold text-white text-xs uppercase tracking-wider">{branch} Forces</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {list.reduce((s, item) => s + item.unit.count, 0)} Active Units
                  </span>
                </div>

                {list.length === 0 ? (
                  <span className="text-slate-500 italic block text-[11px]">No active {branch} units currently in service.</span>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {list.map((item, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-950 border border-slate-800/80">
                        <div className="flex justify-between items-center">
                          <strong className="text-white">{item.unit.count}x {item.def.name}</strong>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                          <span>{item.provinceName}</span>
                          <span className="text-cyan-400">ATK {item.def.attack * item.unit.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
