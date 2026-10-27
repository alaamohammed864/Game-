import React, { useState } from 'react';
import { TechNode, Country } from '../types';
import { TECH_TREE } from '../game/config';
import { X, Cpu, Shield, Factory, Sparkles, Network, CheckCircle, Lock } from 'lucide-react';
import { Language, t } from '../utils/localization';

interface ResearchModalProps {
  player: Country;
  onClose: () => void;
  onStartResearch: (techId: string) => boolean;
  lang: Language;
}

export const ResearchModal: React.FC<ResearchModalProps> = ({
  player,
  onClose,
  onStartResearch,
  lang
}) => {
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'MILITARY' | 'ECONOMY' | 'SCIENCE' | 'INFRASTRUCTURE'>('ALL');

  const filteredTechs = activeCategory === 'ALL'
    ? TECH_TREE
    : TECH_TREE.filter(t => t.category === activeCategory);

  const getStatus = (tech: TechNode) => {
    if (player.completedTechs.includes(tech.id)) return 'COMPLETED';
    if (player.currentResearch?.techId === tech.id) return 'RESEARCHING';
    const prereqsMet = tech.prerequisites.every(p => player.completedTechs.includes(p));
    if (!prereqsMet) return 'LOCKED';
    return 'AVAILABLE';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white uppercase">
                {t('research', lang)} · Technological Supremacy Tree
              </h2>
              <span className="text-xs text-slate-400">
                Science Reserves: <strong className="text-cyan-300">{player.resources.techPoints.toLocaleString()} TP</strong>
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Research Banner */}
        {player.currentResearch && (
          <div className="px-4 py-2 bg-cyan-950/40 border-b border-cyan-800/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>
                Active Project: <strong className="text-white">
                  {TECH_TREE.find(t => t.id === player.currentResearch!.techId)?.name}
                </strong>
              </span>
            </div>
            <span className="text-cyan-300 font-bold">
              Progress: {Math.round(player.currentResearch.progress)} / {TECH_TREE.find(t => t.id === player.currentResearch!.techId)?.cost} TP
            </span>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 text-xs px-3 overflow-x-auto scrollbar-none shrink-0">
          {(['ALL', 'MILITARY', 'ECONOMY', 'SCIENCE', 'INFRASTRUCTURE'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`py-2 px-3 border-b-2 font-medium whitespace-nowrap shrink-0 transition-colors ${
                activeCategory === cat
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Tech Grid */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {filteredTechs.map(tech => {
            const status = getStatus(tech);
            const isCompleted = status === 'COMPLETED';
            const isResearching = status === 'RESEARCHING';
            const isLocked = status === 'LOCKED';
            const isAvailable = status === 'AVAILABLE';

            return (
              <div
                key={tech.id}
                className={`p-3.5 rounded border flex flex-col justify-between transition-all ${
                  isCompleted
                    ? 'bg-slate-900/40 border-slate-800/60 opacity-80'
                    : isResearching
                    ? 'bg-cyan-950/60 border-cyan-500 shadow-md'
                    : isAvailable
                    ? 'bg-slate-900/80 border-slate-700 hover:border-cyan-500/80'
                    : 'bg-slate-950/60 border-slate-900 opacity-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-white text-xs">{tech.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isCompleted ? 'bg-emerald-500/20 text-emerald-300' :
                      isResearching ? 'bg-cyan-500/20 text-cyan-300' :
                      isAvailable ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">{tech.description}</p>
                  
                  {tech.prerequisites.length > 0 && (
                    <div className="text-[10px] text-slate-400 mb-2">
                      <span>Prerequisites: </span>
                      <span className="text-cyan-400">
                        {tech.prerequisites.map(p => TECH_TREE.find(t => t.id === p)?.name || p).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-cyan-300 font-bold">{tech.cost} Tech Points</span>
                  {isAvailable && (
                    <button
                      disabled={Boolean(player.currentResearch)}
                      title={player.currentResearch ? 'Finish the current project first' : undefined}
                      onClick={() => onStartResearch(tech.id)}
                      className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs"
                    >
                      Commission R&D
                    </button>
                  )}
                  {isCompleted && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Unlocked</span>
                    </span>
                  )}
                  {isLocked && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Locked</span>
                    </span>
                  )}
                  {isResearching && (
                    <span className="text-[11px] text-cyan-400 font-bold">Project in Progress</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
