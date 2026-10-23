import { 
  Country, 
  Province, 
  UnitType, 
  BattleReport, 
  ConstructionQueueItem, 
  MilitaryQueueItem,
  DiplomaticStatus,
  GameNotification,
  BuildingType
} from '../types';
import { BUILDING_DEFINITIONS, UNIT_DEFINITIONS, AI_DIFFICULTY_MODIFIERS, TECH_TREE } from '../game/config';
import { simulateCombatEngagement } from '../combat/combatEngine';
import { ensureBilateralRelation, setBilateralDiplomaticStatus, validateWarDeclaration } from '../diplomacy/diplomacyUtils';

export interface AIExecutionResult {
  newBattles: BattleReport[];
  notifications: GameNotification[];
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

      if (aggressionScore > 0.45 && powerAdvantage >= 1.2 && rng() < (aggressionScore * 0.12)) {
        setBilateralDiplomaticStatus(country, targetCountry, 'WAR', -50, turn);
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
            totalTurns: bDef.baseBuildTurns
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

    if (personality === 'Aggressive') {
      unitToBuild = country.resources.steel > 1000 && country.resources.oil > 600 ? 'armored_units' : 'artillery';
    } else if (personality === 'Defensive') {
      unitToBuild = country.resources.energy > 400 ? 'air_defense' : 'infantry';
    } else if (country.resources.steel > 1200 && country.resources.oil > 800) {
      unitToBuild = rng() > 0.4 ? 'armored_units' : 'mechanized_infantry';
    } else if (country.resources.energy > 600 && rng() > 0.5) {
      unitToBuild = 'drones';
    } else {
      unitToBuild = 'infantry';
    }

    const uDef = UNIT_DEFINITIONS[unitToBuild];
    if (uDef) {
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
        const spawnProv = ownedProvinces[0];
        militaryQueue.push({
          id: `mq_ai_${turn}_${countryId}_${unitToBuild}_${Date.now()}`,
          provinceId: spawnProv.id,
          unitType: unitToBuild,
          count: 1,
          turnsRemaining: uDef.productionTurns,
          totalTurns: uDef.productionTurns
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
          unitsToAttack.push({ ...u, count: sendCount });
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

  // ==========================================
  // 5. RESEARCH PROGRESSION
  // ==========================================
  if (!country.currentResearch && country.resources.techPoints >= 100) {
    const uncompletedTechs = TECH_TREE.filter(t => !country.completedTechs.includes(t.id));
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
