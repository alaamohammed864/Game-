import React, { useState } from 'react';
import { BattleReport, Country, Province } from '../types';
import { Shield, Anchor, Plane, Star, Crosshair, Users, Flame, Droplet, AlertTriangle, Sparkles } from 'lucide-react';
import { evaluateProvinceUnitState, ProvinceUnitState } from '../utils/unitState';

interface Tactical2DMapProps {
  provinces: Record<string, Province>;
  countries: Record<string, Country>;
  selectedProvinceId: string | null;
  onSelectProvince: (provinceId: string) => void;
  playerCountryId: string;
  recentBattles?: BattleReport[];
  currentTurn?: number;
}

export const Tactical2DMap: React.FC<Tactical2DMapProps> = ({
  provinces,
  countries,
  selectedProvinceId,
  onSelectProvince,
  playerCountryId,
  recentBattles = [],
  currentTurn = 1
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [hoveredProvinceId, setHoveredProvinceId] = useState<string | null>(null);

  const provinceList = Object.values(provinces);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden military-grid select-none flex items-center justify-center">
      {/* SVG Animation Keyframes Definition */}
      <style>{`
        @keyframes pulse-combat-ring {
          0% { r: 5.5px; opacity: 0.9; stroke-width: 0.7px; }
          50% { r: 9px; opacity: 0.4; stroke-width: 0.4px; }
          100% { r: 12.5px; opacity: 0; stroke-width: 0.1px; }
        }
        @keyframes pulse-fuel-ring {
          0% { r: 5px; opacity: 0.8; stroke-width: 0.6px; }
          60% { r: 8px; opacity: 0.3; stroke-width: 0.3px; }
          100% { r: 10.5px; opacity: 0; stroke-width: 0.1px; }
        }
        @keyframes pulse-general-halo {
          0% { stroke-opacity: 0.9; stroke-width: 0.5px; }
          50% { stroke-opacity: 0.3; stroke-width: 0.8px; }
          100% { stroke-opacity: 0.9; stroke-width: 0.5px; }
        }
        .anim-combat-pulse {
          animation: pulse-combat-ring 1.8s cubic-bezier(0.2, 0.8, 0.4, 1) infinite;
          transform-origin: center;
        }
        .anim-fuel-pulse {
          animation: pulse-fuel-ring 2.4s ease-out infinite;
          transform-origin: center;
        }
        .anim-general-halo {
          animation: pulse-general-halo 2.0s ease-in-out infinite;
        }
      `}</style>

      {/* HUD Header */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 text-[11px] font-mono text-emerald-400/90 bg-slate-900/80 p-2.5 rounded border border-emerald-900/50 backdrop-blur-sm shadow-lg">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white tracking-wider">THEATRE COMMAND 2D GRID</span>
        </div>
        <div className="text-slate-400">PROJECTION: MERCATOR TACTICAL FLATTENED</div>
        <div className="text-cyan-400 text-[10px]">RADAR STATUS: ACTIVE SITUATIONAL TELEMETRY</div>
        <div className="flex gap-2 mt-1">
          <button 
            onClick={() => setZoom(z => Math.min(1.6, z + 0.15))}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs"
          >
            + ZOOM
          </button>
          <button 
            onClick={() => setZoom(z => Math.max(0.7, z - 0.15))}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs"
          >
            - ZOOM
          </button>
          <button 
            onClick={() => setZoom(1)}
            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs"
          >
            RESET
          </button>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div 
        className="w-full h-full transition-transform duration-200"
        style={{ transform: `scale(${zoom})` }}
      >
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full pointer-events-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Country Gradient fills */}
            {Object.values(countries).map(country => (
              <radialGradient key={country.id} id={`grad_${country.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={country.color} stopOpacity="0.4" />
                <stop offset="100%" stopColor={country.color} stopOpacity="0.05" />
              </radialGradient>
            ))}

            {/* Combat Hazard Crosshatch Pattern */}
            <pattern id="combat-hatch" width="2" height="2" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="2" stroke="rgba(239, 68, 68, 0.4)" strokeWidth="0.5" />
            </pattern>
          </defs>

          {/* Adjacency Lines / Supply Corridors */}
          {provinceList.map(p1 => 
            p1.neighborIds.map(nId => {
              const p2 = provinces[nId];
              if (!p2 || p1.id > p2.id) return null;
              const isFriendly = p1.countryId === p2.countryId;
              return (
                <line
                  key={`${p1.id}-${p2.id}`}
                  x1={p1.mapX}
                  y1={p1.mapY}
                  x2={p2.mapX}
                  y2={p2.mapY}
                  stroke={isFriendly ? 'rgba(56, 189, 248, 0.25)' : 'rgba(239, 68, 68, 0.45)'}
                  strokeWidth={isFriendly ? "0.35" : "0.5"}
                  strokeDasharray={isFriendly ? undefined : "1 1"}
                />
              );
            })
          )}

          {/* Territory Influence Zones & Unit Status Clusters */}
          {provinceList.map(prov => {
            const country = countries[prov.countryId];
            const isSelected = prov.id === selectedProvinceId;
            const isHovered = prov.id === hoveredProvinceId;
            const isPlayerTerritory = prov.countryId === playerCountryId;

            // Compute Situational Unit State
            const unitState = evaluateProvinceUnitState(
              prov,
              countries,
              provinces,
              recentBattles,
              currentTurn
            );

            return (
              <g 
                key={prov.id}
                onClick={() => onSelectProvince(prov.id)}
                onMouseEnter={() => setHoveredProvinceId(prov.id)}
                onMouseLeave={() => setHoveredProvinceId(null)}
                className="cursor-pointer transition-all duration-150"
              >
                {/* 1. Subtle Pulse Rings for Critical Unit States */}
                {unitState.underFire && (
                  <circle
                    cx={prov.mapX}
                    cy={prov.mapY}
                    className="anim-combat-pulse"
                    fill="none"
                    stroke="#ef4444"
                  />
                )}

                {unitState.lowFuel && !unitState.underFire && (
                  <circle
                    cx={prov.mapX}
                    cy={prov.mapY}
                    className="anim-fuel-pulse"
                    fill="none"
                    stroke="#f59e0b"
                  />
                )}

                {unitState.hasGeneral && (
                  <circle
                    cx={prov.mapX}
                    cy={prov.mapY}
                    r={isSelected ? 7.2 : 6.0}
                    className="anim-general-halo"
                    fill="none"
                    stroke="#facc15"
                    strokeDasharray="0.8 0.6"
                  />
                )}

                {/* Base Influence Zone */}
                <circle
                  cx={prov.mapX}
                  cy={prov.mapY}
                  r={isSelected ? 6.5 : isHovered ? 5.5 : 4.5}
                  fill={unitState.underFire ? 'url(#combat-hatch)' : `url(#grad_${prov.countryId})`}
                  stroke={
                    isSelected 
                      ? '#38bdf8' 
                      : unitState.underFire 
                      ? '#ef4444' 
                      : unitState.lowFuel 
                      ? '#f59e0b' 
                      : country?.color || '#64748b'
                  }
                  strokeWidth={isSelected ? '0.7' : unitState.underFire ? '0.6' : isPlayerTerritory ? '0.45' : '0.3'}
                  strokeDasharray={isSelected ? '1 0.5' : undefined}
                />

                {/* Core Province Geographic Dot */}
                <circle
                  cx={prov.mapX}
                  cy={prov.mapY}
                  r={prov.hasCapital ? 1.4 : 0.9}
                  fill={country?.color || '#3b82f6'}
                  stroke="#ffffff"
                  strokeWidth="0.2"
                />

                {/* Province Name Label */}
                <text
                  x={prov.mapX}
                  y={prov.mapY - (prov.hasCapital ? 2.5 : 2.0)}
                  textAnchor="middle"
                  fontSize="1.6"
                  fontWeight="bold"
                  fill={isSelected ? '#38bdf8' : '#e2e8f0'}
                  className="font-mono tracking-wide"
                >
                  {prov.name.split(' ')[0]}
                </text>

                {/* 2. Unit Troop Count & Situational State Indicator Badge */}
                {prov.units.length > 0 && (
                  <g transform={`translate(${prov.mapX + 2.2}, ${prov.mapY - 0.5})`}>
                    {/* Background Chip */}
                    <rect
                      x="0"
                      y="-1.3"
                      width={unitState.statusLabel !== 'READY' ? '7.5' : '4.5'}
                      height="2.6"
                      rx="0.6"
                      fill="#030712"
                      stroke={unitState.statusColor}
                      strokeWidth="0.25"
                    />

                    {/* Troop Count Text */}
                    <text
                      x="2.1"
                      y="0.5"
                      textAnchor="middle"
                      fontSize="1.2"
                      fontWeight="bold"
                      fill="#38bdf8"
                      className="font-mono"
                    >
                      {prov.units.reduce((s, u) => s + u.count, 0)} div
                    </text>

                    {/* State Icon Indicator if not idle ready */}
                    {unitState.underFire && (
                      <g transform="translate(4.6, -0.9)">
                        <rect x="0" y="0" width="2.4" height="1.8" rx="0.3" fill="#7f1d1d" stroke="#ef4444" strokeWidth="0.15" />
                        <text x="1.2" y="1.3" textAnchor="middle" fontSize="1.0" fontWeight="bold" fill="#fca5a5" className="font-mono">
                          FIRE
                        </text>
                      </g>
                    )}

                    {!unitState.underFire && unitState.lowFuel && (
                      <g transform="translate(4.6, -0.9)">
                        <rect x="0" y="0" width="2.4" height="1.8" rx="0.3" fill="#78350f" stroke="#f59e0b" strokeWidth="0.15" />
                        <text x="1.2" y="1.3" textAnchor="middle" fontSize="0.9" fontWeight="bold" fill="#fde68a" className="font-mono">
                          FUEL
                        </text>
                      </g>
                    )}

                    {!unitState.underFire && !unitState.lowFuel && unitState.hasGeneral && (
                      <g transform="translate(4.6, -0.9)">
                        <rect x="0" y="0" width="2.4" height="1.8" rx="0.3" fill="#713f12" stroke="#facc15" strokeWidth="0.15" />
                        <text x="1.2" y="1.3" textAnchor="middle" fontSize="0.9" fontWeight="bold" fill="#fef08a" className="font-mono">
                          GEN
                        </text>
                      </g>
                    )}

                    {!unitState.underFire && !unitState.lowFuel && !unitState.hasGeneral && unitState.entrenched && (
                      <g transform="translate(4.6, -0.9)">
                        <rect x="0" y="0" width="2.4" height="1.8" rx="0.3" fill="#083344" stroke="#06b6d4" strokeWidth="0.15" />
                        <text x="1.2" y="1.3" textAnchor="middle" fontSize="0.9" fontWeight="bold" fill="#a5f3fc" className="font-mono">
                          FORT
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {/* Strategic Node Rings */}
                {prov.hasCapital && (
                  <circle cx={prov.mapX - 2.5} cy={prov.mapY - 1} r="0.8" fill="#facc15" stroke="#000" strokeWidth="0.1" />
                )}
                {prov.hasPort && (
                  <circle cx={prov.mapX - 2.5} cy={prov.mapY + 1} r="0.7" fill="#06b6d4" stroke="#000" strokeWidth="0.1" />
                )}
                {prov.hasAirbase && (
                  <circle cx={prov.mapX} cy={prov.mapY + 2.5} r="0.7" fill="#a855f7" stroke="#000" strokeWidth="0.1" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Situational Awareness Radar Legend */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-3 text-[11px] font-mono bg-slate-900/95 p-2.5 rounded border border-slate-800 backdrop-blur-sm shadow-xl max-w-xl">
        <span className="text-slate-400 font-bold uppercase mr-1">Unit Telemetry:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse inline-block" />
          <span className="text-red-300 font-semibold">Under Fire / Skirmish</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
          <span className="text-amber-300 font-semibold">Low Fuel / Depleted</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
          <span className="text-yellow-300 font-semibold">General Commanded</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
          <span className="text-cyan-300 font-semibold">Entrenched Fort</span>
        </div>
      </div>
    </div>
  );
};
