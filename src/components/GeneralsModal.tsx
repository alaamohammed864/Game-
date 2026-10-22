import React, { useState } from 'react';
import { Country, General, Province } from '../types';
import { 
  X, 
  Award, 
  Shield, 
  Crosshair, 
  Flame, 
  MapPin, 
  Zap, 
  ArrowUpCircle, 
  Plane, 
  Truck, 
  CheckCircle,
  Rocket
} from 'lucide-react';
import { Language, t } from '../utils/localization';

interface GeneralsModalProps {
  player: Country;
  provinces: Record<string, Province>;
  onAssignGeneral: (generalId: string, provinceId: string | null) => void;
  onPromoteGeneral: (generalId: string) => boolean;
  onLaunchBallisticMissile: (targetProvinceId: string) => { success: boolean; intercepted: boolean; damageDealt: number; message: string };
  onClose: () => void;
  lang: Language;
}

export const GeneralsModal: React.FC<GeneralsModalProps> = ({
  player,
  provinces,
  onAssignGeneral,
  onPromoteGeneral,
  onLaunchBallisticMissile,
  onClose,
  lang
}) => {
  const [selectedTargetProvinceId, setSelectedTargetProvinceId] = useState<string>(
    Object.keys(provinces).find(id => provinces[id].countryId !== player.id) || ''
  );
  const [missileLog, setMissileLog] = useState<{ text: string; success: boolean } | null>(null);

  const ownedProvinces = Object.values(provinces).filter(p => p.countryId === player.id);
  const foreignProvinces = Object.values(provinces).filter(p => p.countryId !== player.id);

  const getGeneralIcon = (spec: General['specialization']) => {
    switch (spec) {
      case 'ARMOR_SPEARHEAD':
        return <Crosshair className="w-5 h-5 text-amber-400" />;
      case 'AIR_SUPERIORITY':
        return <Plane className="w-5 h-5 text-indigo-400" />;
      case 'SIEGE_FORTRESS':
        return <Shield className="w-5 h-5 text-emerald-400" />;
      default:
        return <Truck className="w-5 h-5 text-cyan-400" />;
    }
  };

  const handleLaunchStrike = () => {
    if (!selectedTargetProvinceId) return;
    const res = onLaunchBallisticMissile(selectedTargetProvinceId);
    setMissileLog({ text: res.message, success: res.success });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-yellow-400" />
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white uppercase">
                {lang === 'ar' ? 'هيئة الأركان والجنرالات والقوة الاستراتيجية' : 'SUPREME HIGH COMMAND · GENERALS & STRATEGIC ARSENAL'}
              </h2>
              <span className="text-xs text-slate-400">
                {lang === 'ar' 
                  ? `الرصيد الاستراتيجي: ${player.ballisticMissiles} صواريخ باليستية جاهزة للإطلاق` 
                  : `Strategic Reserves: ${player.ballisticMissiles} Ballistic Warheads Armed`}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Ballistic Missile Deep Strike Console */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-red-950/40 to-slate-900 border border-red-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-red-400 animate-pulse" />
                <div>
                  <strong className="text-white text-xs uppercase block">
                    {lang === 'ar' ? 'منظومة الصواريخ الباليستية التكتيكية' : 'TACTICAL BALLISTIC MISSILE STRIKE'}
                  </strong>
                  <span className="text-[10px] text-slate-400">
                    {lang === 'ar' ? 'ضربة استراتيجية بعيدة المدى لتدمير تحصينات العدو وتكبيده خسائر فادحة' : 'Deep-strike warheads targeting hostile fortified sectors across the globe'}
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 rounded bg-red-950 text-red-300 border border-red-700 font-bold text-xs">
                {player.ballisticMissiles || 0} {lang === 'ar' ? 'صواريخ مسلحة' : 'ARMED'}
              </span>
            </div>

            {missileLog && (
              <div className={`p-2.5 rounded border text-xs ${
                missileLog.success ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200' : 'bg-red-950/60 border-red-500 text-red-200'
              }`}>
                {missileLog.text}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <select
                value={selectedTargetProvinceId}
                onChange={(e) => setSelectedTargetProvinceId(e.target.value)}
                className="flex-1 w-full bg-slate-950 border border-slate-700 text-white rounded p-2 text-xs font-mono"
              >
                {foreignProvinces.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.units.reduce((s, u) => s + u.count, 0)} units · Tier {p.defenseLevel} Fort)
                  </option>
                ))}
              </select>

              <button
                disabled={(player.ballisticMissiles || 0) <= 0}
                onClick={handleLaunchStrike}
                className="w-full sm:w-auto px-5 py-2 rounded bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
              >
                <Rocket className="w-4 h-4" />
                <span>{lang === 'ar' ? 'إطلاق الضربة الصاروخية' : 'LAUNCH WARHEAD'}</span>
              </button>
            </div>
          </div>

          {/* Sovereign Generals List */}
          <div className="space-y-3">
            <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider block">
              {lang === 'ar' ? 'قادة الجيوش والجنرالات الميدانيون:' : 'SOVEREIGN GENERALS & FIELD MARSHALS:'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(player.generals || []).map(general => {
                const assignedProv = general.assignedProvinceId ? provinces[general.assignedProvinceId] : null;

                return (
                  <div
                    key={general.id}
                    className="p-3.5 rounded border border-slate-800 bg-slate-900/70 flex flex-col justify-between gap-3 shadow"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2.5">
                          <span className="p-1.5 rounded bg-slate-950 border border-slate-800">
                            {getGeneralIcon(general.specialization)}
                          </span>
                          <div>
                            <strong className="text-white text-xs block">{general.name}</strong>
                            <span className="text-[10px] text-cyan-400 font-bold">
                              {lang === 'ar' ? general.specializationLabel : general.title}
                            </span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-bold text-[10px]">
                          RANK {general.level}
                        </span>
                      </div>

                      {/* Buffs stats */}
                      <div className="grid grid-cols-3 gap-2 py-2 text-[10px] text-slate-300">
                        <div className="p-1 rounded bg-slate-950 border border-slate-900 text-center">
                          <span className="text-slate-500 block">ATK BUFF</span>
                          <span className="text-emerald-400 font-bold">+{(general.attackBonus * 100).toFixed(0)}%</span>
                        </div>
                        <div className="p-1 rounded bg-slate-950 border border-slate-900 text-center">
                          <span className="text-slate-500 block">DEF BUFF</span>
                          <span className="text-cyan-400 font-bold">+{(general.defenseBonus * 100).toFixed(0)}%</span>
                        </div>
                        <div className="p-1 rounded bg-slate-950 border border-slate-900 text-center">
                          <span className="text-slate-500 block">MOBILITY</span>
                          <span className="text-amber-400 font-bold">+{(general.speedBonus * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Assignment Selector */}
                    <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400">
                          {lang === 'ar' ? 'الجبهة المُعين عليها:' : 'Assigned Command Post:'}
                        </span>
                        <strong className="text-white">
                          {assignedProv ? assignedProv.name : (lang === 'ar' ? 'الاحتياطي العام (غير معين)' : 'Reserve / Unassigned')}
                        </strong>
                      </div>

                      <select
                        value={general.assignedProvinceId || ''}
                        onChange={(e) => onAssignGeneral(general.id, e.target.value || null)}
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded p-1.5 text-xs font-mono"
                      >
                        <option value="">
                          {lang === 'ar' ? 'إبقاء في الاحتياطي العام' : 'Leave in Reserve Pool'}
                        </option>
                        {ownedProvinces.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.units.reduce((s, u) => s + u.count, 0)} units)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
