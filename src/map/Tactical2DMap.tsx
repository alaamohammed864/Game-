import React, { useState } from 'react';
import { Country, Province } from '../types';
import { Shield, Anchor, Plane, Star, Crosshair, Users } from 'lucide-react';

interface Tactical2DMapProps {
  provinces: Record<string, Province>;
  countries: Record<string, Country>;
  selectedProvinceId: string | null;
  onSelectProvince: (provinceId: string) => void;
  playerCountryId: string;
}

export const Tactical2DMap: React.FC<Tactical2DMapProps> = ({
  provinces,
  countries,
  selectedProvinceId,
  onSelectProvince,
  playerCountryId
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [hoveredProvinceId, setHoveredProvinceId] = useState<string | null>(null);

  const provinceList = Object.values(provinces);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden military-grid select-none flex items-center justify-center">
      {/* HUD Header */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 text-[11px] font-mono text-emerald-400/90 bg-slate-900/80 p-2.5 rounded border border-emerald-900/50">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-white tracking-wider">THEATRE COMMAND 2D GRID</span>
        </div>
        <div className="text-slate-400">PROJECTION: MERCATOR TACTICAL FLATTENED</div>
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

          {/* Territory Influence Zones */}
          {provinceList.map(prov => {
            const country = countries[prov.countryId];
            const isSelected = prov.id === selectedProvinceId;
            const isHovered = prov.id === hoveredProvinceId;
            const isPlayerTerritory = prov.countryId === playerCountryId;

            return (
              <g 
                key={prov.id}
                onClick={() => onSelectProvince(prov.id)}
                onMouseEnter={() => setHoveredProvinceId(prov.id)}
                onMouseLeave={() => setHoveredProvinceId(null)}
                className="cursor-pointer transition-all duration-150"
              >
                {/* Influence Circle */}
                <circle
                  cx={prov.mapX}
                  cy={prov.mapY}
                  r={isSelected ? 6.5 : isHovered ? 5.5 : 4.5}
                  fill={`url(#grad_${prov.countryId})`}
                  stroke={isSelected ? '#38bdf8' : country?.color || '#64748b'}
                  strokeWidth={isSelected ? '0.7' : isPlayerTerritory ? '0.45' : '0.3'}
                  strokeDasharray={isSelected ? '1 0.5' : undefined}
                />

                {/* Core Province Dot */}
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

                {/* Troop Count Badge */}
                {prov.units.length > 0 && (
                  <g transform={`translate(${prov.mapX + 2.2}, ${prov.mapY - 0.5})`}>
                    <rect
                      x="0"
                      y="-1.2"
                      width="4.2"
                      height="2.4"
                      rx="0.5"
                      fill="#0f172a"
                      stroke={country?.color || '#94a3b8'}
                      strokeWidth="0.2"
                    />
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
                  </g>
                )}

                {/* Strategic Icons */}
                {prov.hasCapital && (
                  <circle cx={prov.mapX - 2.5} cy={prov.mapY - 1} r="0.8" fill="#facc15" />
                )}
                {prov.hasPort && (
                  <circle cx={prov.mapX - 2.5} cy={prov.mapY + 1} r="0.7" fill="#06b6d4" />
                )}
                {prov.hasAirbase && (
                  <circle cx={prov.mapX} cy={prov.mapY + 2.5} r="0.7" fill="#a855f7" />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-4 text-xs font-mono bg-slate-900/90 p-2.5 rounded border border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
          <span className="text-slate-300">Capital</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
          <span className="text-slate-300">Naval Port</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 inline-block" />
          <span className="text-slate-300">Airbase</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
          <span className="text-slate-300">Friendly Line</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
          <span className="text-slate-300">Hostile Frontier</span>
        </div>
      </div>
    </div>
  );
};
