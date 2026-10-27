import React, { useState } from 'react';
import { 
  Province, 
  Country, 
  BuildingType, 
  UnitType, 
  UnitGroup 
} from '../types';
import { BUILDING_DEFINITIONS, UNIT_DEFINITIONS } from '../game/config';
import { 
  X, 
  Hammer, 
  Shield, 
  Swords, 
  Eye, 
  TrendingUp, 
  Layers, 
  Anchor, 
  Plane, 
  ChevronDown, 
  ChevronUp,
  AlertCircle 
} from 'lucide-react';
import { Language, t } from '../utils/localization';
import { useDeviceCategory } from '../hooks/useMediaQuery';

interface SelectedProvincePanelProps {
  province: Province | null;
  onClose: () => void;
  countries: Record<string, Country>;
  provinces: Record<string, Province>;
  playerCountryId: string;
  onQueueBuilding: (provinceId: string, type: BuildingType) => boolean;
  onQueueMilitary: (provinceId: string, type: UnitType, count: number) => boolean;
  onLaunchAttack: (fromProvinceId: string, targetProvinceId: string, unitIds: string[]) => void;
  onDeployRecon: (provinceId: string) => void;
  lang: Language;
  deviceCategory?: 'mobile' | 'tablet' | 'desktop';
}

export const SelectedProvincePanel: React.FC<SelectedProvincePanelProps> = ({
  province,
  onClose,
  countries,
  provinces,
  playerCountryId,
  onQueueBuilding,
  onQueueMilitary,
  onLaunchAttack,
  onDeployRecon,
  lang,
  deviceCategory
}) => {
  const detectedDevice = useDeviceCategory();
  const effectiveCategory = deviceCategory || detectedDevice.category;
  const isMobile = effectiveCategory === 'mobile';
  const isTablet = effectiveCategory === 'tablet';

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BUILD' | 'RECRUIT' | 'ATTACK'>('OVERVIEW');
  const [selectedAttackSourceId, setSelectedAttackSourceId] = useState<string>('');
  const [selectedAttackUnitIds, setSelectedAttackUnitIds] = useState<string[]>([]);
  const [recruitCount, setRecruitCount] = useState<number>(1);
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);

  if (!province) return null;

  const country = countries[province.countryId];
  const playerStock = countries[playerCountryId]?.resources;
  const lacks = (res: string, amount: number) =>
    Boolean(playerStock) && (playerStock![res as keyof typeof playerStock] ?? 0) < amount;

  const runAction = (ok: boolean, okText: string, failText: string) => {
    setActionMsg({ ok, text: ok ? okText : failText });
  };
  const isPlayerOwned = province.countryId === playerCountryId;

  // Neighboring friendly provinces that can launch an attack on this province
  const friendlyNeighbors = province.neighborIds
    .map(id => provinces[id])
    .filter(p => p && p.countryId === playerCountryId && p.units.length > 0);

  const handleToggleAttackUnit = (unitId: string) => {
    setSelectedAttackUnitIds(prev => 
      prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
    );
  };

  const handleSelectSourceProvince = (sourceId: string) => {
    setSelectedAttackSourceId(sourceId);
    const sourceProv = provinces[sourceId];
    if (sourceProv) {
      setSelectedAttackUnitIds(sourceProv.units.map(u => u.id));
    }
  };

  const executeAttack = () => {
    if (!selectedAttackSourceId || selectedAttackUnitIds.length === 0) return;
    onLaunchAttack(selectedAttackSourceId, province.id, selectedAttackUnitIds);
  };

  return (
    <div className={`fixed z-30 flex flex-col overflow-hidden backdrop-blur-md bg-slate-950/95 border border-slate-800 shadow-2xl transition-all duration-200 ${
      isMobile 
        ? 'inset-x-0 bottom-16 rounded-t-2xl max-h-[64vh] text-xs' 
        : isTablet
        ? 'top-14 ltr:right-3 rtl:left-3 w-80 max-h-[82vh] rounded-lg text-xs'
        : 'top-14 ltr:right-4 rtl:left-4 w-96 max-h-[85vh] rounded-lg text-xs'
    }`}>
      {/* Mobile drag handle for drawer menu */}
      {isMobile && (
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto my-1.5 shrink-0" />
      )}
      {/* Header */}
      <div 
        className="px-4 py-2.5 sm:py-3 border-b border-slate-800 flex items-center justify-between"
        style={{ borderTop: `3px solid ${country?.color || '#3b82f6'}` }}
      >
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide text-white">{province.name}</span>
            {province.hasCapital && (
              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-mono rounded">
                {t('capital', lang)}
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-slate-400">
            {country?.name || t('independent_territory', lang)} · {province.terrain}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Action Mode Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-mono bg-slate-900/50">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex-1 py-2 text-center border-b-2 font-medium ${
            activeTab === 'OVERVIEW'
              ? 'border-cyan-400 text-cyan-300 bg-slate-900'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          {t('overview', lang)}
        </button>
        {isPlayerOwned && (
          <>
            <button
              onClick={() => { setActiveTab('BUILD'); setActionMsg(null); }}
              className={`flex-1 py-2 text-center border-b-2 font-medium ${
                activeTab === 'BUILD'
                  ? 'border-amber-400 text-amber-300 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {t('build', lang)}
            </button>
            <button
              onClick={() => { setActiveTab('RECRUIT'); setActionMsg(null); }}
              className={`flex-1 py-2 text-center border-b-2 font-medium ${
                activeTab === 'RECRUIT'
                  ? 'border-emerald-400 text-emerald-300 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {t('mobilize', lang)}
            </button>
          </>
        )}
        {!isPlayerOwned && (
          <button
            onClick={() => {
              setActiveTab('ATTACK');
              if (friendlyNeighbors.length > 0 && !selectedAttackSourceId) {
                handleSelectSourceProvince(friendlyNeighbors[0].id);
              }
            }}
            className={`flex-1 py-2 text-center border-b-2 font-medium ${
              activeTab === 'ATTACK'
                ? 'border-red-500 text-red-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {t('launch_attack', lang)}
          </button>
        )}
      </div>

      {/* Tab Body */}
      <div className="p-3 overflow-y-auto max-h-[60vh] space-y-3 font-mono text-xs">
        {actionMsg && (activeTab === 'BUILD' || activeTab === 'RECRUIT') && (
          <div className={`p-2 rounded border text-[11px] ${actionMsg.ok ? 'bg-emerald-950/50 border-emerald-700 text-emerald-200' : 'bg-red-950/50 border-red-700 text-red-200'}`}>
            {actionMsg.text}
          </div>
        )}
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <>
            {/* Provincial Statistics Matrix */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{t('population', lang)}</span>
                <span className="text-white font-bold text-sm">{province.population}M</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{t('economic_value', lang)}</span>
                <span className="text-emerald-400 font-bold text-sm">{province.economicValue} {t('gdp', lang)}</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{t('defense_level', lang)}</span>
                <span className="text-cyan-400 font-bold text-sm">{t('tier', lang)} {province.defenseLevel} · {t('fort', lang)}</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{t('infrastructure', lang)}</span>
                <span className="text-indigo-400 font-bold text-sm">{province.infrastructure}%</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{t('stability', lang)}</span>
                <span className="text-amber-400 font-bold text-sm">{province.stability}%</span>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">{t('strategic_importance', lang)}</span>
                <span className="text-rose-400 font-bold text-sm">{t('priority', lang)} {province.strategicImportance}/10</span>
              </div>
            </div>

            {/* Strategic Infrastructure facilities */}
            <div className="p-2.5 rounded bg-slate-900/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1.5">
                {t('installed_infrastructure', lang)}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {province.buildings.map(b => (
                  <span key={b.type} className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 text-[11px] border border-slate-700">
                    {BUILDING_DEFINITIONS[b.type]?.name || b.type} ({t('level', lang)} {b.level})
                  </span>
                ))}
                {province.buildings.length === 0 && (
                  <span className="text-slate-500 italic text-[11px]">{t('no_upgraded_complexes', lang)}</span>
                )}
              </div>
            </div>

            {/* Stationed Military Divisions */}
            <div className="p-2.5 rounded bg-slate-900/70 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1.5">
                {t('garrison', lang)}
              </span>
              <div className="space-y-1.5">
                {province.units.map((u, idx) => {
                  const def = UNIT_DEFINITIONS[u.type];
                  return (
                    <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-slate-950/70 border border-slate-800">
                      <div>
                        <span className="text-white font-semibold block">{u.count}x {def?.name || u.type}</span>
                        <div className="flex gap-2 text-[10px] text-slate-400">
                          <span>{lang === 'ar' ? 'المعنويات' : 'Morale'}: {u.morale}%</span>
                          <span>{lang === 'ar' ? 'الإمداد' : 'Supply'}: {u.supply}%</span>
                          <span>{lang === 'ar' ? 'الخبرة' : 'XP'}: {u.experience}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-cyan-400 uppercase">{def?.branch || 'LAND'}</span>
                    </div>
                  );
                })}
                {province.units.length === 0 && (
                  <span className="text-slate-500 italic text-[11px] block">{t('no_units', lang)}</span>
                )}
              </div>
            </div>

            {/* Recon Button if foreign province */}
            {!isPlayerOwned && (
              <button
                onClick={() => onDeployRecon(province.id)}
                className="w-full py-2 px-3 rounded bg-indigo-900/50 hover:bg-indigo-800/60 text-indigo-200 border border-indigo-700/60 font-semibold flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4 text-indigo-400" />
                <span>{t('recon_province', lang)} ($250)</span>
              </button>
            )}
          </>
        )}

        {/* TAB 2: BUILD / COMMISSION BUILDINGS */}
        {activeTab === 'BUILD' && isPlayerOwned && (
          <div className="space-y-2">
            {(Object.keys(BUILDING_DEFINITIONS) as BuildingType[]).map(bType => {
              const bDef = BUILDING_DEFINITIONS[bType];
              const existing = province.buildings.find(b => b.type === bType);
              const currentLevel = existing ? existing.level : 0;
              const isMaxed = currentLevel >= bDef.maxLevel;

              return (
                <div key={bType} className="p-2.5 rounded bg-slate-900/70 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block">{bDef.name}</span>
                        <span className="text-[10px] text-slate-400">{t('level', lang)} {currentLevel}/{bDef.maxLevel}</span>
                    </div>
                    <button
                      disabled={isMaxed}
                      onClick={() => {
                        const ok = onQueueBuilding(province.id, bType);
                        runAction(ok,
                          lang === 'ar' ? 'بدأ البناء.' : 'Construction started.',
                          lang === 'ar' ? 'تعذّر البناء: الموارد غير كافية أو يوجد مشروع قيد التنفيذ.' : 'Cannot build: not enough resources, or a project of this type is already underway.');
                      }}
                      className={`px-3 py-1 rounded font-bold text-xs ${
                        isMaxed 
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                          : 'bg-amber-600 hover:bg-amber-500 text-white'
                      }`}
                    >
                      {isMaxed ? t('max_level', lang) : `${t('upgrade_turns', lang)} (${bDef.baseBuildTurns} ${lang === 'ar' ? 'دورات' : 'turns'})`}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">{bDef.description}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] text-amber-300/80">
                    {Object.entries(bDef.baseCost).map(([res, cost]) => (
                      <span key={res} className={lacks(res, cost || 0) ? 'text-red-400 font-bold' : ''}>{res}: {cost}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: RECRUIT / MOBILIZE REGIMENTS */}
        {activeTab === 'RECRUIT' && isPlayerOwned && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded bg-slate-900/50 border border-slate-800">
              <span className="text-slate-300">{t('regiment_quantity', lang)}</span>
              <div className="flex gap-1.5">
                {[1, 2, 5].map(cnt => (
                  <button
                    key={cnt}
                    onClick={() => setRecruitCount(cnt)}
                    className={`px-2 py-0.5 rounded text-xs ${
                      recruitCount === cnt ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {cnt}x
                  </button>
                ))}
              </div>
            </div>

            {(Object.keys(UNIT_DEFINITIONS) as UnitType[]).map(uType => {
              const uDef = UNIT_DEFINITIONS[uType];
              const isNavalAndNoPort = uDef.branch === 'NAVY' && !province.hasPort && !province.buildings.some(b => b.type === 'port');
              const isAirAndNoBase = uDef.branch === 'AIR' && !province.hasAirbase && !province.buildings.some(b => b.type === 'airport');
              const disabled = isNavalAndNoPort || isAirAndNoBase;

              return (
                <div key={uType} className="p-2.5 rounded bg-slate-900/70 border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block">{uDef.name}</span>
                      <span className="text-[10px] text-slate-400">
                        ATK: {uDef.attack} · DEF: {uDef.defense} · {uDef.branch}
                      </span>
                    </div>
                    <button
                      disabled={disabled}
                      onClick={() => {
                        const ok = onQueueMilitary(province.id, uType, recruitCount);
                        runAction(ok,
                          lang === 'ar' ? 'بدأ التجنيد.' : 'Mobilization ordered.',
                          lang === 'ar' ? 'تعذّر التجنيد: الموارد غير كافية.' : 'Cannot mobilize: not enough resources.');
                      }}
                      className={`px-3 py-1 rounded font-bold text-xs ${
                        disabled
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      {disabled ? (isNavalAndNoPort ? t('port_required', lang) : t('airbase_required', lang)) : `${t('mobilize', lang)} (${uDef.productionTurns}t)`}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">{uDef.description}</p>
                  <div className="flex flex-wrap gap-2 text-[10px] text-emerald-300/80">
                    {Object.entries(uDef.cost).map(([res, cost]) => (
                      <span key={res} className={lacks(res, (cost || 0) * recruitCount) ? 'text-red-400 font-bold' : ''}>{res}: {(cost || 0) * recruitCount}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 4: LAUNCH ATTACK */}
        {activeTab === 'ATTACK' && !isPlayerOwned && (
          <div className="space-y-3">
            {friendlyNeighbors.length === 0 ? (
              <div className="p-3 rounded bg-red-950/40 border border-red-800 text-red-300 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{t('no_border_forces', lang)}</span>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">{t('launch_from_base', lang)}</label>
                  <select
                    value={selectedAttackSourceId}
                    onChange={(e) => handleSelectSourceProvince(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded p-1.5 text-xs font-mono"
                  >
                    {friendlyNeighbors.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.units.reduce((s, u) => s + u.count, 0)} {t('units', lang)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Units in Source Province */}
                {selectedAttackSourceId && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                      {t('select_task_force', lang)}
                    </span>
                    {provinces[selectedAttackSourceId]?.units.map(u => {
                      const def = UNIT_DEFINITIONS[u.type];
                      const isSelected = selectedAttackUnitIds.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => handleToggleAttackUnit(u.id)}
                          className={`p-2 rounded border cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-red-950/50 border-red-500 text-white'
                              : 'bg-slate-900/50 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-xs">{u.count}x {def?.name || u.type}</span>
                            <span className="text-[10px] block text-slate-400">ATK {def?.attack * u.count} · DEF {def?.defense * u.count}</span>
                          </div>
                          <span className={`text-xs font-bold ${isSelected ? 'text-red-400' : 'text-slate-600'}`}>
                            {isSelected ? t('committed', lang) : t('standby', lang)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  disabled={selectedAttackUnitIds.length === 0}
                  onClick={executeAttack}
                  className="w-full py-2.5 rounded bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg"
                >
                  <Swords className="w-4 h-4" />
                  <span>{t('execute_assault', lang)}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
