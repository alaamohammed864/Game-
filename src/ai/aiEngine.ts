import { 
  Country, 
  Province, 
  UnitType, 
  BattleReport, 
  ConstructionQueueItem, 
  MilitaryQueueItem,
  DiplomaticStatus,
  GameNotification,
  BuildingType,
  MissileStrikeRecord
} from '../types';
import { BUILDING_DEFINITIONS, UNIT_DEFINITIONS, AI_DIFFICULTY_MODIFIERS, TECH_TREE } from '../game/config';
import { simulateCombatEngagement } from '../combat/combatEngine';
import { callDefensiveAllies, ensureBilateralRelation, setBilateralDiplomaticStatus, validateWarDeclaration } from '../diplomacy/diplomacyUtils';
import { mergeUnitGroups } from '../utils/unitGroups';

export interface AIExecutionResult {
  newBattles: BattleReport[];
  notifications: GameNotification[];
  missileStrike?: MissileStrikeRecord;
}

export interface AIOptions {
  rng?: () => number; // Optional deterministic random generator for testing
}

export function processAITurn(
  countryId: string,
  turn: number,
  countries: Record<string, Country>,
  provinces: Record<string, Province>,
  constructionQueue: ConstructionQueueItem[],
  militaryQueue: MilitaryQueueItem[],
  options: AIOptions = {}
): AIExecutionResult {
  const rng = options.rng || Math.random;
  const country = countries[countryId];
  if (!country || !country.isAlive || country.isPlayer) {
    return { newBattles: [], notifications: [] };
  }

  const result: AIExecutionResult = {
    newBattles: [],
    notifications: []
  };

  const diffConfig = AI_DIFFICULTY_MODIFIERS[country.aiProfile.difficulty] || AI_DIFFICULTY_MODIFIERS.NORMAL;
  const personality = country.aiProfile.personality || 'Balanced';
  const ownedProvinces = Object.values(provinces).filter(p => p.countryId === countryId);

  if (ownedProvinces.length === 0) {
    country.isAlive = false;
    return result;
  }

  // ==========================================
  // 1. OBSERVE & ANALYZE NEIGHBORS & THREATS
  // ==========================================
  const neighborProvIds = new Set<string>();
  ownedProvinces.forEach(p => {
    p.neighborIds.forEach(nId => {
      const neighbor = provinces[nId];
      if (neighbor && neighbor.countryId !== countryId) {
        neighborProvIds.add(nId);
      }
    });
  });

  const neighboringProvinces = Array.from(neighborProvIds)
    .map(id => provinces[id])
    .filter((p): p is Province => Boolean(p));

  const neighboringCountryIds = Array.from(new Set(neighboringProvinces.map(p => p.countryId)))
    .filter(id => Boolean(countries[id]));

  // Calculate military strength of this nation
  let ourTotalUnits = 0;
  let ourTotalAttack = 0;
  let ourTotalDefense = 0;
  ownedProvinces.forEach(p => {
    p.units.forEach(u => {
      const def = UNIT_DEFINITIONS[u.type];
      if (def) {
        ourTotalUnits += u.count;
        ourTotalAttack += def.attack * u.count;
        ourTotalDefense += def.defense * u.count;
      }
    });
  });

  // Evaluate relations & threats for all neighbors
  neighboringCountryIds.forEach(targetId => {
    const targetCountry = countries[targetId];
    if (!targetCountry || !targetCountry.isAlive) return;

    const rels = ensureBilateralRelation(country, targetCountry);
    if (!rels) return;
    const { relAtoB: relation, relBtoA: targetRelation } = rels;

    // Threat perception based on neighbor border troops and historical memory
    const targetBorderUnits = neighboringProvinces
      .filter(p => p.countryId === targetId)
      .reduce((sum, p) => sum + p.units.reduce((s, u) => s + u.count, 0), 0);

    const memoryHostilityPenalty = relation.memory.warsFought * 15 + relation.memory.betrayals * 25;
    const baseThreat = Math.min(100, (targetBorderUnits * 6 + memoryHostilityPenalty) * diffConfig.threatEvaluationWeight);
    relation.threatPerception = Math.round(baseThreat);

    // DIPLOMATIC PEACE / ARMISTICE INITIATIVE:
    // If at war, diplomatic or weak nations may sue for peace if losing heavily
    if (relation.status === 'WAR') {
      const shouldSeekPeace = 
        (personality === 'Diplomatic' && relation.trustScore > -60) ||
        (country.totalLosses > country.totalKills * 1.8 && ourTotalUnits < 8) ||
        (personality === 'Economic' && country.resources.money < 1000);

      if (shouldSeekPeace && rng() < 0.25) {
        setBilateralDiplomaticStatus(country, targetCountry, 'PEACE', 15, turn);
        result.notifications.push({
          id: `ai_peace_${turn}_${countryId}_${targetId}`,
          turn,
          type: 'DIPLOMACY',
          title: `Armistice Signed: ${country.name}`,
          message: `${country.name} and ${targetCountry.name} have concluded an armistice and ended hostilities.`,
          countryId
        });
      }
    }

    // TRADE AGREEMENT INITIATIVE:
    // Peaceful Economic or Diplomatic nations seek bilateral commerce
    if (
      relation.status === 'PEACE' && 
      !relation.tradeAgreementActive && 
      (personality === 'Economic' || personality === 'Diplomatic') &&
      relation.trustScore >= 10 &&
      rng() < 0.20
    ) {
      relation.tradeAgreementActive = true;
      targetRelation.tradeAgreementActive = true;
      relation.trustScore = Math.min(100, relation.trustScore + 10);
      targetRelation.trustScore = Math.min(100, targetRelation.trustScore + 10);
      result.notifications.push({
        id: `ai_trade_${turn}_${countryId}_${targetId}`,
        turn,
        type: 'DIPLOMACY',
        title: `Bilateral Trade: ${country.name}`,
        message: `${country.name} and ${targetCountry.name} ratified a mutual commerce pact.`,
        countryId
      });
    }

    // WAR DECLARATION LOGIC:
    // Check if war declaration is permitted and desired
    const warValidation = validateWarDeclaration(country, targetCountry);
    if (
      warValidation.valid &&
      relation.status !== 'WAR' &&
      relation.status !== 'ALLIANCE' &&
      relation.status !== 'DEFENSIVE_PACT' &&
      relation.status !== 'NON_AGGRESSION'
    ) {
      // Personality-derived war threshold
      let aggressionScore = country.aiProfile.aggressionRate;
      if (personality === 'Aggressive') aggressionScore += 0.35;
      else if (personality === 'Expansionist') aggressionScore += 0.20;
      else if (personality === 'Opportunistic') aggressionScore += 0.15;
      else if (personality === 'Defensive') aggressionScore -= 0.30;
      else if (personality === 'Diplomatic') aggressionScore -= 0.40;

      const powerAdvantage = ourTotalAttack / Math.max(1, targetBorderUnits * 25 + 50);

      if (aggressionScore > 0.45 && powerAdvantage >= 1.2 && rng() < (aggressionScore * 0.12 * diffConfig.reactionSpeed)) {
        setBilateralDiplomaticStatus(country, targetCountry, 'WAR', -50, turn);
        const interveningAllies = callDefensiveAllies(targetCountry, country, countries, turn);
        interveningAllies.forEach(ally => result.notifications.push({
          id: `allied_intervention_${turn}_${ally.id}_${country.id}`,
          turn,
          type: 'DIPLOMACY',
          title: 'Defensive Pact Activated',
          message: `${ally.name} joined the war to defend ${targetCountry.name}.`,
          countryId: ally.id,
        }));
        result.notifications.push({
          id: `war_decl_${turn}_${countryId}_${targetId}`,
          turn,
          type: 'DIPLOMACY',
          title: `Declaration of War: ${country.name}`,
          message: `${country.name} has formally declared sovereign war against ${targetCountry.name}!`,
          countryId
        });
      }
    }
  });

  // ==========================================
  // 2. ECONOMIC & INFRASTRUCTURE DECISIONS
  // ==========================================
  const activeQueuesForCountry = constructionQueue.filter(q => {
    const prov = provinces[q.provinceId];
    return prov && prov.countryId === countryId;
  }).length;

  if (activeQueuesForCountry < ownedProvinces.length && country.resources.money > 1000) {
    let neededBuilding: BuildingType = 'farm';

    // Prioritize by personality doctrine & bottlenecks
    if (personality === 'Defensive') {
      neededBuilding = country.resources.energy < 800 ? 'power_plant' : 'military_base';
    } else if (personality === 'Economic') {
      neededBuilding = country.resources.money < 2500 ? 'factory' : country.resources.steel < 1200 ? 'steel_plant' : 'farm';
    } else if (country.resources.food < 1200) {
      neededBuilding = 'farm';
    } else if (country.resources.oil < 1000) {
      neededBuilding = 'oil_field';
    } else if (country.resources.energy < 800) {
      neededBuilding = 'power_plant';
    } else if (country.resources.steel < 800) {
      neededBuilding = 'steel_plant';
    } else if (country.completedTechs.length < 5) {
      neededBuilding = 'research_center';
    } else {
      neededBuilding = 'factory';
    }

    const bDef = BUILDING_DEFINITIONS[neededBuilding];
    if (bDef) {
      const candidateProv = ownedProvinces.find(p => {
        if (constructionQueue.some(q => q.provinceId === p.id && q.type === neededBuilding)) return false;
        const existing = p.buildings.find(b => b.type === neededBuilding);
        return !existing || existing.level < bDef.maxLevel;
      });

      if (candidateProv) {
        let canAfford = true;
        for (const [res, cost] of Object.entries(bDef.baseCost)) {
          const available = country.resources[res as keyof typeof country.resources] || 0;
          if (available < (cost || 0)) {
            canAfford = false;
            break;
          }
        }

        if (canAfford) {
          for (const [res, cost] of Object.entries(bDef.baseCost)) {
            country.resources[res as keyof typeof country.resources] = Math.max(
              0,
              (country.resources[res as keyof typeof country.resources] || 0) - (cost || 0)
            );
          }
          const existing = candidateProv.buildings.find(b => b.type === neededBuilding);
          const nextLevel = existing ? existing.level + 1 : 1;
          constructionQueue.push({
            id: `cq_ai_${turn}_${countryId}_${candidateProv.id}_${neededBuilding}`,
            provinceId: candidateProv.id,
            type: neededBuilding,
            targetLevel: nextLevel,
            turnsRemaining: bDef.baseBuildTurns,
            totalTurns: bDef.baseBuildTurns,
            ownerCountryId: countryId
          });
        }
      }
    }
  }

  // ==========================================
  // 3. MILITARY RECRUITMENT DECISIONS
  // ==========================================
  const activeMilQueues = militaryQueue.filter(q => {
    const prov = provinces[q.provinceId];
    return prov && prov.countryId === countryId;
  }).length;

  if (activeMilQueues < 3 && country.resources.manpower > 2000 && country.resources.money > 1200) {
    let unitToBuild: UnitType = 'infantry';
    const airbaseProvince = ownedProvinces.find(p => p.hasAirbase || p.buildings.some(b => b.type === 'airport'));
    const portProvince = ownedProvinces.find(p => p.hasPort || p.buildings.some(b => b.type === 'port'));

    // Expand beyond ground forces when the country has the required infrastructure.
    if (airbaseProvince && country.resources.energy >= 300 && country.resources.rareMaterials >= 400 && rng() > 0.45) {
      unitToBuild = 'drones';
    } else if (airbaseProvince && country.resources.oil >= 600 && country.resources.rareMaterials >= 500 && rng() > 0.7) {
      unitToBuild = 'fighters';
    } else if (portProvince && country.resources.steel >= 600 && country.resources.oil >= 300 && rng() > 0.55) {
      unitToBuild = 'patrol_ships';
    } else if (personality === 'Aggressive') {
      unitToBuild = country.resources.steel > 1000 && country.resources.oil > 600 ? 'armored_units' : 'artillery';
    } else if (personality === 'Defensive') {
      unitToBuild = country.resources.energy > 400 ? 'air_defense' : 'infantry';
    } else if (country.resources.steel > 1200 && country.resources.oil > 800) {
      unitToBuild = rng() > 0.4 ? 'armored_units' : 'mechanized_infantry';
    } else if (airbaseProvince && country.resources.energy > 600 && rng() > 0.5) {
      unitToBuild = 'drones';
    } else {
      unitToBuild = 'infantry';
    }

    const uDef = UNIT_DEFINITIONS[unitToBuild];
    const spawnProv = uDef?.branch === 'AIR'
      ? airbaseProvince
      : uDef?.branch === 'NAVY'
      ? portProvince
      : ownedProvinces[0];
    if (uDef && spawnProv) {
      let canAfford = true;
      for (const [res, cost] of Object.entries(uDef.cost)) {
        const available = country.resources[res as keyof typeof country.resources] || 0;
        if (available < (cost || 0)) {
          canAfford = false;
          break;
        }
      }

      if (canAfford) {
        for (const [res, cost] of Object.entries(uDef.cost)) {
          country.resources[res as keyof typeof country.resources] = Math.max(
            0,
            (country.resources[res as keyof typeof country.resources] || 0) - (cost || 0)
          );
        }
        militaryQueue.push({
          id: `mq_ai_${turn}_${countryId}_${unitToBuild}_${Date.now()}`,
          provinceId: spawnProv.id,
          unitType: unitToBuild,
          count: 1,
          turnsRemaining: uDef.productionTurns,
          totalTurns: uDef.productionTurns,
          ownerCountryId: countryId
        });
      }
    }
  }

  // ==========================================
  // 4. COMBAT & INVASION EXECUTION
  // ==========================================
  const hostileNeighborProvs = neighboringProvinces.filter(p => {
    const rel = country.relations[p.countryId];
    return rel && rel.status === 'WAR';
  });

  // Put AI generals on separate fronts so their combat bonuses affect actual engagements.
  if (country.generals?.length) {
    const frontlineProvinces = ownedProvinces.filter(prov => prov.neighborIds.some(neighborId => {
      const neighbor = provinces[neighborId];
      return neighbor && country.relations[neighbor.countryId]?.status === 'WAR';
    }));
    const assignedProvinceIds = new Set<string>();
    country.generals.forEach(general => {
      const candidates = (frontlineProvinces.length > 0 ? frontlineProvinces : ownedProvinces)
        .filter(prov => !assignedProvinceIds.has(prov.id));
      const scoreProvince = (prov: Province) => {
        const specialtyUnit = general.specialization === 'AIR_SUPERIORITY'
          ? prov.units.filter(unit => UNIT_DEFINITIONS[unit.type]?.branch === 'AIR')
          : general.specialization === 'ARMOR_SPEARHEAD'
          ? prov.units.filter(unit => unit.type === 'armored_units' || unit.type === 'mechanized_infantry')
          : prov.units;
        const forceValue = specialtyUnit.reduce((sum, unit) => {
          const def = UNIT_DEFINITIONS[unit.type];
          return sum + (def ? def.defense * unit.count : 0);
        }, 0);
        return forceValue * (general.defenseBonus + 0.25) + prov.strategicImportance * 2 + prov.defenseLevel;
      };
      const assignment = [...candidates].sort((a, b) => scoreProvince(b) - scoreProvince(a))[0];
      general.assignedProvinceId = assignment?.id ?? null;
      if (assignment) assignedProvinceIds.add(assignment.id);
    });
  }

  if (hostileNeighborProvs.length > 0) {
    // Select best tactical target
    const targetProv = hostileNeighborProvs.reduce((prev, curr) => {
      const prevDef = curr.units.reduce((s, u) => s + u.count, 0) + curr.defenseLevel * 2;
      const currDef = prev.units.reduce((s, u) => s + u.count, 0) + prev.defenseLevel * 2;
      return prevDef < currDef ? curr : prev;
    }, hostileNeighborProvs[0]);

    // Find our neighboring staging province with units
    const stagingProv = ownedProvinces.find(p => p.neighborIds.includes(targetProv.id) && p.units.length > 0);

    if (stagingProv && stagingProv.units.length > 0) {
      const ourStagingAttack = stagingProv.units.reduce((sum, u) => {
        const def = UNIT_DEFINITIONS[u.type];
        return sum + (def ? def.attack * u.count : 0);
      }, 0);

      const theirEstDefense = targetProv.units.reduce((sum, u) => {
        const def = UNIT_DEFINITIONS[u.type];
        return sum + (def ? def.defense * u.count : 0);
      }, 0) + targetProv.defenseLevel * 40;

      const minRatio = personality === 'Aggressive' ? 1.05 : personality === 'Expansionist' ? 1.20 : 1.35;
      if (ourStagingAttack >= theirEstDefense * minRatio) {
        const unitsToAttack: any[] = [];
        const unitsRemaining: any[] = [];

        stagingProv.units.forEach(u => {
          const sendCount = Math.max(1, Math.ceil(u.count * 0.7));
          const keepCount = u.count - sendCount;
          unitsToAttack.push({ ...u, id: `${u.id}_t${turn}`, count: sendCount });
          if (keepCount > 0) {
            unitsRemaining.push({ ...u, count: keepCount });
          }
        });

        stagingProv.units = unitsRemaining;

        const defenderCountry = countries[targetProv.countryId];
        if (defenderCountry) {
          const battle = simulateCombatEngagement({
            turn,
            attackerCountry: country,
            defenderCountry,
            targetProvince: targetProv,
            attackingUnits: unitsToAttack,
            sourceProvinceId: stagingProv.id
          });

          if (battle.victor === 'DEFENDER' && battle.survivingAttackerUnits) {
            stagingProv.units = mergeUnitGroups([...stagingProv.units, ...battle.survivingAttackerUnits]);
          }

          result.newBattles.push(battle);

          result.notifications.push({
            id: `combat_notif_${turn}_${Date.now()}_${targetProv.id}`,
            turn,
            type: 'COMBAT',
            title: `Battle of ${targetProv.name}`,
            message: `${country.name} launched an assault on ${targetProv.name}! Victor: ${battle.victor === 'ATTACKER' ? country.name : defenderCountry.name}.`,
            provinceId: targetProv.id,
            countryId
          });
        }
      }
    }
  }

  // Launch a limited missile strike during an active war, observing cooldowns and interception defenses.
  const warTargets = Object.values(provinces).filter(prov => {
    const targetCountry = countries[prov.countryId];
    return targetCountry?.isAlive && targetCountry.id !== countryId && country.relations[targetCountry.id]?.status === 'WAR';
  });
  const launchChance = personality === 'Aggressive' ? 0.42 : personality === 'Expansionist' ? 0.3 : 0.16;
  if ((country.ballisticMissiles || 0) > 0 && turn - (country.lastMissileTurn ?? -10) >= 5 && warTargets.length > 0 && rng() < launchChance) {
    const targetProv = [...warTargets].sort((a, b) => {
      const score = (prov: Province) => {
        const hasDefense = prov.units.some(u => u.type === 'air_defense');
        const hasRadar = prov.buildings.some(building => building.type === 'radar_station');
        const garrison = prov.units.reduce((sum, unit) => sum + unit.count, 0);
        return prov.strategicImportance * 4 + garrison * 2 + prov.defenseLevel - (hasDefense ? 12 : 0) - (hasRadar ? 6 : 0);
      };
      return score(b) - score(a);
    })[0];
    const defendingCountry = countries[targetProv.countryId];
    if (defendingCountry) {
      const hasAirDefense = targetProv.units.some(u => u.type === 'air_defense');
      const hasRadar = targetProv.buildings.some(b => b.type === 'radar_station');
      const interceptChance = (hasAirDefense ? 0.35 : 0.05) + (hasRadar ? 0.15 : 0);
      const intercepted = rng() < interceptChance;
      const launchedAt = Date.now();
      country.ballisticMissiles = Math.max(0, (country.ballisticMissiles || 0) - 1);
      country.lastMissileTurn = turn;
      result.missileStrike = {
        id: `ai_strike_${turn}_${countryId}_${launchedAt}`,
        targetProvinceId: targetProv.id,
        turn,
        outcome: intercepted ? 'INTERCEPTED' : 'HIT',
        launchedAt,
      };

      if (intercepted) {
        result.notifications.push({
          id: `ai_strike_intercept_${turn}_${countryId}_${targetProv.id}`,
          turn,
          type: 'COMBAT',
          title: 'Missile Intercepted',
          message: `${defendingCountry.name} intercepted ${country.name}'s missile over ${targetProv.name}.`,
          provinceId: targetProv.id,
          countryId,
        });
      } else {
        targetProv.defenseLevel = Math.max(0, targetProv.defenseLevel - 2);
        targetProv.stability = Math.max(10, targetProv.stability - 35);
        let unitsEliminated = 0;
        targetProv.units.forEach(unit => {
          const lost = Math.max(1, Math.round(unit.count * 0.4));
          unit.count = Math.max(0, unit.count - lost);
          unit.morale = Math.max(15, unit.morale - 40);
          unitsEliminated += lost;
        });
        targetProv.units = targetProv.units.filter(unit => unit.count > 0);
        result.notifications.push({
          id: `ai_strike_hit_${turn}_${countryId}_${targetProv.id}`,
          turn,
          type: 'COMBAT',
          title: 'Ballistic Missile Impact',
          message: `${country.name}'s strike damaged ${targetProv.name}; ${unitsEliminated} unit groups were eliminated.`,
          provinceId: targetProv.id,
          countryId,
        });
      }
    }
  }

  // ==========================================
  // 5. RESEARCH PROGRESSION
  // ==========================================
  if (!country.currentResearch && country.resources.techPoints >= 100) {
    const uncompletedTechs = TECH_TREE.filter(
      t => !country.completedTechs.includes(t.id) && t.prerequisites.every(pr => country.completedTechs.includes(pr))
    );
    if (uncompletedTechs.length > 0) {
      // Prioritize tech matching doctrine
      let chosenTech = uncompletedTechs[0];
      if (personality === 'Defensive') {
        const defTech = uncompletedTechs.find(t => t.id === 'tech_hardened_bunkers' || t.category === 'INFRASTRUCTURE');
        if (defTech) chosenTech = defTech;
      } else if (personality === 'Economic') {
        const econTech = uncompletedTechs.find(t => t.category === 'ECONOMY');
        if (econTech) chosenTech = econTech;
      } else if (personality === 'Aggressive') {
        const milTech = uncompletedTechs.find(t => t.category === 'MILITARY');
        if (milTech) chosenTech = milTech;
      }
      country.currentResearch = { techId: chosenTech.id, progress: 0 };
    }
  }

  return result;
}
