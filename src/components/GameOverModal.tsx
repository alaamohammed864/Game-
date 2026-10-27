import React from 'react';
import { GameOverState } from '../types';
import { Trophy, Skull, RotateCcw, Play } from 'lucide-react';
import { Language } from '../utils/localization';

interface GameOverModalProps {
  gameOver: GameOverState;
  currentDate: string;
  onContinue: () => void;
  onNewCampaign: () => void;
  lang: Language;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ gameOver, currentDate, onContinue, onNewCampaign, lang }) => {
  const isVictory = gameOver.status === 'VICTORY';
  const ar = lang === 'ar';

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4 backdrop-blur-md font-mono" role="dialog" aria-modal="true">
      <div className={`w-full max-w-md rounded-xl border-2 shadow-2xl p-6 text-center space-y-4 bg-slate-950 ${isVictory ? 'border-emerald-500' : 'border-red-600'}`}>
        {isVictory ? <Trophy className="w-14 h-14 text-emerald-400 mx-auto" /> : <Skull className="w-14 h-14 text-red-500 mx-auto" />}
        <h2 className={`text-2xl font-extrabold tracking-wider ${isVictory ? 'text-emerald-300' : 'text-red-400'}`}>
          {isVictory ? (ar ? 'النصر الحاسم' : 'DECISIVE VICTORY') : (ar ? 'سقوط الدولة' : 'NATION FALLEN')}
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">{gameOver.reason}</p>
        <p className="text-[11px] text-slate-500">
          {ar ? 'الدورة' : 'Turn'} {gameOver.turn} · {currentDate}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          {isVictory && (
            <button onClick={onContinue} className="flex-1 py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center justify-center gap-2">
              <Play className="w-4 h-4" />
              {ar ? 'واصل اللعب' : 'Keep Playing'}
            </button>
          )}
          <button onClick={onNewCampaign} className="flex-1 py-2.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" />
            {ar ? 'حملة جديدة' : 'New Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
};
