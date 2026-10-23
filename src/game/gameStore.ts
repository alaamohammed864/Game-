import { 
  BuildingType, 
  Country, 
  GameState, 
  Province, 
  ResourceKey, 
  UnitType, 
  UnitGroup, 
  BattleReport, 
  DiplomaticStatus,
  AIDifficulty
} from '../types';
import { generateInitialWorld } from '../map/worldData';
import { 
  BASE_MARKET_PRICES, 
  BUILDING_DEFINITIONS, 
  UNIT_DEFINITIONS, 
  TECH_TREE, 
  INITIAL_MISSIONS 
} from './config';
import { calculateCountryEconomy, executeMarketTrade } from '../economy/economyEngine';
import { processAITurn } from '../ai/aiEngine';
import { maybeTriggerRandomEvent } from './eventsEngine';
import { generateProvinceIntel } from '../intelligence/intelligenceEngine';
import { evaluateDiplomaticProposal } from '../diplomacy/diplomacyEngine';
import { simulateCombatEngagement } from '../combat/combatEngine';
import { storage } from '../storage/db';
import { sound } from '../audio/soundSystem';
import { ensureBilateralRelation, setBilateralDiplomaticStatus, validateWarDeclaration } from '../diplomacy/diplomacyUtils';

type Listener = () => void;

class GameStore {
  private state: GameState;
  private listeners: Set<Listener> = new Set();
  private timer: any = null;
  private autosaveCounter: number = 0;

  constructor() {
    this.state = this.createNewGame('NORMAL');
    this.startLoop();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public getState(): GameState {
    return this.state;
  }

  public createNewGame(difficulty: AIDifficulty = 'NORMAL', playerNationId: string = 'valyria'): GameState {
    const { countries, provinces } = generateInitialWorld(difficulty);
    
    // Set player nation
    Object.keys(countries).forEach(id => {
      countries[id].isPlayer = (id === playerNationId);
    });

    // Ensure all country bilateral relations are initialized symmetrically
    const countryList = Object.values(countries);
    for (let i = 0; i < countryList.length; i++) {
      for (let j = i + 1; j < countryList.length; j++) {
        ensureBilateralRelation(countryList[i], countryList[j]);
      }
    }

    const newState: GameState = {
      version: '2.0.0',
      gameId: `gc_${Date.now()}`,
      currentTurn: 1,
      currentDate: 'OCTOBER 2026',
      isPaused: true, // Start paused so player can inspect and plan
      gameSpeed: 1,
      playerCountryId: playerNationId,
      activeDifficulty: difficulty,
      isDevMode: false,
      fogOfWarRevealed: false,
      unlimitedGoldDev: false,
      unlimitedResourcesDev: false,
      instantBuildDev: false,
      instantResearchDev: false,
      countries,
      provinces,
      constructionQueue: [],
      militaryQueue: [],
      recentBattles: [],
      notifications: [
        {
          id: 'init_welcome',
          turn: 1,
          type: 'EVENT',
          title: 'Command Center Online',
          message: 'Supreme Military High Command initialized. Welcome to the theatre of operations, Commander.'
        }
      ],
      activeEvents: [],
      missions: JSON.parse(JSON.stringify(INITIAL_MISSIONS)),
      intelReports: [],
      tradeMarketPrices: { ...BASE_MARKET_PRICES }
    };

    this.state = newState;
    this.notify();
    return newState;
  }

  public loadSavedState(loadedState: GameState) {
    // Deep validation & fallback defaults for dev flags
    if (loadedState.unlimitedGoldDev === undefined) loadedState.unlimitedGoldDev = false;
    if (loadedState.unlimitedResourcesDev === undefined) loadedState.unlimitedResourcesDev = false;
    if (loadedState.instantBuildDev === undefined) loadedState.instantBuildDev = false;
    if (loadedState.instantResearchDev === undefined) loadedState.instantResearchDev = false;

    // Harmonize bilateral diplomacy
    const countryList = Object.values(loadedState.countries);
    for (let i = 0; i < countryList.length; i++) {
      for (let j = i + 1; j < countryList.length; j++) {
        ensureBilateralRelation(countryList[i], countryList[j]);
      }
    }

    this.state = loadedState;
    this.notify();
  }

  // ============================================
  // TIME & SPEED CONTROLS
  // ============================================
  public togglePause() {
    this.state.isPaused = !this.state.isPaused;
    sound.playClick();
    this.notify();
  }

  public setSpeed(speed: 1 | 2 | 5) {
    this.state.gameSpeed = speed;
    sound.playClick();
    this.restartLoop();
    this.notify();
  }

  public stopLoop() {
    if (this.timer !== null) {
      if (typeof window !== 'undefined') {
        window.clearInterval(this.timer);
      } else {
        clearInterval(this.timer);
      }
      this.timer = null;
    }
  }

  private restartLoop() {
    this.stopLoop();
    this.startLoop();
  }

  private startLoop() {
    this.stopLoop();
    const intervalMs = Math.round(3500 / this.state.gameSpeed);
    const ticker = () => {
      if (!this.state.isPaused) {
        this.advanceTurn();
      }
    };

    if (typeof window !== 'undefined') {
      this.timer = window.setInterval(ticker, intervalMs);
    } else {
      this.timer = setInterval(ticker, intervalMs);
    }
  }

  public dispose() {
    this.stopLoop();
    this.listeners.clear();
  }

  // ============================================
  // RESOURCE TRANSACTION ENGINE (CENTRALIZED)
  // ============================================
  public canAfford(countryId: string, costs: Partial<Record<ResourceKey, number>>): boolean {
    const country = this.state.countries[countryId];
    if (!country) return false;
    const isPlayer = countryId === this.state.playerCountryId;

    if (isPlayer && this.state.isDevMode && this.state.unlimitedResourcesDev) {
      return true;
    }

    for (const [key, cost] of Object.entries(costs)) {
      const resKey = key as ResourceKey;
      const numCost = cost || 0;
      if (numCost <= 0) continue;

      if (resKey === 'gold' && isPlayer && this.state.isDevMode && (this.state.unlimitedGoldDev || this.state.unlimitedResourcesDev)) {
        continue;
      }

      const available = country.resources[resKey] || 0;
      if (available < numCost) {
        return false;
      }
    }
    return true;
  }

  public executeTransaction(countryId: string, costs: Partial<Record<ResourceKey, number>>): boolean {
    if (!this.canAfford(countryId, costs)) return false;

    const country = this.state.countries[countryId];
    if (!country) return false;
    const isPlayer = countryId === this.state.playerCountryId;

    if (isPlayer && this.state.isDevMode && this.state.unlimitedResourcesDev) {
      return true;
    }

    for (const [key, cost] of Object.entries(costs)) {
      const resKey = key as ResourceKey;
      const numCost = cost || 0;
      if (numCost <= 0) continue;

      if (resKey === 'gold' && isPlayer && this.state.isDevMode && (this.state.unlimitedGoldDev || this.state.unlimitedResourcesDev)) {
        continue;
      }

      country.resources[resKey] = Math.max(0, Math.round((country.resources[resKey] || 0) - numCost));
    }
    return true;
  }

  // ============================================
  // MAIN GAME TURN SIMULATION LOOP (13 Steps)
  // ============================================
  public advanceTurn() {
    this.advanceTurnInternal();
    this.notify();
  }

  private advanceTurnInternal() {
    const s = this.state;
    s.currentTurn += 1;

    // Date formatting: each turn is ~1 month
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    const startYear = 2026;
    const monthIndex = (s.currentTurn - 1 + 9) % 12; // Oct is index 9
    const year = startYear + Math.floor((s.currentTurn - 1 + 9) / 12);
    s.currentDate = `${months[monthIndex]} ${year}`;

    // 1 & 2. Economy & Resource Production for all countries
    Object.values(s.countries).forEach(country => {
      if (!country.isAlive) return;

      const { balance, shortages } = calculateCountryEconomy(country, s.provinces, s.countries);

      // Apply resource updates
      const keys: ResourceKey[] = ['money', 'oil', 'steel', 'food', 'energy', 'rareMaterials', 'techPoints', 'manpower'];
      keys.forEach(k => {
        country.resources[k] = Math.max(0, Math.round(country.resources[k] + balance[k].net));
      });

      // Gold replenishment for player in normal gameplay
      if (country.isPlayer && !s.isDevMode) {
        country.resources.gold += 1;
      }

      // If shortages exist for player, notify
      if (country.isPlayer) {
        if (shortages.oil) {
          s.notifications.unshift({
            id: `short_oil_${s.currentTurn}`,
            turn: s.currentTurn,
            type: 'ECONOMY',
            title: 'Critical Oil Shortage',
            message: 'National crude reserves are empty! Vehicle and aerial combat effectiveness reduced by 50%.'
          });
          sound.playAlertSiren();
        }
        if (shortages.food) {
          s.notifications.unshift({
            id: `short_food_${s.currentTurn}`,
            turn: s.currentTurn,
            type: 'ECONOMY',
            title: 'Critical Food Deficit',
            message: 'Severe civilian food shortage! National stability is plummeting.'
          });
        }
      }
    });

    // 3. Population & Stability Drift
    Object.values(s.provinces).forEach(p => {
      const country = s.countries[p.countryId];
      if (!country) return;
      if (country.resources.food <= 0) {
        p.stability = Math.max(10, p.stability - 2);
      } else if (p.stability < 95) {
        p.stability = Math.min(100, p.stability + 1);
      }
    });

    // 4. Construction Queue Progress
    const remainingCQ: any[] = [];
    s.constructionQueue.forEach(item => {
      item.turnsRemaining -= 1;
      if (item.turnsRemaining <= 0) {
        const prov = s.provinces[item.provinceId];
        if (prov) {
          const existing = prov.buildings.find(b => b.type === item.type);
          if (existing) {
            existing.level = item.targetLevel;
          } else {
            prov.buildings.push({ type: item.type, level: item.targetLevel });
          }

          if (prov.countryId === s.playerCountryId) {
            s.notifications.unshift({
              id: `const_comp_${s.currentTurn}_${item.id}`,
              turn: s.currentTurn,
              type: 'ECONOMY',
              title: 'Construction Completed',
              message: `${BUILDING_DEFINITIONS[item.type]?.name || item.type} (Level ${item.targetLevel}) completed in ${prov.name}.`,
              provinceId: prov.id
            });
            sound.playSelect();
          }
        }
      } else {
        remainingCQ.push(item);
      }
    });
    s.constructionQueue = remainingCQ;

    // 5. Research Progress
    Object.values(s.countries).forEach(country => {
      if (country.currentResearch) {
        const tech = TECH_TREE.find(t => t.id === country.currentResearch!.techId);
        if (tech) {
          country.currentResearch.progress += Math.max(25, country.resources.techPoints * 0.25);
          if (country.currentResearch.progress >= tech.cost) {
            country.completedTechs.push(tech.id);
            country.currentResearch = null;

            if (country.isPlayer) {
              s.notifications.unshift({
                id: `tech_comp_${s.currentTurn}_${tech.id}`,
                turn: s.currentTurn,
                type: 'RESEARCH',
                title: 'Breakthrough Researched',
                message: `National R&D has successfully unlocked: ${tech.name}!`
              });
              sound.playTechResearched();
            }
          }
        }
      }
    });

    // 6. Military Production Queue Progress
    const remainingMQ: any[] = [];
    s.militaryQueue.forEach(item => {
      item.turnsRemaining -= 1;
      if (item.turnsRemaining <= 0) {
        const prov = s.provinces[item.provinceId];
        if (prov) {
          const existing = prov.units.find(u => u.type === item.unitType);
          if (existing) {
            existing.count += item.count;
          } else {
            prov.units.push({
              id: `u_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              type: item.unitType,
              count: item.count,
              experience: 25,
              morale: 95,
              supply: 100
            });
          }

          if (prov.countryId === s.playerCountryId) {
            s.notifications.unshift({
              id: `mil_comp_${s.currentTurn}_${item.id}`,
              turn: s.currentTurn,
              type: 'MILITARY',
              title: 'Units Mobilized',
              message: `${item.count}x ${UNIT_DEFINITIONS[item.unitType]?.name || item.unitType} deployed to ${prov.name}.`,
              provinceId: prov.id
            });
            sound.playMarch();
          }
        }
      } else {
        remainingMQ.push(item);
      }
    });
    s.militaryQueue = remainingMQ;

    // 7. Supply & Logistics replenishment
    Object.values(s.provinces).forEach(p => {
      const country = s.countries[p.countryId];
      const hasDepot = p.hasMilitaryBase || p.buildings.some(b => b.type === 'military_base');
      p.units.forEach(u => {
        if (country && country.resources.oil <= 0) {
          u.supply = Math.max(30, u.supply - 15);
        } else {
          u.supply = Math.min(100, u.supply + (hasDepot ? 20 : 10));
        }
      });
    });

    // 8, 9 & 10. AI Decisions, Diplomacy & Autonomous Combat
    Object.keys(s.countries).forEach(cId => {
      if (cId !== s.playerCountryId) {
        const aiResult = processAITurn(
          cId,
          s.currentTurn,
          s.countries,
          s.provinces,
          s.constructionQueue,
          s.militaryQueue
        );

        if (aiResult.newBattles.length > 0) {
          aiResult.newBattles.forEach(b => {
            s.recentBattles.unshift(b);
            sound.playCombatExplosion();
          });
        }

        if (aiResult.notifications.length > 0) {
          aiResult.notifications.forEach(n => s.notifications.unshift(n));
        }
      }
    });

    // 11. Dynamic Events Check
    const maybeEvent = maybeTriggerRandomEvent(s);
    if (maybeEvent) {
      s.activeEvents.push(maybeEvent);
      sound.playAlertSiren();
    }

    // 12. Mission Objectives Evaluation
    this.updateMissions();

    // 13. Dynamic Market Fluctuations
    const keys: ResourceKey[] = ['oil', 'steel', 'food', 'energy', 'rareMaterials'];
    keys.forEach(k => {
      const delta = (Math.random() - 0.5) * 2;
      s.tradeMarketPrices[k] = Math.max(5, Math.round((s.tradeMarketPrices[k] + delta) * 10) / 10);
    });

    // Trim old notifications & battles
    if (s.notifications.length > 35) s.notifications = s.notifications.slice(0, 35);
    if (s.recentBattles.length > 20) s.recentBattles = s.recentBattles.slice(0, 20);

    // Autosave check
    this.autosaveCounter += 1;
    if (this.autosaveCounter >= 5) {
      this.autosaveCounter = 0;
      storage.saveGame('autosave', 'Autosave Slot', s, true).catch(() => {});
    }
  }

  // ============================================
  // MISSIONS & OBJECTIVES
  // ============================================
  private updateMissions() {
    const s = this.state;
    const player = s.countries[s.playerCountryId];
    if (!player) return;

    const ownedProvinces = Object.values(s.provinces).filter(p => p.countryId === s.playerCountryId);

    s.missions.forEach(m => {
      if (m.isCompleted) return;

      if (m.id === 'mission_industrial_giant') {
        const { balance } = calculateCountryEconomy(player, s.provinces, s.countries);
        m.progress = Math.max(0, balance.money.production);
        if (m.progress >= m.goal) m.isCompleted = true;
      } else if (m.id === 'mission_strategic_territory') {
        m.progress = ownedProvinces.length;
        if (m.progress >= m.goal) m.isCompleted = true;
      } else if (m.id === 'mission_tech_mastery') {
        m.progress = player.completedTechs.length;
        if (m.progress >= m.goal) m.isCompleted = true;
      } else if (m.id === 'mission_coalition_architect') {
        const alliances = Object.values(player.relations).filter(r => r.status === 'ALLIANCE' || r.status === 'DEFENSIVE_PACT').length;
        m.progress = alliances;
        if (m.progress >= m.goal) m.isCompleted = true;
      } else if (m.id === 'mission_oil_autarky') {
        m.progress = player.resources.oil;
        if (m.progress >= m.goal) m.isCompleted = true;
      }
    });
  }

  public claimMissionReward(missionId: string) {
    const s = this.state;
    const mission = s.missions.find(m => m.id === missionId);
    const player = s.countries[s.playerCountryId];
    if (mission && mission.isCompleted && !mission.isClaimed && player) {
      mission.isClaimed = true;
      Object.entries(mission.rewards).forEach(([res, amt]) => {
        if (amt) {
          player.resources[res as ResourceKey] += amt;
        }
      });
      sound.playVictory();
      s.notifications.unshift({
        id: `mission_reward_${Date.now()}`,
        turn: s.currentTurn,
        type: 'EVENT',
        title: 'Mission Objective Fulfilled!',
        message: `Claimed strategic reward for: ${mission.titleKey}.`
      });
      this.notify();
    }
  }

  // ============================================
  // PLAYER ACTIONS (BUILD, RECRUIT, COMBAT, DIPLOMACY)
  // ============================================
  public queueBuilding(provinceId: string, type: BuildingType): boolean {
    const s = this.state;
    const prov = s.provinces[provinceId];
    const player = s.countries[s.playerCountryId];
    if (!prov || !player || prov.countryId !== s.playerCountryId) return false;

    const bDef = BUILDING_DEFINITIONS[type];
    if (!bDef) return false;

    const existing = prov.buildings.find(b => b.type === type);
    const currentLevel = existing ? existing.level : 0;
    if (currentLevel >= bDef.maxLevel) return false;

    // Validate resource costs
    if (!this.canAfford(s.playerCountryId, bDef.baseCost)) {
      return false;
    }

    const isInstant = s.isDevMode && (s.instantBuildDev || s.unlimitedResourcesDev);

    if (isInstant) {
      if (existing) existing.level += 1;
      else prov.buildings.push({ type, level: 1 });
      sound.playSelect();
    } else {
      this.executeTransaction(s.playerCountryId, bDef.baseCost);
      s.constructionQueue.push({
        id: `cq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        provinceId,
        type,
        targetLevel: currentLevel + 1,
        turnsRemaining: bDef.baseBuildTurns,
        totalTurns: bDef.baseBuildTurns
      });
      sound.playClick();
    }

    this.notify();
    return true;
  }

  public queueMilitary(provinceId: string, unitType: UnitType, count: number = 1): boolean {
    const s = this.state;
    const prov = s.provinces[provinceId];
    const player = s.countries[s.playerCountryId];
    if (!prov || !player || prov.countryId !== s.playerCountryId || count <= 0) return false;

    const uDef = UNIT_DEFINITIONS[unitType];
    if (!uDef) return false;

    // Check port/airbase requirements
    if (uDef.branch === 'NAVY' && !prov.hasPort && !prov.buildings.some(b => b.type === 'port')) {
      return false;
    }
    if (uDef.branch === 'AIR' && !prov.hasAirbase && !prov.buildings.some(b => b.type === 'airport')) {
      return false;
    }

    // Multiply costs by count
    const totalCost: Partial<Record<ResourceKey, number>> = {};
    for (const [res, cost] of Object.entries(uDef.cost)) {
      totalCost[res as ResourceKey] = (cost || 0) * count;
    }

    if (!this.canAfford(s.playerCountryId, totalCost)) {
      return false;
    }

    const isInstant = s.isDevMode && (s.instantBuildDev || s.unlimitedResourcesDev);

    if (isInstant) {
      const existing = prov.units.find(u => u.type === unitType);
      if (existing) existing.count += count;
      else {
        prov.units.push({
          id: `u_${Date.now()}`,
          type: unitType,
          count,
          experience: 40,
          morale: 100,
          supply: 100
        });
      }
      sound.playMarch();
    } else {
      this.executeTransaction(s.playerCountryId, totalCost);
      s.militaryQueue.push({
        id: `mq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        provinceId,
        unitType,
        count,
        turnsRemaining: uDef.productionTurns,
        totalTurns: uDef.productionTurns
      });
      sound.playClick();
    }

    this.notify();
    return true;
  }

  public launchPlayerAttack(fromProvinceId: string, targetProvinceId: string, unitGroupIds: string[]): BattleReport | null {
    const s = this.state;
    const fromProv = s.provinces[fromProvinceId];
    const targetProv = s.provinces[targetProvinceId];
    const player = s.countries[s.playerCountryId];

    if (!fromProv || !targetProv || !player) return null;
    if (fromProv.countryId !== s.playerCountryId) return null;
    if (!fromProv.neighborIds.includes(targetProvinceId)) return null;

    const defenderCountry = s.countries[targetProv.countryId];
    if (!defenderCountry) return null;

    // Filter attacking units
    const attackingUnits: UnitGroup[] = [];
    const remainingUnits: UnitGroup[] = [];

    fromProv.units.forEach(u => {
      if (unitGroupIds.includes(u.id)) {
        attackingUnits.push({ ...u });
      } else {
        remainingUnits.push(u);
      }
    });

    if (attackingUnits.length === 0) return null;

    // Remove from source province
    fromProv.units = remainingUnits;

    // Harmonize bilateral diplomatic state to WAR safely
    setBilateralDiplomaticStatus(player, defenderCountry, 'WAR', -50, s.currentTurn);

    // Execute battle
    const battle = simulateCombatEngagement({
      turn: s.currentTurn,
      attackerCountry: player,
      defenderCountry,
      targetProvince: targetProv,
      attackingUnits,
      sourceProvinceId: fromProvinceId
    });

    s.recentBattles.unshift(battle);
    if (battle.victor === 'ATTACKER') {
      sound.playVictory();
    } else {
      sound.playDefeat();
    }

    this.notify();
    return battle;
  }

  public conductSatelliteRecon(targetProvinceId: string): boolean {
    const s = this.state;
    const player = s.countries[s.playerCountryId];
    const targetProv = s.provinces[targetProvinceId];
    if (!player || !targetProv) return false;

    const cost = 250;
    if (!this.executeTransaction(s.playerCountryId, { money: cost })) {
      return false;
    }

    const hasIntelHQ = Object.values(s.provinces)
      .filter(p => p.countryId === s.playerCountryId)
      .some(p => p.buildings.some(b => b.type === 'intelligence_center'));

    const targetCountry = s.countries[targetProv.countryId];
    const report = generateProvinceIntel(targetCountry, targetProv, s.currentTurn, hasIntelHQ);

    s.intelReports = s.intelReports.filter(r => r.targetProvinceId !== targetProvinceId);
    s.intelReports.unshift(report);

    sound.playSelect();
    this.notify();
    return true;
  }

  public sendDiplomaticProposal(targetCountryId: string, proposal: any): { accepted: boolean; message: string } {
    const s = this.state;
    const player = s.countries[s.playerCountryId];
    const target = s.countries[targetCountryId];
    if (!player || !target) return { accepted: false, message: 'Invalid target nation.' };

    const result = evaluateDiplomaticProposal(player, target, proposal);
    if (result.accepted) {
      sound.playSelect();
      if (proposal === 'ALLIANCE' || proposal === 'DEFENSIVE_PACT' || proposal === 'NON_AGGRESSION' || proposal === 'PEACE') {
        setBilateralDiplomaticStatus(player, target, proposal, 20, s.currentTurn);
      } else if (proposal === 'TRADE_DEAL') {
        const rels = ensureBilateralRelation(player, target);
        if (rels) {
          rels.relAtoB.tradeAgreementActive = true;
          rels.relBtoA.tradeAgreementActive = true;
        }
      }
    } else {
      sound.playAlertSiren();
    }

    this.notify();
    return result;
  }

  public declareWar(targetCountryId: string) {
    const s = this.state;
    const player = s.countries[s.playerCountryId];
    const target = s.countries[targetCountryId];
    if (!player || !target) return;

    const warVal = validateWarDeclaration(player, target);
    if (!warVal.valid) return;

    setBilateralDiplomaticStatus(player, target, 'WAR', -80, s.currentTurn);

    sound.playCombatExplosion();
    s.notifications.unshift({
      id: `war_decl_${s.currentTurn}_${Date.now()}`,
      turn: s.currentTurn,
      type: 'DIPLOMACY',
      title: 'State of War Declared!',
      message: `You have formally declared sovereign war against ${target.name}. Hostilities commenced immediately.`
    });
    this.notify();
  }

  public startResearch(techId: string): boolean {
    const s = this.state;
    const player = s.countries[s.playerCountryId];
    if (!player) return false;

    const tech = TECH_TREE.find(t => t.id === techId);
    if (!tech || player.completedTechs.includes(techId)) return false;

    // Check prerequisites
    for (const prereq of tech.prerequisites) {
      if (!player.completedTechs.includes(prereq)) return false;
    }

    // Dev mode instant research check
    if (s.isDevMode && (s.instantResearchDev || s.unlimitedResourcesDev)) {
      player.completedTechs.push(techId);
      player.currentResearch = null;
      sound.playTechResearched();
      this.notify();
      return true;
    }

    player.currentResearch = { techId, progress: 0 };
    sound.playSelect();
    this.notify();
    return true;
  }

  public tradeResource(resource: ResourceKey, amount: number, isBuying: boolean): { success: boolean; message: string } {
    const s = this.state;
    const player = s.countries[s.playerCountryId];
    if (!player) return { success: false, message: 'Invalid state' };

    const res = executeMarketTrade(player, resource, amount, isBuying, s.tradeMarketPrices);
    if (res.success) {
      sound.playClick();
      this.notify();
    }
    return res;
  }

  // ============================================
  // DEVELOPER MODE & CONSOLE (Ctrl+Shift+D)
  // ============================================
  public toggleDevMode() {
    this.state.isDevMode = !this.state.isDevMode;
    sound.playSelect();
    this.notify();
  }

  public setUnlimitedGoldDev(enabled: boolean) {
    this.state.unlimitedGoldDev = enabled;
    sound.playSelect();
    this.notify();
  }

  public setUnlimitedResourcesDev(enabled: boolean) {
    this.state.unlimitedResourcesDev = enabled;
    sound.playSelect();
    this.notify();
  }

  public setInstantBuildDev(enabled: boolean) {
    this.state.instantBuildDev = enabled;
    sound.playSelect();
    this.notify();
  }

  public setInstantResearchDev(enabled: boolean) {
    this.state.instantResearchDev = enabled;
    sound.playSelect();
    this.notify();
  }

  public toggleFogOfWarDev() {
    this.state.fogOfWarRevealed = !this.state.fogOfWarRevealed;
    sound.playSelect();
    this.notify();
  }

  public devAddResources(amount = 50000) {
    const p = this.state.countries[this.state.playerCountryId];
    if (p) {
      p.resources.money += amount;
      p.resources.oil += amount;
      p.resources.steel += amount;
      p.resources.food += amount;
      p.resources.energy += amount;
      p.resources.rareMaterials += amount;
      p.resources.manpower += amount;
      p.resources.techPoints += 2000;
      p.resources.gold += 1000;
      sound.playSelect();
      this.notify();
    }
  }

  public devCompleteAllResearch() {
    const p = this.state.countries[this.state.playerCountryId];
    if (p) {
      p.completedTechs = TECH_TREE.map(t => t.id);
      p.currentResearch = null;
      sound.playTechResearched();
      this.notify();
    }
  }

  public devSpawnStrikeCorps(provinceId: string) {
    const prov = this.state.provinces[provinceId];
    if (prov) {
      prov.units.push({
        id: `u_dev_${Date.now()}_1`,
        type: 'armored_units',
        count: 5,
        experience: 90,
        morale: 100,
        supply: 100
      });
      prov.units.push({
        id: `u_dev_${Date.now()}_2`,
        type: 'special_forces',
        count: 3,
        experience: 95,
        morale: 100,
        supply: 100
      });
      prov.units.push({
        id: `u_dev_${Date.now()}_3`,
        type: 'fighters',
        count: 4,
        experience: 90,
        morale: 100,
        supply: 100
      });
      sound.playMarch();
      this.notify();
    }
  }

  public assignGeneral(generalId: string, provinceId: string | null) {
    const player = this.state.countries[this.state.playerCountryId];
    if (!player) return;
    const general = player.generals?.find(g => g.id === generalId);
    if (general) {
      general.assignedProvinceId = provinceId;
      sound.playSelect();
      this.notify();
    }
  }

  public promoteGeneral(generalId: string): boolean {
    const player = this.state.countries[this.state.playerCountryId];
    if (!player) return false;
    const general = player.generals?.find(g => g.id === generalId);
    if (!general) return false;

    const goldCost = 20;
    if (!this.executeTransaction(this.state.playerCountryId, { gold: goldCost })) {
      return false;
    }

    general.level += 1;
    general.attackBonus += 0.05;
    general.defenseBonus += 0.05;
    general.speedBonus += 0.05;
    sound.playVictory();
    this.notify();
    return true;
  }

  public launchBallisticMissile(targetProvinceId: string): { success: boolean; intercepted: boolean; damageDealt: number; message: string } {
    const s = this.state;
    const player = s.countries[s.playerCountryId];
    const targetProv = s.provinces[targetProvinceId];
    if (!player || !targetProv) {
      return { success: false, intercepted: false, damageDealt: 0, message: 'Invalid launch coordinates.' };
    }

    if ((player.ballisticMissiles || 0) <= 0 && (!s.isDevMode || !s.unlimitedResourcesDev)) {
      return { success: false, intercepted: false, damageDealt: 0, message: 'No armed ballistic missiles remaining in sovereign silos.' };
    }

    if (!s.isDevMode || !s.unlimitedResourcesDev) {
      player.ballisticMissiles = Math.max(0, (player.ballisticMissiles || 0) - 1);
    }

    // Interception check
    const hasAirDefense = targetProv.units.some(u => u.type === 'air_defense');
    const hasRadar = targetProv.buildings.some(b => b.type === 'radar_station');
    const interceptChance = (hasAirDefense ? 0.35 : 0.05) + (hasRadar ? 0.15 : 0);

    const isIntercepted = Math.random() < interceptChance;

    if (isIntercepted) {
      sound.playAlertSiren();
      s.notifications.unshift({
        id: `strike_inter_${Date.now()}`,
        turn: s.currentTurn,
        type: 'COMBAT',
        title: 'Missile Intercepted!',
        message: `Your ballistic strike on ${targetProv.name} was shot down mid-trajectory by enemy air-defense shield.`
      });
      this.notify();
      return {
        success: false,
        intercepted: true,
        damageDealt: 0,
        message: `Enemy interceptors deployed! Warhead intercepted over ${targetProv.name} air space.`
      };
    }

    // Direct structural & garrison impact
    sound.playCombatExplosion();
    const prevDefense = targetProv.defenseLevel;
    targetProv.defenseLevel = Math.max(0, targetProv.defenseLevel - 2);
    targetProv.stability = Math.max(10, targetProv.stability - 35);

    let unitsEliminated = 0;
    targetProv.units.forEach(u => {
      const lost = Math.max(1, Math.round(u.count * 0.4));
      u.count = Math.max(0, u.count - lost);
      u.morale = Math.max(15, u.morale - 40);
      unitsEliminated += lost;
    });
    targetProv.units = targetProv.units.filter(u => u.count > 0);

    const targetCountry = s.countries[targetProv.countryId];
    if (targetCountry) {
      setBilateralDiplomaticStatus(player, targetCountry, 'WAR', -50, s.currentTurn);
    }

    s.notifications.unshift({
      id: `strike_hit_${Date.now()}`,
      turn: s.currentTurn,
      type: 'COMBAT',
      title: 'Devastating Missile Impact!',
      message: `Direct ballistic impact on ${targetProv.name}! Fortifications decimated, ${unitsEliminated} regiments wiped out.`
    });

    this.notify();
    return {
      success: true,
      intercepted: false,
      damageDealt: unitsEliminated,
      message: `Impact confirmed on ${targetProv.name}! Defense dropped from Tier ${prevDefense} to ${targetProv.defenseLevel}. Heavy enemy casualties reported.`
    };
  }

  public devAdvanceTurns(count: number) {
    for (let i = 0; i < count; i++) {
      this.advanceTurnInternal();
    }
    this.notify();
  }

  public devSwitchCountry(countryId: string) {
    if (this.state.countries[countryId]) {
      Object.values(this.state.countries).forEach(c => c.isPlayer = (c.id === countryId));
      this.state.playerCountryId = countryId;
      sound.playSelect();
      this.notify();
    }
  }
}

export const gameStore = new GameStore();
