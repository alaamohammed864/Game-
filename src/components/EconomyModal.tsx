import React, { useState } from 'react';
import { Country, Province, ResourceKey } from '../types';
import { calculateCountryEconomy } from '../economy/economyEngine';
import { X, Factory, DollarSign, TrendingUp, TrendingDown, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { Language, t } from '../utils/localization';

interface EconomyModalProps {
  player: Country;
  provinces: Record<string, Province>;
  countries: Record<string, Country>;
  marketPrices: Record<ResourceKey, number>;
  onExecuteTrade: (resource: ResourceKey, amount: number, isBuying: boolean) => { success: boolean; message: string };
  onClose: () => void;
  lang: Language;
}

export const EconomyModal: React.FC<EconomyModalProps> = ({
  player,
  provinces,
  countries,
  marketPrices,
  onExecuteTrade,
  onClose,
  lang
}) => {
  const { balance, shortages } = calculateCountryEconomy(player, provinces, countries);

  const [tradeResource, setTradeResource] = useState<ResourceKey>('oil');
  const [tradeAmount, setTradeAmount] = useState<number>(500);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);

  const tradableResources: ResourceKey[] = ['oil', 'steel', 'food', 'energy', 'rareMaterials'];

  const handleBuy = () => {
    const res = onExecuteTrade(tradeResource, tradeAmount, true);
    setFeedback({ text: res.message, ok: res.success });
  };

  const handleSell = () => {
    const res = onExecuteTrade(tradeResource, tradeAmount, false);
    setFeedback({ text: res.message, ok: res.success });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Factory className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white uppercase">
                {t('economy', lang)} · {t('industry_ministry', lang)}
              </h2>
              <span className="text-xs text-slate-400">
                {t('res_money', lang)}: <strong className="text-emerald-400">${player.resources.money.toLocaleString()}</strong> · {t('macro_balance', lang)}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Deficit Warnings Banner */}
          {(shortages.oil || shortages.food || shortages.energy) && (
            <div className="p-3 rounded bg-red-950/50 border border-red-600/80 text-red-200 space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>{t('industrial_alerts', lang)}</span>
              </div>
              {shortages.oil && <p className="text-[11px]">• {t('oil_shortage_warn', lang)}</p>}
              {shortages.food && <p className="text-[11px]">• {t('food_shortage_warn', lang)}</p>}
              {shortages.energy && <p className="text-[11px]">• {t('energy_shortage_warn', lang)}</p>}
            </div>
          )}

          {/* Macro Balance Sheet Table */}
          <div className="p-3.5 rounded bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              {t('stockpile_ledger', lang)}
            </span>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                    <th className="py-1.5 px-2">{t('commodity', lang)}</th>
                    <th className="py-1.5 px-2">{t('stockpile', lang)}</th>
                    <th className="py-1.5 px-2">{t('gross_output', lang)}</th>
                    <th className="py-1.5 px-2">{t('consumption', lang)}</th>
                    <th className="py-1.5 px-2">{t('net_turn', lang)}</th>
                    <th className="py-1.5 px-2">{t('spot_price', lang)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-[11px]">
                  {tradableResources.map(key => {
                    const stock = player.resources[key];
                    const net = balance[key]?.net || 0;
                    const prod = balance[key]?.production || 0;
                    const cons = balance[key]?.consumption || 0;
                    const price = marketPrices[key] || 10;

                    return (
                      <tr key={key} className="hover:bg-slate-850/50">
                        <td className="py-2 px-2 font-bold uppercase text-white">{t(`res_${key}`, lang)}</td>
                        <td className="py-2 px-2 text-cyan-300 font-bold">{stock.toLocaleString()}</td>
                        <td className="py-2 px-2 text-emerald-400">+{prod.toLocaleString()}</td>
                        <td className="py-2 px-2 text-rose-400">-{cons.toLocaleString()}</td>
                        <td className={`py-2 px-2 font-bold ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {net >= 0 ? `+${net.toLocaleString()}` : net.toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-amber-300 font-bold">${price}/unit</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Global Commodity Trade Desk */}
          <div className="p-3.5 rounded bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-xs uppercase text-white">{t('commodity_exchange', lang)}</span>
            </div>

            {feedback && (
              <div className={`p-2.5 rounded border text-xs ${
                feedback.ok ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200' : 'bg-red-950/60 border-red-500 text-red-200'
              }`}>
                {feedback.text}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">{t('select_commodity', lang)}</label>
                <select
                  value={tradeResource}
                  onChange={(e) => setTradeResource(e.target.value as ResourceKey)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded p-1.5 text-xs font-mono"
                >
                  {tradableResources.map(r => (
                    <option key={r} value={r}>
                      {t(`res_${r}`, lang)} ({t('spot_price', lang)}: ${marketPrices[r]}{t('per_unit', lang)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">{t('contract_volume', lang)}</label>
                <div className="flex gap-1.5">
                  {[250, 500, 1000, 2500].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setTradeAmount(amt)}
                      className={`flex-1 py-1 rounded text-xs ${
                        tradeAmount === amt ? 'bg-cyan-600 text-white font-bold' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={handleBuy}
                  className="flex-1 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase"
                >
                  {t('buy', lang)} (${Math.round(tradeAmount * (marketPrices[tradeResource] || 10)).toLocaleString()})
                </button>
                <button
                  onClick={handleSell}
                  className="flex-1 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase"
                >
                  {t('sell', lang)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
