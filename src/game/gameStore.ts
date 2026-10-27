import { 
  BuildingType, 
  Country, 
  GameState, 
  Province, 
  ResourceKey, 
  UnitType, 
  UnitGroup, 
  BattleReport, 
  MissileStrikeRecord,
  DiplomaticStatus,
  DiplomaticProposal,
  AIDifficulty
} from '../types';
import { generateInitialWorld } from '../map/worldData';
import { 
  BASE_MARKET_PRICES, 
  BUILDING_DEFINITIONS, 
  UNIT_DEFINITIONS, 
  TECH_TREE, 
  INITIAL_MISSIONS,
  AI_DIFFICULTY_MODIFIERS
} from './config';
import { calculateCountryEconomy, executeMarketTrade } from '../economy/economyEngine';
import { processAITurn } from '../ai/aiEngine';
import { maybeTriggerRandomEvent } from './eventsEngine';
import { generateProvinceIntel } from '../intelligence/intelligenceEngine';
import { evaluateDiplomaticProposal } from '../diplomacy/diplomacyEngine';
import { simulateCombatEngagement } from '../combat/combatEngine';
import { storage } from '../storage/db';
import { sound } from '../audio/soundSystem';
import { callDefensiveAllies, ensureBilateralRelation, setBilateralDiplomaticStatus, validateWarDeclaration } from '../diplomacy/diplomacyUtils';
import { mergeUnitGroups } from '../utils/unitGroups';

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
      missileStrikes: [],
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
      tradeMarketPrices: { ...BASE_MARKET_PRICES },
      gameOver: null
    };

    this.state = newState;
    this.autosaveCounter = 0;
    this.restartLoop(); // make sure the timer matches the new game's speed
    this.notify();
    return newState;
  }

  public loadSavedState(loadedState: GameState) {
    loadedState.missileStrikes ??= [];
    // Fill in anything an older save may lack so the rest of the engine can rely on it
    loadedState.unlimitedGoldDev ??= false;
    loadedState.unlimitedResourcesDev ??= false;
    loadedState.instantBuildDev ??= false;
    loadedState.instantResearchDev ??= false;
    loadedState.isDevMode ??= false;
    loadedState.fogOfWarRevealed ??= false;
    loadedState.gameOver ??= null;
    loadedState.notifications ??= [];
    loadedState.recentBattles ??= [];
    loadedState.activeEvents ??= [];
    loadedState.intelReports ??= [];
    loadedState.constructionQueue ??= [];
    loadedState.militaryQueue ??= [];
    loadedState.missions ??= JSON.parse(JSON.stringify(INITIAL_MISSIONS));
    loadedState.tradeMarketPrices = { ...BASE_MARKET_PRICES, ...(loadedState.tradeMarketPrices || {}) };
    if (![1, 2, 5].includes(loadedState.gameSpeed)) loadedState.gameSpeed = 1;
    if (!loadedState.activeDifficulty) loadedState.activeDifficulty = 'NORMAL';

    Object.values(loadedState.countries).forEach(c => {
      c.completedTechs ??= [];
      c.currentResearch ??= null;
      c.ballisticMissiles ??= 0;
    });
    // Harmonize bilateral diplomacy
    const countryList = Object.values(loadedState.countries);
    for (let i = 0; i < countryList.length; i++) {
      for (let j = i + 1; j < countryList.length; j++) {
        ensureBilateralRelation(countryList[i], countryList[j]);
      }
    }

    loadedState.isPaused = true; // never resume mid-turn straight after loading
    this.state = loadedState;
    this.autosaveCounter = 0;
    this.restartLoop();
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
    if (s.gameOver && !s.gameOver.acknowledged) return; // campaign has ended
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

      // Difficulty: AI nations earn more (or less) money than their raw economy yields
      if (!country.isPlayer && balance.money.net > 0) {
        const competence = AI_DIFFICULTY_MODIFIERS[country.aiProfile.difficulty]?.economicCompetence ?? 1;
        balance.money.net = Math.round(balance.money.net * competence);
      }

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
        if (prov && item.ownerCountryId && prov.countryId !== item.ownerCountryId) {
          // Province was conquered while under construction: the project is lost
        } else if (prov) {
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
        if (prov && item.ownerCountryId && prov.countryId !== item.ownerCountryId) {
          // Province was conquered while units were in production: the order is lost
        } else if (prov) {
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
      s.notifications.unshift({
        id: `notif_${maybeEvent.id}`,
        turn: s.currentTurn,
        type: 'EVENT',
        title: `Directive: ${maybeEvent.titleKey}`,
        message: maybeEvent.descKey
      });
      sound.playAlertSiren();
    }

    // 12. Mission Objectives Evaluation
    this.updateMissions();

    // 13. Dynamic Market Fluctuations
    const keys: ResourceKey[] = ['oil', 'steel', 'food', 'energy', 'rareMaterials'];
    keys.forEach(k => {
      const base = BASE_MARKET_PRICES[k];
      const noise = (Math.random() - 0.5) * 2;
      const pull = (base - s.tradeMarketPrices[k]) * 0.08; // drift back toward the base price
      const next = s.tradeMarketPrices[k] + noise + pull;
      s.tradeMarketPrices[k] = Math.round(Math.min(base * 2.5, Math.max(base * 0.4, next)) * 10) / 10;
    });

    // Strategic reserves: one new ballistic missile every 10 turns (cap 6)
    if (s.currentTurn % 10 === 0) {
      Object.values(s.countries).forEach(c => {
        if (c.isAlive) c.ballisticMissiles = Math.min(6, (c.ballisticMissiles || 0) + 1);
      });
    }

    // Trim old notifications & battles
    if (s.notifications.length > 35) s.notifications = s.notifications.slice(0, 35);
    if (s.recentBattles.length > 20) s.recentBattles = s.recentBattles.slice(0, 20);

    // Eliminations, victory and defeat
    this.evaluateWorldState();

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

    // One project per building type per province at a time (otherwise you pay twice for the same level)
    if (s.constructionQueue.some(q => q.provinceId === provinceId && q.type === type)) return false;

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
        totalTurns: bDef.baseBuildTurns,
        ownerCountryId: s.playerCountryId
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
    if (!prov || !player || prov.countryId !== s.playerCountryId) return false;
    if (!Number.isInteger(count) || count <= 0) return false;

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
          id: `u_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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
        totalTurns: uDef.productionTurns,
        ownerCountryId: s.playerCountryId
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
    if (defenderCountry.id === s.playerCountryId) return null; // cannot attack your own territory
    if (!defenderCountry.isAlive) return null;

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

    // Striking a treaty partner is a betrayal; then harmonize bilateral state to WAR safely
    this.registerTreatyBetrayal(player, defenderCountry);
    setBilateralDiplomaticStatus(player, defenderCountry, 'WAR', -50, s.currentTurn);
    const interveningAllies = callDefensiveAllies(defenderCountry, player, s.countries, s.currentTurn);
    interveningAllies.forEach(ally => s.notifications.unshift({
      id: `allied_intervention_${s.currentTurn}_${ally.id}_${player.id}`,
      turn: s.currentTurn,
      type: 'DIPLOMACY',
      title: 'Defensive Pact Activated',
      message: `${ally.name} joined the war to defend ${defenderCountry.name}.`,
      countryId: ally.id,
    }));

    // Execute battle
    const battle = simulateCombatEngagement({
      turn: s.currentTurn,
      attackerCountry: player,
      defenderCountry,
      targetProvince: targetProv,
      attackingUnits,
      sourceProvinceId: fromProvinceId
    });

    if (battle.victor === 'DEFENDER' && battle.survivingAttackerUnits) {
      fromProv.units = mergeUnitGroups([...fromProv.units, ...battle.survivingAttackerUnits]);
    }

    s.recentBattles.unshift(battle);
    this.evaluateWorldState();
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
    if (targetProv.countryId === s.playerCountryId) return false; // recon is for foreign territory
    if (!s.countries[targetProv.countryId]) return false;

    const cost = 250;
    if (!this.executeTransaction(s.playerCountryId, { money: cost })) {
      return false;
    }

    const hasIntelHQ = Object.values(s.provinces)
      .filter(p => p.countryId === s.playerCountryId)
      .some(p => p.buildings.some(b => b.type === 'intelligence_center'));

    const targetCountry = s.countries[targetProv.countryId];
    const report = generateProvinceIntel(targetCountry, targetProv, s.currentTurn, hasIntelHQ, s.playerCountryId);

    s.intelReports = s.intelReports.filter(r => r.targetProvinceId !== targetProvinceId);
    s.intelReports.unshift(report);

    sound.playSelect();
    this.notify();
    return true;
  }

  /** Breaking a treaty by force is remembered by the victim and costs trust. */
  private registerTreatyBetrayal(aggressor: Country, victim: Country) {
    const rels = ensureBilateralRelation(aggressor, victim);
    if (!rels) return;
    const status = rels.relAtoB.status;
    if (status === 'ALLIANCE' || status === 'DEFENSIVE_PACT' || status === 'NON_AGGRESSION') {
      rels.relBtoA.memory.betrayals += 1;
      rels.relBtoA.trustScore = Math.max(-100, rels.relBtoA.trustScore - 30);
      this.state.notifications.unshift({
        id: `betrayal_${this.state.currentTurn}_${aggressor.id}_${victim.id}_${Date.now()}`,
        turn: this.state.currentTurn,
        type: 'DIPLOMACY',
        title: 'Treaty Betrayed',
        message: `${aggressor.name} broke its ${status.replace('_', ' ').toLowerCase()} with ${victim.name} by force of arms.`
      });
    }
  }

  public sendDiplomaticProposal(targetCountryId: string, proposal: DiplomaticProposal): { accepted: boolean; message: string } {
    const s = this.state;
    const player = s.countries[s.playerCountryId];
    const target = s.countries[targetCountryId];
    if (!player || !target) return { accepted: false, message: 'Invalid target nation.' };

    const result = evaluateDiplomaticProposal(player, target, proposal);
    if (result.accepted) {
      sound.playSelect();
      switch (proposal) {
        case 'ALLIANCE':
        case 'DEFENSIVE_PACT':
        case 'NON_AGGRESSION':
          setBilateralDiplomaticStatus(player, target, proposal, 20, s.currentTurn);
          break;
        case 'PEACE':
        case 'PEACE_TREATY':
          setBilateralDiplomaticStatus(player, target, 'PEACE', 15, s.currentTurn);
          break;
        case 'TRADE_DEAL':
        case 'TRADE_AGREEMENT': {
          const rels = ensureBilateralRelation(player, target);
          if (rels) {
            rels.relAtoB.tradeAgreementActive = true;
            rels.relBtoA.tradeAgreementActive = true;
          }
          break;
        }
        case 'MILITARY_ACCESS': {
          const rels = ensureBilateralRelation(player, target);
          if (rels) {
            rels.relAtoB.militaryAccess = true;
            rels.relBtoA.militaryAccess = true;
          }
          break;
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

    this.registerTreatyBetrayal(player, target);
    setBilateralDiplomaticStatus(player, target, 'WAR', -80, s.currentTurn);
    const interveningAllies = callDefensiveAllies(target, player, s.countries, s.currentTurn);
    interveningAllies.forEach(ally => s.notifications.unshift({
      id: `allied_intervention_${s.currentTurn}_${ally.id}_${player.id}`,
      turn: s.currentTurn,
      type: 'DIPLOMACY',
      title: 'Defensive Pact Activated',
      message: `${ally.name} joined the war to defend ${target.name}.`,
      countryId: ally.id,
    }));

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

    // Switching projects would silently throw away the progress made so far
    if (player.currentResearch && player.currentResearch.techId !== techId) return false;
    if (player.currentResearch?.techId === techId) return false;

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
  // EVENTS (resolved here so costs are validated)
  // ============================================
  public resolveEventOption(eventId: string, optionIndex: number): { success: boolean; message: string } {
    const s = this.state;
    const player = s.countries[s.playerCountryId];
    const eventIdx = s.activeEvents.findIndex(e => e.id === eventId);
    if (!player || eventIdx < 0) return { success: false, message: 'This directive is no longer active.' };

    const option = s.activeEvents[eventIdx].options[optionIndex];
    if (!option) return { success: false, message: 'Invalid directive option.' };

    if (option.cost && !this.canAfford(s.playerCountryId, option.cost)) {
      return { success: false, message: 'Insufficient resources for this directive.' };
    }
    if (option.cost) this.executeTransaction(s.playerCountryId, option.cost);

    if (option.reward) {
      Object.entries(option.reward).forEach(([res, val]) => {
        player.resources[res as ResourceKey] = (player.resources[res as ResourceKey] || 0) + (val || 0);
      });
    }
    if (option.stabilityDelta) {
      Object.values(s.provinces)
        .filter(p => p.countryId === s.playerCountryId)
        .forEach(p => {
          p.stability = Math.max(10, Math.min(100, p.stability + option.stabilityDelta!));
        });
    }

    s.activeEvents.splice(eventIdx, 1);
    sound.playSelect();
    this.notify();
    return { success: true, message: 'Directive executed.' };
  }

  // ============================================
  // WORLD STATE: ELIMINATION, VICTORY & DEFEAT
  // ============================================
  private evaluateWorldState() {
    const s = this.state;
    const counts: Record<string, number> = {};
    Object.values(s.provinces).forEach(p => {
      counts[p.countryId] = (counts[p.countryId] || 0) + 1;
    });
    const totalProvinces = Object.keys(s.provinces).length;

    Object.values(s.countries).forEach(c => {
      if (c.isAlive && !(counts[c.id] > 0)) {
        c.isAlive = false;
        s.notifications.unshift({
          id: `eliminated_${c.id}_${s.currentTurn}`,
          turn: s.currentTurn,
          type: 'DIPLOMACY',
          title: 'Nation Eliminated',
          message: `${c.name} has lost its last province and ceased to exist as a sovereign state.`
        });
      }
    });

    if (s.gameOver) return;

    const playerProvinces = counts[s.playerCountryId] || 0;
    const rivalsAlive = Object.values(s.countries).filter(c => c.id !== s.playerCountryId && c.isAlive).length;
    let outcome: { status: 'VICTORY' | 'DEFEAT'; reason: string } | null = null;

    if (playerProvinces === 0) {
      outcome = { status: 'DEFEAT', reason: 'Your last province has fallen. The nation is no more.' };
    } else if (rivalsAlive === 0) {
      outcome = { status: 'VICTORY', reason: 'Total conquest: every rival nation has been eliminated.' };
    } else if (playerProvinces / totalProvinces >= 0.6) {
      outcome = { status: 'VICTORY', reason: 'World domination: you control over 60% of all provinces.' };
    }

    if (outcome) {
      s.gameOver = { ...outcome, turn: s.currentTurn };
      s.isPaused = true;
      if (outcome.status === 'VICTORY') sound.playVictory();
      else sound.playDefeat();
    }
  }

  /** After a victory the player may keep playing; a defeat cannot be dismissed. */
  public continueAfterVictory() {
    const go = this.state.gameOver;
    if (go && go.status === 'VICTORY') {
      go.acknowledged = true;
      this.state.isPaused = false;
      this.notify();
    }
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
    if (targetProv.countryId === s.playerCountryId) {
      return { success: false, intercepted: false, damageDealt: 0, message: 'Cannot strike your own territory.' };
    }

    const targetCountry = s.countries[targetProv.countryId];
    if (!targetCountry || !targetCountry.isAlive || targetCountry.id === player.id) {
      return { success: false, intercepted: false, damageDealt: 0, message: 'A strike must target a living foreign nation.' };
    }

    const relation = player.relations[targetCountry.id];
    if (relation?.status !== 'WAR') {
      return { success: false, intercepted: false, damageDealt: 0, message: 'A formal state of war is required before launching a strike.' };
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

    const strikeRecord: MissileStrikeRecord = {
      id: `strike_${s.currentTurn}_${Date.now()}`,
      targetProvinceId,
      turn: s.currentTurn,
      outcome: isIntercepted ? 'INTERCEPTED' : 'HIT',
      launchedAt: Date.now()
    };
    s.missileStrikes = [...s.missileStrikes.slice(-7), strikeRecord];

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
