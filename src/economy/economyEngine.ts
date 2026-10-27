import { 
  Country, 
  Province, 
  ResourceBalance, 
  ResourceKey, 
  Resources 
} from '../types';
import { BUILDING_DEFINITIONS, UNIT_DEFINITIONS, TECH_TREE } from '../game/config';

export function calculateCountryEconomy(
  country: Country,
  provinces: Record<string, Province>,
  allCountries: Record<string, Country>
): {
  balance: ResourceBalance;
  shortages: { oil: boolean; food: boolean; energy: boolean; money: boolean };
} {
  const ownedProvinces = Object.values(provinces).filter(p => p.countryId === country.id);

  // Initialize balance
  const keys: ResourceKey[] = [
    'money', 'oil', 'steel', 'food', 'energy', 'rareMaterials', 'techPoints', 'manpower', 'gold'
  ];
  const balance: ResourceBalance = {} as any;
  keys.forEach(k => {
    balance[k] = { production: 0, consumption: 0, net: 0 };
  });

  // 1. Tech Bonuses
  let efficiencyMultiplier = 1.0;
  let techInfrastructureBonus = 0;
  country.completedTechs.forEach(techId => {
    const tech = TECH_TREE.find(t => t.id === techId);
    if (!tech) return;
    if (tech.bonuses.resourceBonus) {
      Object.entries(tech.bonuses.resourceBonus).forEach(([res, val]) => {
        balance[res as ResourceKey].production += val || 0;
      });
    }
    if (tech.bonuses.efficiencyBonus) {
      efficiencyMultiplier += tech.bonuses.efficiencyBonus;
    }
    if (tech.bonuses.infrastructureBonus) {
      techInfrastructureBonus += tech.bonuses.infrastructureBonus;
    }
  });

  // 2. Province production and baseline population consumption
  ownedProvinces.forEach(prov => {
    const infraFactor = 0.5 + (prov.infrastructure / 100) * 0.5 + techInfrastructureBonus;
    const stabilityFactor = 0.3 + (prov.stability / 100) * 0.7;

    // Natural deposits
    Object.entries(prov.resourceDeposits).forEach(([res, amount]) => {
      if (amount) {
        balance[res as ResourceKey].production += Math.round(amount * infraFactor * stabilityFactor);
      }
    });

    // Base provincial economic taxes
    balance.money.production += Math.round(prov.economicValue * 12 * stabilityFactor * efficiencyMultiplier);

    // Buildings production & upkeep
    prov.buildings.forEach(b => {
      const def = BUILDING_DEFINITIONS[b.type];
      if (!def) return;
      const levelMult = b.level;

      if (def.production) {
        Object.entries(def.production).forEach(([res, val]) => {
          if (val) {
            balance[res as ResourceKey].production += Math.round(val * levelMult * efficiencyMultiplier);
          }
        });
      }

      if (def.upkeep) {
        Object.entries(def.upkeep).forEach(([res, val]) => {
          if (val) {
            balance[res as ResourceKey].consumption += Math.round(val * levelMult);
          }
        });
      }
    });

    // Population consumption
    balance.food.consumption += Math.round(prov.population * 25);
    balance.energy.consumption += Math.round(prov.population * 15);
    balance.money.consumption += Math.round(prov.population * 5); // Public administrative services

    // Units stationed in province upkeep
    prov.units.forEach(ug => {
      const uDef = UNIT_DEFINITIONS[ug.type];
      if (!uDef) return;
      balance.money.consumption += uDef.maintenanceCost * ug.count;
      balance.oil.consumption += uDef.fuelConsumption * ug.count;
    });
  });

  // 3. Trade agreements passive bonus
  Object.values(country.relations).forEach(rel => {
    if (rel.tradeAgreementActive) {
      balance.money.production += 150;
    }
  });

  // 4. Calculate net
  keys.forEach(k => {
    balance[k].net = balance[k].production - balance[k].consumption;
  });

  const shortages = {
    oil: country.resources.oil <= 0 && balance.oil.net < 0,
    food: country.resources.food <= 0 && balance.food.net < 0,
    energy: country.resources.energy <= 0 && balance.energy.net < 0,
    money: country.resources.money <= 0 && balance.money.net < 0
  };

  return { balance, shortages };
}

/** Only physical commodities can be bought or sold; money, gold, tech and manpower cannot. */
export const TRADABLE_RESOURCES: ResourceKey[] = ['oil', 'steel', 'food', 'energy', 'rareMaterials'];

export function executeMarketTrade(
  country: Country,
  resource: ResourceKey,
  amount: number,
  isBuying: boolean,
  marketPrices: Record<ResourceKey, number>
): { success: boolean; message: string } {
  if (!Number.isFinite(amount) || amount <= 0) return { success: false, message: 'Invalid trade volume.' };
  amount = Math.floor(amount);
  if (amount <= 0) return { success: false, message: 'Invalid trade volume.' };
  if (!TRADABLE_RESOURCES.includes(resource)) {
    return { success: false, message: `${resource} cannot be traded on the commodity exchange.` };
  }
  const unitPrice = marketPrices[resource] || 10;
  const totalCost = Math.round(amount * unitPrice);

  if (isBuying) {
    if (country.resources.money < totalCost) {
      return { success: false, message: `Insufficient treasury. Required: $${totalCost.toLocaleString()}` };
    }
    country.resources.money -= totalCost;
    country.resources[resource] += amount;
    return { success: true, message: `Procured ${amount.toLocaleString()} ${resource} for $${totalCost.toLocaleString()}` };
  } else {
    if (country.resources[resource] < amount) {
      return { success: false, message: `Insufficient stockpile of ${resource} to sell.` };
    }
    const proceeds = Math.round(totalCost * 0.85); // 15% trade tariff/broker fee
    country.resources[resource] -= amount;
    country.resources.money += proceeds;
    return { success: true, message: `Sold ${amount.toLocaleString()} ${resource} for $${proceeds.toLocaleString()} after broker tariffs.` };
  }
}
