import { 
  Country, 
  Province, 
  UnitType, 
  BattleReport, 
  ConstructionQueueItem, 
  MilitaryQueueItem,
  DiplomaticStatus,
  GameNotification
} from '../types';
import { BUILDING_DEFINITIONS, UNIT_DEFINITIONS, AI_DIFFICULTY_MODIFIERS } from '../game/config';
import { simulateCombatEngagement } from '../combat/combatEngine';

export interface AIExecutionResult {
  newBattles: BattleReport[];
  notifications: GameNotification[];
}

export function processAITurn(
  countryId: string,
  turn: number,
  countries: Record<string, Country>,
  provinces: Record<string, Province>,
  constructionQueue: ConstructionQueueItem[],
  militaryQueue: MilitaryQueueItem[]
): AIExecutionResult {
  const country = countries[countryId];
  if (!country || !country.isAlive || country.isPlayer) {
    return { newBattles: [], notifications: [] };
  }

  const result: AIExecutionResult = {
    newBattles: [],
    notifications: []
  };

  const diffConfig = AI_DIFFICULTY_MODIFIERS[country.aiProfile.difficulty] || AI_DIFFICULTY_MODIFIERS.NORMAL;
  const personality = country.aiProfile.personality;
  const ownedProvinces = Object.values(provinces).filter(p => p.countryId === countryId);

  if (ownedProvinces.length === 0) {
    country.isAlive = false;
    return result;
  }

  // ==========================================
  // 1. OBSERVE & ANALYZE
  // ==========================================
  // Find neighboring foreign provinces
  const neighborProvIds = new Set<string>();
  ownedProvinces.forEach(p => {
    p.neighborIds.forEach(nId => {
      const neighbor = provinces[nId];
      if (neighbor && neighbor.countryId !== countryId) {
        neighborProvIds.add(nId);
      }
    });
  });

  const neighboringProvinces = Array.from(neighborProvIds).map(id => provinces[id]);
  const neighboringCountryIds = Array.from(new Set(neighboringProvinces.map(p => p.countryId)));

  // Calculate military strength of this nation vs neighbors
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

  // ==========================================
  // 2. EVALUATE THREATS & MEMORY
  // ==========================================
  neighboringCountryIds.forEach(targetId => {
    const targetCountry = countries[targetId];
    if (!targetCountry || !targetCountry.isAlive) return;

    let relation = country.relations[targetId];
    if (!relation) {
      relation = {
        targetCountryId: targetId,
        status: 'PEACE',
        trustScore: 0,
        relationScore: 0,
        threatPerception: 30,
        militaryAccess: false,
        tradeAgreementActive: false,
        memory: {
          warsFought: 0,
          betrayals: 0,
          treatiesKept: 0,
          tradeVolume: 0,
          lastAggressionTurn: -1,
          summary: 'Diplomatic baseline.'
        }
      };
      country.relations[targetId] = relation;
    }

    // Threat perception increases if target has large military near border
    const targetBorderUnits = neighboringProvinces
      .filter(p => p.countryId === targetId)
      .reduce((sum, p) => sum + p.units.reduce((s, u) => s + u.count, 0), 0);

    const memoryHostilityPenalty = relation.memory.warsFought * 20 + relation.memory.betrayals * 35;
    const baseThreat = Math.min(100, (targetBorderUnits * 8 + memoryHostilityPenalty) * diffConfig.threatEvaluationWeight);
    relation.threatPerception = Math.round(baseThreat);

    // Opportunistic or Aggressive AI considers declaring war if weak target and low trust
    if (
      relation.status !== 'WAR' &&
      relation.status !== 'ALLIANCE' &&
      relation.status !== 'NON_AGGRESSION' &&
      (personality === 'Aggressive' || personality === 'Expansionist' || personality === 'Opportunistic')
    ) {
      const aggressionThreshold = personality === 'Aggressive' ? 0.35 : personality === 'Expansionist' ? 0.5 : 0.65;
      if (ourTotalAttack > (targetBorderUnits * 30 + 100) && Math.random() < (country.aiProfile.aggressionRate * 0.15)) {
        relation.status = 'WAR';
        targetCountry.relations[countryId].status = 'WAR';
        result.notifications.push({
          id: `war_decl_${turn}_${countryId}_${targetId}`,
          turn,
          type: 'DIPLOMACY',
          title: `War Declaration: ${country.name}`,
          message: `${country.name} has officially declared sovereign war against ${targetCountry.name}!`,
          countryId
        });
      }
    }
  });

  // ==========================================
  // 3. ECONOMIC DECISIONS (BUILDINGS)
  // ==========================================
  // If we have resources and open construction slots, build necessary infrastructure
  const activeQueuesForCountry = constructionQueue.filter(q => {
    const prov = provinces[q.provinceId];
    return prov && prov.countryId === countryId;
  }).length;

  if (activeQueuesForCountry < ownedProvinces.length && country.resources.money > 1200) {
    // Determine greatest resource bottleneck
    let neededBuilding: any = 'farm';
    if (country.resources.food < 1500) {
      neededBuilding = 'farm';
    } else if (country.resources.oil < 1200) {
      neededBuilding = 'oil_field';
    } else if (country.resources.energy < 1000) {
      neededBuilding = 'power_plant';
    } else if (country.resources.steel < 1000) {
      neededBuilding = 'steel_plant';
    } else if (country.resources.money < 3000) {
      neededBuilding = 'factory';
    } else if (country.completedTechs.length < 6) {
      neededBuilding = 'research_center';
    } else if (personality === 'Defensive' || personality === 'Aggressive') {
      neededBuilding = 'military_base';
    }

    const bDef = BUILDING_DEFINITIONS[neededBuilding as keyof typeof BUILDING_DEFINITIONS];
    if (bDef) {
      // Find suitable province without maxed building
      const candidateProv = ownedProvinces.find(p => {
        const existing = p.buildings.find(b => b.type === neededBuilding);
        return !existing || existing.level < bDef.maxLevel;
      });

      if (candidateProv) {
        let canAfford = true;
        Object.entries(bDef.baseCost).forEach(([res, cost]) => {
          if ((country.resources[res as keyof typeof country.resources] || 0) < (cost || 0)) {
            canAfford = false;
          }
        });

        if (canAfford) {
          Object.entries(bDef.baseCost).forEach(([res, cost]) => {
            country.resources[res as keyof typeof country.resources] -= (cost || 0);
          });
          const existing = candidateProv.buildings.find(b => b.type === neededBuilding);
          const nextLevel = existing ? existing.level + 1 : 1;
          constructionQueue.push({
            id: `cq_ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
  // 4. MILITARY RECRUITMENT DECISIONS
  // ==========================================
  const activeMilQueues = militaryQueue.filter(q => {
    const prov = provinces[q.provinceId];
    return prov && prov.countryId === countryId;
  }).length;

  if (activeMilQueues < 3 && country.resources.manpower > 2500 && country.resources.money > 1500) {
    let unitToBuild: UnitType = 'infantry';
    if (country.resources.steel > 1200 && country.resources.oil > 800) {
      unitToBuild = Math.random() > 0.4 ? 'armored_units' : 'mechanized_infantry';
    } else if (country.resources.energy > 600 && Math.random() > 0.5) {
      unitToBuild = 'drones';
    } else {
      unitToBuild = 'infantry';
    }

    const uDef = UNIT_DEFINITIONS[unitToBuild];
    if (uDef) {
      let canAfford = true;
      Object.entries(uDef.cost).forEach(([res, cost]) => {
        if ((country.resources[res as keyof typeof country.resources] || 0) < (cost || 0)) {
          canAfford = false;
        }
      });

      if (canAfford) {
        Object.entries(uDef.cost).forEach(([res, cost]) => {
          country.resources[res as keyof typeof country.resources] -= (cost || 0);
        });
        const spawnProv = ownedProvinces[0]; // deploy in primary/capital province
        militaryQueue.push({
          id: `mq_ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
  // 5. COMBAT & INVASION EXECUTION
  // ==========================================
  // Find if country is at war with any neighbor
  const hostileNeighborProvs = neighboringProvinces.filter(p => {
    const rel = country.relations[p.countryId];
    return rel && rel.status === 'WAR';
  });

  if (hostileNeighborProvs.length > 0) {
    // Pick the most vulnerable hostile border province
    const targetProv = hostileNeighborProvs.reduce((prev, curr) => {
      const prevDef = curr.units.reduce((s, u) => s + u.count, 0) + curr.defenseLevel * 2;
      const currDef = prev.units.reduce((s, u) => s + u.count, 0) + prev.defenseLevel * 2;
      return prevDef < currDef ? curr : prev;
    }, hostileNeighborProvs[0]);

    // Find our neighboring staging province with units
    const stagingProv = ownedProvinces.find(p => p.neighborIds.includes(targetProv.id) && p.units.length > 0);

    if (stagingProv && stagingProv.units.length > 0) {
      // Assess our attack power vs their defense
      const ourStagingAttack = stagingProv.units.reduce((sum, u) => {
        const def = UNIT_DEFINITIONS[u.type];
        return sum + (def ? def.attack * u.count : 0);
      }, 0);

      const theirEstDefense = targetProv.units.reduce((sum, u) => {
        const def = UNIT_DEFINITIONS[u.type];
        return sum + (def ? def.defense * u.count : 0);
      }, 0) + targetProv.defenseLevel * 40;

      // Only attack if confident ratio or aggressive personality
      const minRatio = personality === 'Aggressive' ? 1.05 : 1.35;
      if (ourStagingAttack >= theirEstDefense * minRatio) {
        // Send up to 70% of staging units to attack, keep 30% garrison
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

        const battle = simulateCombatEngagement({
          turn,
          attackerCountry: country,
          defenderCountry: countries[targetProv.countryId],
          targetProvince: targetProv,
          attackingUnits: unitsToAttack,
          sourceProvinceId: stagingProv.id
        });

        result.newBattles.push(battle);

        result.notifications.push({
          id: `combat_notif_${turn}_${Date.now()}`,
          turn,
          type: 'COMBAT',
          title: `Battle of ${targetProv.name}`,
          message: `${country.name} launched an assault on ${targetProv.name}! Victor: ${battle.victor === 'ATTACKER' ? country.name : countries[targetProv.countryId]?.name}.`,
          provinceId: targetProv.id,
          countryId
        });
      }
    }
  }

  // ==========================================
  // 6. RESEARCH PROGRESSION
  // ==========================================
  if (!country.currentResearch && country.resources.techPoints >= 100) {
    // Pick an unresearched tech
    const availableTechs = ['tech_composite_armor', 'tech_stealth_avionics', 'tech_deep_petroleum_drilling', 'tech_supercomputing', 'tech_logistics_optimization', 'tech_hardened_bunkers']
      .filter(t => !country.completedTechs.includes(t));
    if (availableTechs.length > 0) {
      const chosen = availableTechs[0];
      country.currentResearch = { techId: chosen, progress: 0 };
    }
  }

  return result;
}
