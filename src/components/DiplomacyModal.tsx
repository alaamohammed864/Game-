import React, { useState } from 'react';
import { Country, DiplomaticStatus } from '../types';
import { 
  X, 
  Handshake, 
  ShieldAlert, 
  AlertTriangle, 
  DollarSign, 
  MapPin, 
  Heart, 
  History, 
  Swords 
} from 'lucide-react';
import { Language, t } from '../utils/localization';

interface DiplomacyModalProps {
  countries: Record<string, Country>;
  playerCountryId: string;
  onClose: () => void;
  onSendProposal: (targetCountryId: string, proposal: any) => { accepted: boolean; message: string };
  onDeclareWar: (targetCountryId: string) => void;
  lang: Language;
}

export const DiplomacyModal: React.FC<DiplomacyModalProps> = ({
  countries,
  playerCountryId,
  onClose,
  onSendProposal,
  onDeclareWar,
  lang
}) => {
  const player = countries[playerCountryId];
  const foreignCountries = Object.values(countries).filter(c => c.id !== playerCountryId && c.isAlive);

  const [selectedCountryId, setSelectedCountryId] = useState<string>(
    foreignCountries.length > 0 ? foreignCountries[0].id : ''
  );
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; success: boolean } | null>(null);

  const selectedCountry = countries[selectedCountryId];
  const relation = player?.relations[selectedCountryId];
  const formatStatus = (status?: DiplomaticStatus) => {
    if (lang !== 'ar') return status || 'PEACE';
    const labels: Partial<Record<DiplomaticStatus, string>> = {
      PEACE: 'سلام', WAR: 'حرب', ALLIANCE: 'تحالف', DEFENSIVE_PACT: 'دفاع مشترك',
      NON_AGGRESSION: 'عدم اعتداء',
    };
    return status ? labels[status] || status : 'سلام';
  };

  const handleProposal = (proposalType: any) => {
    if (!selectedCountry) return;
    const res = onSendProposal(selectedCountry.id, proposalType);
    setFeedbackMessage({ text: res.message, success: res.accepted });
  };

  const handleWar = () => {
    if (!selectedCountry) return;
    onDeclareWar(selectedCountry.id);
    setFeedbackMessage({ 
      text: `${t('hostilities_opened', lang)} ${selectedCountry.name}. ${t('state_of_war_active', lang)}`,
      success: false 
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Handshake className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white uppercase">
                {t('diplomacy', lang)} · {t('foreign_embassies', lang)}
              </h2>
              <span className="text-xs text-slate-400">
                {t('diplomacy_intro', lang)}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Left Column: Sovereign Nation Selector */}
          <div className="w-full sm:w-64 max-h-36 sm:max-h-none shrink-0 border-b sm:border-b-0 sm:border-r border-slate-800 bg-slate-900/40 p-2 overflow-y-auto space-y-1.5">
            {foreignCountries.map(c => {
              const rel = player?.relations[c.id];
              const isSelected = c.id === selectedCountryId;
              const isWar = rel?.status === 'WAR';

              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedCountryId(c.id);
                    setFeedbackMessage(null);
                  }}
                  className={`w-full p-2.5 rounded text-left transition-all flex items-center justify-between border ${
                    isSelected
                      ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: c.color }} 
                    />
                    <div className="truncate">
                      <span className="font-bold text-xs block truncate">{c.name}</span>
                      <span className="text-[10px] text-slate-400">{c.aiProfile.personality}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isWar ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {formatStatus(rel?.status)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Column: Diplomatic Dossier & Actions */}
          {selectedCountry && (
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Country Overview Banner */}
              <div 
                className="p-3.5 rounded-lg bg-slate-900/60 border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                style={{ borderColor: selectedCountry.color }}
              >
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: selectedCountry.color }} />
                    {selectedCountry.name}
                  </h3>
                  <div className="text-xs text-slate-400 flex gap-3 mt-1">
                    <span>{t('personality', lang)}: <strong className="text-cyan-300">{selectedCountry.aiProfile.personality}</strong></span>
                    <span>{t('doctrine', lang)}: <strong className="text-slate-200">{t('tier', lang)} {selectedCountry.completedTechs.length} {t('tech', lang)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  <div className="text-center p-2 rounded bg-slate-950 border border-slate-800 min-w-20">
                    <span className="text-[10px] text-slate-400 block">{t('trust_level', lang)}</span>
                    <span className={`font-bold text-sm ${(relation?.trustScore || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {relation?.trustScore || 0}/100
                    </span>
                  </div>
                  <div className="text-center p-2 rounded bg-slate-950 border border-slate-800 min-w-20">
                    <span className="text-[10px] text-slate-400 block">{t('status', lang)}</span>
                    <span className="font-bold text-sm text-cyan-400">{formatStatus(relation?.status)}</span>
                  </div>
                </div>
              </div>

              {/* Feedback Prompt if any */}
              {feedbackMessage && (
                <div className={`p-3 rounded border text-xs ${
                  feedbackMessage.success
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                    : 'bg-red-950/60 border-red-500 text-red-200'
                }`}>
                  {feedbackMessage.text}
                </div>
              )}

              {/* Strategic Goals & Historical Memory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    {t('strategic_priorities', lang)}
                  </span>
                  <ul className="list-disc list-inside text-slate-300 space-y-1 text-[11px]">
                    {selectedCountry.aiProfile.strategicGoals.map((goal, idx) => (
                      <li key={idx}>{goal}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    {t('ai_memory', lang)} · {t('past_conflicts', lang)}
                  </span>
                  <div className="text-slate-300 space-y-1 text-[11px]">
                    <div>{t('wars_fought', lang)}: <strong className="text-white">{relation?.memory.warsFought || 0}</strong></div>
                    <div>{t('treaties_honored', lang)}: <strong className="text-white">{relation?.memory.treatiesKept || 0}</strong></div>
                    <div>{t('trade_agreement', lang)}: <strong className={relation?.tradeAgreementActive ? "text-emerald-400" : "text-slate-400"}>
                      {relation?.tradeAgreementActive ? t('active', lang) : t('inactive', lang)}
                    </strong></div>
                    <div className="text-slate-400 italic text-[10px] mt-1">{relation?.memory.summary}</div>
                  </div>
                </div>
              </div>

              {/* Treaty Negotiation Actions */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                  {t('sovereign_actions', lang)}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    disabled={relation?.status === 'ALLIANCE' || relation?.status === 'WAR'}
                    onClick={() => handleProposal('ALLIANCE')}
                    className="p-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-50 text-slate-200 text-xs text-left"
                  >
                    <strong className="block text-white">{t('alliance', lang)}</strong>
                    <span className="text-[10px] text-slate-400">{t('mutual_defense', lang)}</span>
                  </button>

                  <button
                    disabled={relation?.status === 'DEFENSIVE_PACT' || relation?.status === 'WAR'}
                    onClick={() => handleProposal('DEFENSIVE_PACT')}
                    className="p-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-50 text-slate-200 text-xs text-left"
                  >
                    <strong className="block text-white">{t('defensive_pact', lang)}</strong>
                    <span className="text-[10px] text-slate-400">{t('third_party_aid', lang)}</span>
                  </button>

                  <button
                    disabled={relation?.status === 'NON_AGGRESSION' || relation?.status === 'WAR'}
                    onClick={() => handleProposal('NON_AGGRESSION')}
                    className="p-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-50 text-slate-200 text-xs text-left"
                  >
                    <strong className="block text-white">{t('non_aggression', lang)}</strong>
                    <span className="text-[10px] text-slate-400">{t('avoid_war', lang)}</span>
                  </button>

                  <button
                    disabled={relation?.tradeAgreementActive || relation?.status === 'WAR'}
                    onClick={() => handleProposal('TRADE_DEAL')}
                    className="p-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-50 text-slate-200 text-xs text-left"
                  >
                    <strong className="block text-white">{t('trade_deal', lang)}</strong>
                    <span className="text-[10px] text-slate-400">{t('treasury_per_turn', lang)}</span>
                  </button>

                  <button
                    disabled={relation?.militaryAccess || relation?.status === 'WAR'}
                    onClick={() => handleProposal('MILITARY_ACCESS')}
                    className="p-2.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 disabled:opacity-50 text-slate-200 text-xs text-left"
                  >
                    <strong className="block text-white">{t('military_access', lang)}</strong>
                    <span className="text-[10px] text-slate-400">{t('transit_rights', lang)}</span>
                  </button>

                  {relation?.status === 'WAR' && (
                    <button
                      onClick={() => handleProposal('PEACE_TREATY')}
                      className="p-2.5 rounded bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500 text-emerald-200 text-xs text-left"
                    >
                      <strong className="block text-white">{t('request_peace', lang)}</strong>
                      <span className="text-[10px] text-emerald-300">{t('ceasefire_agreement', lang)}</span>
                    </button>
                  )}
                </div>

                {relation?.status !== 'WAR' && (
                  <button
                    onClick={handleWar}
                    className="w-full mt-2 py-2.5 rounded bg-red-950/50 hover:bg-red-900/60 border border-red-600/80 text-red-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    <Swords className="w-4 h-4 text-red-400" />
                    <span>{t('declare_war', lang)}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
