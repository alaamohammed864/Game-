import { 
  BattleReport, 
  Country, 
  Province, 
  UnitGroup, 
  UnitType, 
  TerrainType,
  UnitBranch
} from '../types';
import { UNIT_DEFINITIONS, TECH_TREE } from '../game/config';

export interface CombatEngagementInput {
  turn: number;
  attackerCountry: Country;
  defenderCountry: Country;
  targetProvince: Province;
  attackingUnits: UnitGroup[];
  sourceProvinceId?: string;
  hasAirSupport?: boolean;
}


type BranchMods = { atk: number; def: number };

/** Sums unit-bonus techs per branch. A tech with no branch buffs LAND, AIR and NAVY alike. */
export function computeTechModifiers(country: Country): Record<UnitBranch, BranchMods> {
  const mods: Record<UnitBranch, BranchMods> = {
    LAND: { atk: 1, def: 1 },
    AIR: { atk: 1, def: 1 },
    NAVY: { atk: 1, def: 1 }
  };
  country.completedTechs.forEach(tId => {
    const ub = TECH_TREE.find(t => t.id === tId)?.bonuses.unitBonus;
    if (!ub) return;
    (['LAND', 'AIR', 'NAVY'] as UnitBranch[]).forEach(b => {
      if (!ub.branch || ub.branch === b) {
        mods[b].atk += ub.attackBonus || 0;
        mods[b].def += ub.defenseBonus || 0;
      }
    });
  });
  return mods;
}

/** Applies a loss fraction to a group. Groups reduced to 0 are removed (no immortal single units). */
function applyLosses(units: UnitGroup[], lossPct: number, patch: (u: UnitGroup) => Partial<UnitGroup>): UnitGroup[] {
  return units
    .map(u => ({ ...u, count: Math.round(u.count * (1 - lossPct)), ...patch(u) }))
    .filter(u => u.count > 0);
}

export function simulateCombatEngagement(input: CombatEngagementInput): BattleReport {
  const {
    turn,
    attackerCountry,
    defenderCountry,
    targetProvince,
    attackingUnits,
    hasAirSupport
  } = input;

  const defendingUnits = targetProvince.units;
  const terrain = targetProvince.terrain;

  // 1. Tech attack/defense multipliers (per branch; techs without a branch apply to every branch)
  const attackerMods = computeTechModifiers(attackerCountry);
  const defenderMods = computeTechModifiers(defenderCountry);

  // 2. Sovereign General Command Buffs
  const attackerGeneral = input.sourceProvinceId && attackerCountry.generals
    ? attackerCountry.generals.find(g => g.assignedProvinceId === input.sourceProvinceId)
    : null;
  const defenderGeneral = defenderCountry.generals
    ? defenderCountry.generals.find(g => g.assignedProvinceId === targetProvince.id)
    : null;

  if (attackerGeneral) {
    attackerMods.LAND.atk += attackerGeneral.attackBonus;
    attackerMods.AIR.atk += attackerGeneral.attackBonus;
  }
  if (defenderGeneral) {
    defenderMods.LAND.def += defenderGeneral.defenseBonus;
  }

  // 3. Oil shortage penalties (if nation has 0 oil, mechanized and air lose 40% effectiveness)
  const attackerOilDeficit = attackerCountry.resources.oil <= 0;
  const defenderOilDeficit = defenderCountry.resources.oil <= 0;

  // 3. Air Superiority Assessment
  const attackerFighters = attackingUnits.filter(u => u.type === 'fighters' || u.type === 'drones')
    .reduce((acc, u) => acc + u.count, 0);
  const defenderFighters = defendingUnits.filter(u => u.type === 'fighters' || u.type === 'air_defense')
    .reduce((acc, u) => acc + u.count, 0);

  let airSuperiority: 'ATTACKER' | 'DEFENDER' | 'CONTESTED' | 'NONE' = 'NONE';
  let airMultiplierAttacker = 1.0;
  let airMultiplierDefender = 1.0;

  if (attackerFighters > 0 || defenderFighters > 0) {
    if (attackerFighters > defenderFighters * 1.5) {
      airSuperiority = 'ATTACKER';
      airMultiplierAttacker = 1.25;
      airMultiplierDefender = 0.85;
    } else if (defenderFighters > attackerFighters * 1.5) {
      airSuperiority = 'DEFENDER';
      airMultiplierDefender = 1.25;
      airMultiplierAttacker = 0.85;
    } else {
      airSuperiority = 'CONTESTED';
      airMultiplierAttacker = 1.05;
      airMultiplierDefender = 1.05;
    }
  }

  // 4. Fortification & Military Base Defense Bonus
  const milBaseBuilding = targetProvince.buildings.find(b => b.type === 'military_base');
  const fortificationBonus = 1.0 + (targetProvince.defenseLevel * 0.15) + (milBaseBuilding ? milBaseBuilding.level * 0.2 : 0);

  // 5. Attacker Combat Power Calculation
  let totalAttackerPower = 0;
  let attackerTroopCount = 0;
  let attackerVehicleCount = 0;
  let attackerAircraftCount = 0;

  attackingUnits.forEach(ug => {
    const def = UNIT_DEFINITIONS[ug.type];
    if (!def) return;
    const terrainMod = def.terrainModifiers[terrain] ?? 1.0;
    const expFactor = 1.0 + (ug.experience / 200); // Up to +50%
    const moraleFactor = 0.5 + (ug.morale / 200); // 0.5 to 1.0
    const supplyFactor = 0.4 + (ug.supply / 100) * 0.6;
    const oilFactor = (attackerOilDeficit && (def.branch === 'AIR' || def.fuelConsumption > 5)) ? 0.6 : 1.0;

    const basePower = def.attack * ug.count * terrainMod * expFactor * moraleFactor * supplyFactor * oilFactor * attackerMods[def.branch].atk * airMultiplierAttacker;
    totalAttackerPower += basePower;

    if (def.branch === 'LAND') {
      if (ug.type === 'infantry' || ug.type === 'special_forces') {
        attackerTroopCount += ug.count * 1000;
      } else {
        attackerVehicleCount += ug.count * 100;
      }
    } else if (def.branch === 'AIR') {
      attackerAircraftCount += ug.count * 20;
    }
  });

  // 6. Defender Combat Power Calculation
  let totalDefenderPower = 0;
  let defenderTroopCount = 0;
  let defenderVehicleCount = 0;
  let defenderAircraftCount = 0;

  defendingUnits.forEach(ug => {
    const def = UNIT_DEFINITIONS[ug.type];
    if (!def) return;
    const terrainMod = def.terrainModifiers[terrain] ?? 1.0;
    const expFactor = 1.0 + (ug.experience / 200);
    const moraleFactor = 0.5 + (ug.morale / 200);
    const supplyFactor = 0.4 + (ug.supply / 100) * 0.6;
    const oilFactor = (defenderOilDeficit && (def.branch === 'AIR' || def.fuelConsumption > 5)) ? 0.6 : 1.0;

    const basePower = def.defense * ug.count * terrainMod * expFactor * moraleFactor * supplyFactor * oilFactor * defenderMods[def.branch].def * fortificationBonus * airMultiplierDefender;
    totalDefenderPower += basePower;

    if (def.branch === 'LAND') {
      if (ug.type === 'infantry' || ug.type === 'special_forces') {
        defenderTroopCount += ug.count * 1000;
      } else {
        defenderVehicleCount += ug.count * 100;
      }
    } else if (def.branch === 'AIR') {
      defenderAircraftCount += ug.count * 20;
    }
  });

  // Edge case: empty province
  if (totalDefenderPower === 0) {
    totalDefenderPower = 10; // minimal civil militia
  }

  // 7. Tactical Simulation & Engagement Outcome
  const powerRatio = totalAttackerPower / Math.max(1, totalDefenderPower);
  const attackerRoll = 0.9 + Math.random() * 0.2; // 0.9 to 1.1 variance
  const defenderRoll = 0.9 + Math.random() * 0.2;
  const effectiveRatio = (totalAttackerPower * attackerRoll) / (totalDefenderPower * defenderRoll);

  const attackerWon = effectiveRatio >= 1.0;
  const victor = attackerWon ? 'ATTACKER' : 'DEFENDER';

  // 8. Casualty Calculations
  let attackerLossPct = 0;
  let defenderLossPct = 0;

  if (attackerWon) {
    // Victor takes lighter casualties, defender takes heavy casualties or routing
    attackerLossPct = Math.min(0.65, 0.25 / Math.max(0.5, effectiveRatio));
    defenderLossPct = Math.min(1.0, 0.4 + 0.3 * Math.min(2.5, effectiveRatio));
  } else {
    // Defender repulsed the assault
    attackerLossPct = Math.min(0.85, 0.4 + 0.25 / Math.max(0.3, effectiveRatio));
    defenderLossPct = Math.min(0.5, 0.2 * effectiveRatio);
  }

  const attackerTroopLoss = Math.round(attackerTroopCount * attackerLossPct);
  const attackerVehicleLoss = Math.round(attackerVehicleCount * attackerLossPct);
  const attackerAircraftLoss = Math.round(attackerAircraftCount * attackerLossPct);

  const defenderTroopLoss = Math.round(defenderTroopCount * defenderLossPct);
  const defenderVehicleLoss = Math.round(defenderVehicleCount * defenderLossPct);
  const defenderAircraftLoss = Math.round(defenderAircraftCount * defenderLossPct);

  let survivingAttackingUnits: UnitGroup[] = [];

  if (attackerWon) {
    // Attacker units occupy the province; the defending garrison is destroyed or driven out.
    survivingAttackingUnits = applyLosses(attackingUnits, attackerLossPct, u => ({
      experience: Math.min(100, u.experience + 15),
      morale: Math.min(100, u.morale + 10)
    }));
    // Someone must hold the province: keep one regiment of the strongest group if all rounded to zero.
    if (survivingAttackingUnits.length === 0 && attackingUnits.length > 0) {
      const strongest = [...attackingUnits].sort((x, y) => y.count - x.count)[0];
      survivingAttackingUnits = [{ ...strongest, count: 1, experience: Math.min(100, strongest.experience + 15), morale: Math.min(100, strongest.morale + 10) }];
    }

    targetProvince.units = survivingAttackingUnits;
    targetProvince.countryId = attackerCountry.id;
    targetProvince.defenseLevel = Math.max(0, targetProvince.defenseLevel - 1); // damaged fortifications
    targetProvince.stability = Math.max(20, targetProvince.stability - 30); // post-combat unrest
  } else {
    // Defender stood firm; destroyed groups are removed from the garrison.
    targetProvince.units = applyLosses(targetProvince.units, defenderLossPct, u => ({
      experience: Math.min(100, u.experience + 10),
      morale: Math.min(100, u.morale + 5)
    }));

    // Attacker repulsed: surviving units retreat to the source base.
    survivingAttackingUnits = applyLosses(attackingUnits, attackerLossPct, u => ({
      experience: Math.min(100, u.experience + 5),
      morale: Math.max(15, u.morale - 25)
    }));
  }

  // Update country kill/loss stats
  attackerCountry.totalLosses += (attackerTroopLoss + attackerVehicleLoss);
  attackerCountry.totalKills += (defenderTroopLoss + defenderVehicleLoss);
  defenderCountry.totalLosses += (defenderTroopLoss + defenderVehicleLoss);
  defenderCountry.totalKills += (attackerTroopLoss + attackerVehicleLoss);

  // Logs
  const detailsLog: string[] = [
    `Terrain assessment: ${terrain} conditions (${terrain === 'Urban' ? '+40% Urban CQC Defense' : terrain === 'Mountains' ? '+50% Fortified Chokepoints' : 'Open plains engagement'}).`,
    `Air Superiority: ${airSuperiority === 'ATTACKER' ? 'Attacker fighters established total air control (+25% strike bonus).' : airSuperiority === 'DEFENDER' ? 'Defender integrated air defense disrupted enemy strikes.' : 'Airspace contested.'}`,
    `Fortification Level: Defense factor ${fortificationBonus.toFixed(2)}x.`,
    attackerOilDeficit ? 'Attacker suffered severe fuel starvation penalties.' : 'Attacker supply lines operational.',
    defenderOilDeficit ? 'Defender lacked fuel reserves.' : 'Defender supply depot active.',
    `Combat Resolution: Attacker delivered ${Math.round(totalAttackerPower).toLocaleString()} dynamic power vs Defender ${Math.round(totalDefenderPower).toLocaleString()} power.`,
    attackerWon 
      ? `Result: Breakthrough achieved. Sovereign control of ${targetProvince.name} transferred to ${attackerCountry.name}.`
      : `Result: Assault decisively repulsed. Defender holds defensive perimeter.`
  ];

  return {
    id: `battle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    turn,
    provinceId: targetProvince.id,
    provinceName: targetProvince.name,
    attackerCountryId: attackerCountry.id,
    attackerCountryName: attackerCountry.name,
    defenderCountryId: defenderCountry.id,
    defenderCountryName: defenderCountry.name,
    attackerPower: Math.round(totalAttackerPower),
    defenderPower: Math.round(totalDefenderPower),
    attackerLosses: {
      totalTroops: attackerTroopLoss,
      vehicles: attackerVehicleLoss,
      aircraft: attackerAircraftLoss
    },
    defenderLosses: {
      totalTroops: defenderTroopLoss,
      vehicles: defenderVehicleLoss,
      aircraft: defenderAircraftLoss
    },
    terrain,
    airSuperiority,
    attackerSupplyPct: attackerOilDeficit ? 45 : 92,
    defenderSupplyPct: defenderOilDeficit ? 50 : 95,
    victor,
    provinceCaptured: attackerWon,
    detailsLog,
    survivingAttackerUnits: attackerWon ? undefined : survivingAttackingUnits
  };
}
