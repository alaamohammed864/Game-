import React, { useState, useEffect } from 'react';
import { AIDifficulty } from '../types';
import { sound } from '../audio/soundSystem';
import { Globe, Play, Shield, Terminal, Volume2 } from 'lucide-react';
import { Language, t } from '../utils/localization';

interface TitleScreenProps {
  onStartGame: (difficulty: AIDifficulty, countryId: string, isSandbox: boolean) => void;
  lang: Language;
  onToggleLanguage: () => void;
}

const NATIONS: Record<string, {
  id: string;
  name: { en: string; ar: string };
  color: string;
  archetype: { en: string; ar: string };
  desc: { en: string; ar: string };
}> = {
  valyria: {
    id: 'valyria',
    name: { en: 'Valyrian Republic', ar: 'جمهورية فاليريا' },
    color: '#3b82f6',
    archetype: { en: 'Western Industrial Democracy', ar: 'ديمقراطية صناعية متقدمة' },
    desc: {
      en: 'Superior high-tech manufacturing, balanced military forces, and maritime trade dominance.',
      ar: 'تصنيع عالي التقنية، قوات عسكرية متوازنة، وهيمنة تجارية بحرية عبر المحيط.'
    }
  },
  aethelgard: {
    id: 'aethelgard',
    name: { en: 'Aethelgard Federation', ar: 'اتحاد إيثيلغارد' },
    color: '#ef4444',
    archetype: { en: 'Northern Military Hegemon', ar: 'قوة عسكرية شمالية مدرعة' },
    desc: {
      en: 'Vast iron blast furnaces, disciplined armored vanguard divisions, and expansionist doctrine.',
      ar: 'أفران صهر حديد عملاقة، فيالق مدرعة منضبطة، وعقيدة عسكرية توسعية.'
    }
  },
  solaria: {
    id: 'solaria',
    name: { en: 'Solaria Dominion', ar: 'دومينيون سولاريا' },
    color: '#eab308',
    archetype: { en: 'Desert Crude Powerhouse', ar: 'عملاق النفط والطاقة الصحراوي' },
    desc: {
      en: 'Monopoly on deep petroleum reserves, immense fiscal reserves, and mechanized air wings.',
      ar: 'احتياطيات نفط خام هائلة، خزينة مالية ضخمة، وأجنحة طيران هجومية سريعة.'
    }
  },
  kalyan: {
    id: 'kalyan',
    name: { en: 'Kalyan Commonwealth', ar: 'كومنولث كاليان' },
    color: '#10b981',
    archetype: { en: 'Eastern Demographic Titan', ar: 'العملاق البشري والصناعي الشرقي' },
    desc: {
      en: 'Immense manpower reserves, rapid economic scaling, and fortified mountain redoubts.',
      ar: 'احتياطي هائل من القوى البشرية، نمو اقتصادي متسارع، وحصون جبلية منيعة.'
    }
  },
  nordic: {
    id: 'nordic',
    name: { en: 'Nordic Concordat', ar: 'ميثاق الشمال المتحد' },
    color: '#06b6d4',
    archetype: { en: 'Subarctic Science & Submarines', ar: 'معقل البحوث والغواصات القطبية' },
    desc: {
      en: 'Advanced quantum computing R&D, stealth hunter-killer submarines, and cold-weather doctrine.',
      ar: 'أبحاث حوسبة كمية فائقة، غواصات هجومية شبحية، واستراتيجية صمود دفاعي.'
    }
  },
  zulqarnain: {
    id: 'zulqarnain',
    name: { en: 'Zul-Qarnain Coalition', ar: 'ائتلاف ذو القرنين' },
    color: '#f97316',
    archetype: { en: 'Central Crossroads & Refineries', ar: 'محور المضائق ومصافي التكرير' },
    desc: {
      en: 'Strategic transit chokepoints, heavy multirole aviation wings, and opportunistic diplomacy.',
      ar: 'مضائق استراتيجية حاكمة، مصافي بتروكيماويات كبرى، وأجنحة مقاتلات ضاربة.'
    }
  },
  oceana: {
    id: 'oceana',
    name: { en: 'Oceana League', ar: 'رابطة أوشيانا البحرية' },
    color: '#8b5cf6',
    archetype: { en: 'Archipelago Carrier Strike Fleet', ar: 'أساطيل حاملات الطائرات المحيطية' },
    desc: {
      en: 'Immense supercarriers, naval dominance, and control of oceanic trade corridors.',
      ar: 'حاملات طائرات نووية عملاقة، سيادة بحرية شاملة، وتحكم في الممرات المائية.'
    }
  }
};

const DIFFICULTY_LABELS: Record<AIDifficulty, { en: string; ar: string }> = {
  EASY: { en: 'Cadet (Easy)', ar: 'مبتدئ (سهل)' },
  NORMAL: { en: 'Commander (Normal)', ar: 'قائد (عادي)' },
  HARD: { en: 'General (Hard)', ar: 'جنرال (صعب)' },
  EXPERT: { en: 'Field Marshal (Expert)', ar: 'مشير (خبير)' },
  GRAND_STRATEGIST: { en: 'Grand Strategist (Master)', ar: 'مخطط أعلى (محترف)' }
};

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStartGame,
  lang,
  onToggleLanguage
}) => {
  const [selectedCountryId, setSelectedCountryId] = useState<string>('valyria');
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty>('NORMAL');
  const [isSandbox, setIsSandbox] = useState<boolean>(false);

  // Keyboard shortcut: Enter to start
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || (e.key !== 'Enter' && e.code !== 'Space')) return;
      const target = e.target;
      if (target instanceof HTMLElement && target.closest('button, input, select, textarea, a, [contenteditable="true"]')) return;
      if (e.code === 'Space') e.preventDefault();
      startGame();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDifficulty, selectedCountryId, isSandbox]);

  const startGame = () => {
    sound.playSelect();
    onStartGame(selectedDifficulty, selectedCountryId, isSandbox);
  };

  const nationList = Object.values(NATIONS);
  const selectedNation = NATIONS[selectedCountryId] || nationList[0];

  return (
    <div lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-4 sm:p-8 select-none overflow-y-auto military-grid font-mono">
      {/* Background Ambience Scanlines */}
      <div className="absolute inset-0 scanlines opacity-50 pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-cyan-400">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping inline-block" />
          <span className="tracking-widest font-bold">
            {t('title_protocol', lang)}
          </span>
        </div>

        <button
          onClick={onToggleLanguage}
          aria-label={t('language_toggle', lang)}
          className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 hover:text-white flex items-center gap-2 shadow"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold">{lang === 'en' ? t('language_arabic', lang) : t('language_english', lang)}</span>
        </button>
      </div>

      {/* Center Hero Lockup */}
      <div className="relative z-10 my-auto py-4 flex flex-col items-center text-center max-w-4xl mx-auto space-y-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-800 text-cyan-400 text-xs tracking-wider mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>{t('global_theatre', lang)}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-cyan-200 to-sky-400 drop-shadow-[0_0_35px_rgba(56,189,248,0.3)]">
            {t('game_title', lang)}
          </h1>

          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            {t('game_subtitle', lang)} · {t('title_campaign_intro', lang)}
          </p>
        </div>

        {/* Nation Selector */}
        <div className="w-full space-y-2.5">
          <span className="text-xs uppercase tracking-widest text-slate-300 block font-bold">
            {t('select_country', lang)}
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {nationList.map(nation => {
              const isSelected = nation.id === selectedCountryId;
              return (
                <button
                  key={nation.id}
                  onClick={() => {
                    setSelectedCountryId(nation.id);
                    sound.playClick();
                  }}
                  className={`p-2 rounded text-left transition-all border flex flex-col items-center text-center ${
                    isSelected
                      ? 'bg-slate-900 border-2 shadow-lg scale-105'
                      : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-900/60'
                  }`}
                  style={{ borderColor: isSelected ? nation.color : undefined }}
                  aria-pressed={isSelected}
                  aria-label={`${nation.name[lang]} — ${nation.archetype[lang]}`}
                >
                  <span
                    className="w-4 h-4 rounded-full mb-1.5 shadow-sm"
                    style={{ backgroundColor: nation.color }}
                  />
                  <span className="font-bold text-[11px] text-white truncate w-full">
                    {nation.name[lang].split(' ')[0]}
                  </span>
                  <span className="text-[9px] text-slate-400 truncate w-full">
                    {nation.archetype[lang].split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected Nation Dossier Card */}
          <div 
            className="p-3.5 rounded-lg bg-slate-900/90 border text-left rtl:text-right max-w-xl mx-auto text-xs space-y-1 shadow-md"
            style={{ borderLeft: `4px solid ${selectedNation.color}` }}
          >
            <div className="flex items-center justify-between">
              <strong className="text-white text-sm">{selectedNation.name[lang]}</strong>
              <span className="text-[10px] text-cyan-400 uppercase font-bold">{selectedNation.archetype[lang]}</span>
            </div>
            <p className="text-[11px] text-slate-300">{selectedNation.desc[lang]}</p>
          </div>
        </div>

        {/* Difficulty & Sandbox Mode Options */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
          <div className="flex flex-col sm:flex-row items-center gap-1.5 bg-slate-900 p-1.5 rounded-lg border border-slate-800 w-full sm:w-auto">
            <span className="text-slate-400 text-[11px] px-2 font-bold shrink-0">
              {t('ai_doctrine', lang)}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1 w-full sm:w-auto">
              {(['EASY', 'NORMAL', 'HARD', 'EXPERT', 'GRAND_STRATEGIST'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  aria-pressed={selectedDifficulty === diff}
                  className={`px-2.5 py-1.5 sm:py-1 rounded text-[11px] font-bold transition-colors ${
                    selectedDifficulty === diff ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white bg-slate-950/40'
                  }`}
                >
                  {DIFFICULTY_LABELS[diff][lang]}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded border border-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={isSandbox}
              onChange={(e) => setIsSandbox(e.target.checked)}
              className="accent-amber-500 rounded"
            />
            <span className="text-amber-300 font-bold text-xs">
              {t('sandbox_mode', lang)}
            </span>
          </label>
        </div>

        {/* Primary Start CTA */}
        <button
          onClick={startGame}
          className="group relative px-10 py-3.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm sm:text-base uppercase tracking-widest shadow-[0_0_35px_rgba(6,182,212,0.4)] transition-all flex items-center gap-3 active:scale-95"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>{t('initialize_command', lang)}</span>
        </button>

        {/* Control Hints Line */}
        <div className="text-[11px] text-slate-400 tracking-wider">
          {t('title_keyboard_hints', lang)}
        </div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900 pt-2">
        <span>{t('title_footer_architecture', lang)}</span>
        <span>{t('title_footer_ai', lang)}</span>
      </div>
    </div>
  );
};
