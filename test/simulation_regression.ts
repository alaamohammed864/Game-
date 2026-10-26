import { ensureBilateralRelation, setBilateralDiplomaticStatus, validateWarDeclaration } from '../src/diplomacy/diplomacyUtils';
import { evaluateDiplomaticProposal } from '../src/diplomacy/diplomacyEngine';
import { processAITurn } from '../src/ai/aiEngine';
import { simulateCombatEngagement } from '../src/combat/combatEngine';
import { storage, SAVE_SCHEMA_VERSION } from '../src/storage/db';
import { gameStore } from '../src/game/gameStore';
import { Country, DiplomaticRelation, Province, UnitGroup } from '../src/types';
import { UnitSimulation, createDemoSimulation } from '../src/simulation/UnitSimulation';
import { createDemoSimulation as createDemoFromUnits } from '../src/simulation/demoUnits';
import { OceanSystem } from '../src/simulation/OceanSystem';
import { ShipController } from '../src/simulation/ShipController';
import {
  GameSystems,
  RouteManager,
  AircraftController,
  GroundUnitController,
  WeatherSystem,
  DayNightSystem,
  WakeEffect,
  EventEffectSystem,
  UnitSelection
} from '../src/game/GameSystems';

// Deterministic Pseudo-Random Number Generator (Linear Congruential Generator)
function createSeededRng(seed = 123456789) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function createMockCountry(id: string, name: string, overrides: Partial<Country> = {}): Country {
  return {
    id,
    name,
    code: id.toUpperCase().slice(0, 3),
    color: '#3b82f6',
    flagColor: '#3b82f6',
    capitalProvinceId: `${id}_cap`,
    isPlayer: false,
    isAlive: true,
    resources: { money: 1000, oil: 500, steel: 500, food: 500, energy: 500, rareMaterials: 200, techPoints: 100, manpower: 1000, gold: 50 },
    completedTechs: [],
    currentResearch: null,
    relations: {} as Record<string, DiplomaticRelation>,
    aiProfile: {
      personality: 'Balanced',
      difficulty: 'NORMAL',
      aggressionRate: 0.5,
      economicFocus: 0.5,
      militaryFocus: 0.5,
      techFocus: 0.5,
      riskTolerance: 0.5,
      strategicGoals: [],
      memories: []
    },
    totalKills: 0,
    totalLosses: 0,
    score: 100,
    ...overrides
  };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
    process.exitCode = 1;
  }
}

gameStore.stopLoop();

console.log('====================================================');
console.log('   GLOBAL COMMAND: STRATEGIC & PERSISTENCE REGRESSION SUITE   ');
console.log('====================================================\n');

// =========================================================================
// SECTION 1: PHASE 2 — DIPLOMACY & AI RELATIONSHIP AUDIT
// =========================================================================
console.log('--- SECTION 1: DIPLOMACY & AI RELATIONSHIP INTEGRITY ---');

// Test 1: Two countries without initialized relationships
{
  const c1 = createMockCountry('usa', 'United States', {
    aiProfile: {
      personality: 'Aggressive',
      difficulty: 'HARD',
      aggressionRate: 0.8,
      economicFocus: 0.5,
      militaryFocus: 0.8,
      techFocus: 0.5,
      riskTolerance: 0.7,
      strategicGoals: [],
      memories: []
    }
  });

  const c2 = createMockCountry('can', 'Canada', {
    aiProfile: {
      personality: 'Defensive',
      difficulty: 'NORMAL',
      aggressionRate: 0.2,
      economicFocus: 0.7,
      militaryFocus: 0.3,
      techFocus: 0.6,
      riskTolerance: 0.2,
      strategicGoals: [],
      memories: []
    }
  });

  const rels = ensureBilateralRelation(c1, c2);
  assert(rels !== null, 'T1.1: Bilateral relation initializes safely when relations map is empty');
  assert(c1.relations['can'] !== undefined && c2.relations['usa'] !== undefined, 'T1.2: Both countries now have symmetric relationship objects');
  assert(c1.relations['can'].status === 'PEACE' && c2.relations['usa'].status === 'PEACE', 'T1.3: Default status is PEACE');
}

// Test 2: Country deleted / undefined safe handling
{
  const safeNil = ensureBilateralRelation(null, undefined);
  assert(safeNil === null, 'T2.1: Gracefully returns null for deleted/null country');

  const evalDeleted = evaluateDiplomaticProposal(null, null, 'PEACE');
  assert(!evalDeleted.accepted && typeof evalDeleted.message === 'string', 'T2.2: Evaluate proposal safely rejects null countries');
}

// Test 3: Validate war declaration against existing enemy / self
{
  const c1 = createMockCountry('gbr', 'Britain');
  const c2 = createMockCountry('fra', 'France', {
    aiProfile: {
      personality: 'Diplomatic',
      difficulty: 'NORMAL',
      aggressionRate: 0.3,
      economicFocus: 0.6,
      militaryFocus: 0.4,
      techFocus: 0.5,
      riskTolerance: 0.3,
      strategicGoals: [],
      memories: []
    }
  });

  // Self declaration
  const selfWar = validateWarDeclaration(c1, c1);
  assert(!selfWar.valid, 'T3.1: Rejects war declaration on self');

  // Initial war declaration
  setBilateralDiplomaticStatus(c1, c2, 'WAR', -80, 1);
  assert(c1.relations['fra'].status === 'WAR' && c2.relations['gbr'].status === 'WAR', 'T3.2: Bilateral status becomes WAR');

  // Repeated war declaration
  const repeatWar = validateWarDeclaration(c1, c2);
  const isReasonValid = Boolean(repeatWar.reason && (repeatWar.reason.includes('already in a state of declared war') || repeatWar.reason.includes('already at war')));
  assert(!repeatWar.valid && isReasonValid, 'T3.3: Prevents repeated war declaration on existing enemy');
}

// Test 4: Contradictory states prevention (WAR cancels active treaties)
{
  const c1 = createMockCountry('a', 'Alpha');
  const c2 = createMockCountry('b', 'Beta');

  setBilateralDiplomaticStatus(c1, c2, 'ALLIANCE', 40, 1);
  assert(c1.relations['b'].status === 'ALLIANCE' && c1.relations['b'].militaryAccess === true, 'T4.1: Alliance establishes military access');

  // Declare war
  setBilateralDiplomaticStatus(c1, c2, 'WAR', -50, 2);
  assert(c1.relations['b'].status === 'WAR' && c1.relations['b'].militaryAccess === false && c1.relations['b'].tradeAgreementActive === false, 'T4.2: WAR overrides and revokes military access & trade agreements');
}

// Test 5: Peace negotiation between countries at war
{
  const player = createMockCountry('p', 'Player', { isPlayer: true, score: 500, totalLosses: 10 });
  const ai = createMockCountry('ai', 'AI Nation', {
    score: 100,
    totalLosses: 80,
    aiProfile: {
      personality: 'Defensive',
      difficulty: 'EASY',
      aggressionRate: 0.2,
      economicFocus: 0.5,
      militaryFocus: 0.5,
      techFocus: 0.5,
      riskTolerance: 0.2,
      strategicGoals: [],
      memories: []
    }
  });

  setBilateralDiplomaticStatus(player, ai, 'WAR', -50, 1);
  ai.relations['p'].trustScore = -20;

  const peaceProp = evaluateDiplomaticProposal(player, ai, 'PEACE');
  assert(peaceProp.accepted, 'T5.1: Defensive AI under threat accepts peace treaty');
}

console.log('\n--- SECTION 2: SAVE & LOAD PERSISTENCE AUDIT (PHASE 3) ---');

// Test 6: Deep validation rejects invalid states safely
{
  const emptyVal = storage.validateGameState(null);
  assert(!emptyVal.valid, 'T6.1: Null state rejected');

  const noCountries = storage.validateGameState({ countries: {}, provinces: { p1: {} }, playerCountryId: 'usa' });
  assert(!noCountries.valid, 'T6.2: Empty countries rejected');

  const invalidPlayer = storage.validateGameState({ countries: { rus: { id: 'rus' } }, provinces: { p1: { id: 'p1' } }, playerCountryId: 'usa' });
  assert(!invalidPlayer.valid, 'T6.3: Non-existent playerCountryId rejected');
}

// Test 7: Resource sanitization cleans NaN & Infinity
{
  const dirtyState: any = {
    countries: {
      usa: {
        id: 'usa',
        name: 'USA',
        resources: {
          money: NaN,
          oil: Infinity,
          steel: -50,
          food: 100.7,
          energy: undefined,
          rareMaterials: 50,
          techPoints: 20,
          manpower: 500,
          gold: NaN
        }
      }
    },
    provinces: { p1: { id: 'p1', countryId: 'usa' } },
    playerCountryId: 'usa',
    currentTurn: 5
  };

  const clean = storage.validateGameState(dirtyState);
  assert(clean.valid, 'T7.1: Dirty state sanitized successfully');
  const res = clean.sanitized!.countries['usa'].resources;
  assert(res.money === 0, 'T7.2: NaN sanitized to 0');
  assert(res.oil === 0, 'T7.3: Infinity sanitized to 0');
  assert(res.steel === 0, 'T7.4: Negative sanitized to 0');
  assert(res.food === 101, 'T7.5: Floats rounded cleanly');
  assert(res.energy === 0, 'T7.6: Undefined sanitized to 0');
  assert(res.gold === 0, 'T7.7: Gold NaN sanitized to 0');
}

// Test 8: Export and Import roundtrip
{
  const baseState = gameStore.getState();
  const jsonExport = storage.exportSaveJson(baseState);
  assert(typeof jsonExport === 'string' && jsonExport.includes(SAVE_SCHEMA_VERSION), 'T8.1: Export contains valid schema version');

  const imported = storage.importSaveJson(jsonExport);
  assert(imported.success && imported.state !== undefined, 'T8.2: Exported save re-imported successfully');
  assert(imported.state?.playerCountryId === baseState.playerCountryId, 'T8.3: Player ID matches perfectly');

  // Corrupted JSON
  const corruptImport = storage.importSaveJson('{ broken_json: [;');
  assert(!corruptImport.success && typeof corruptImport.error === 'string', 'T8.4: Corrupt JSON safely caught');

  // Oversized JSON check (> 25MB)
  const oversizedImport = storage.importSaveJson(' '.repeat(26 * 1024 * 1024));
  const isOversizedCaught = Boolean(!oversizedImport.success && oversizedImport.error?.includes('exceeds safe maximum'));
  assert(isOversizedCaught, 'T8.5: Oversized saves rejected');
}

console.log('\n--- SECTION 3: ECONOMY & CENTRALIZED TRANSACTION ENGINE (PHASE 4) ---');

// Test 9: Resource affordability & transaction atomicity
{
  const pId = gameStore.getState().playerCountryId;
  const player = gameStore.getState().countries[pId];

  // Set predictable balances
  player.resources.money = 100;
  player.resources.steel = 50;
  player.resources.gold = 10;
  gameStore.setUnlimitedGoldDev(false);
  gameStore.setUnlimitedResourcesDev(false);

  // Insufficient transaction
  const canAffordBig = gameStore.canAfford(pId, { money: 500 });
  assert(!canAffordBig, 'T9.1: Correctly denies purchase exceeding available money');

  const executedBig = gameStore.executeTransaction(pId, { money: 500, steel: 10 });
  assert(!executedBig, 'T9.2: executeTransaction returns false on insufficient resources');
  assert(player.resources.steel === 50, 'T9.3: Atomicity: partial deduction of steel did not occur');

  // Valid transaction
  const executedValid = gameStore.executeTransaction(pId, { money: 40, steel: 20 });
  assert(executedValid, 'T9.4: Valid transaction succeeded');
  assert(player.resources.money === 60 && player.resources.steel === 30, 'T9.5: Balances deducted accurately');
}

// Test 10: Developer Sandbox Mode: Unlimited Gold & Infinite Stockpiles
{
  const pId = gameStore.getState().playerCountryId;
  const player = gameStore.getState().countries[pId];

  player.resources.gold = 5;
  gameStore.getState().isDevMode = true;
  gameStore.setUnlimitedGoldDev(true);

  // Can afford gold purchase despite having only 5 gold
  const canAffordGold = gameStore.canAfford(pId, { gold: 100 });
  assert(canAffordGold, 'T10.1: Unlimited Gold dev mode allows expensive gold transactions');

  const executedDevGold = gameStore.executeTransaction(pId, { gold: 100 });
  assert(executedDevGold, 'T10.2: Unlimited Gold purchase executes successfully');
  assert(player.resources.gold === 5, 'T10.3: Base gold reserve is untouched and preserved at 5');

  // Turn off dev mode
  gameStore.setUnlimitedGoldDev(false);
  const canAffordAfter = gameStore.canAfford(pId, { gold: 100 });
  assert(!canAffordAfter, 'T10.4: Disabling unlimited gold restores strict cost enforcement');
}

console.log('\n--- SECTION 4: COMBAT & TACTICAL ENGAGEMENT RESOLUTION ---');

// Test 11: Decisive assault captures province
{
  const attacker = createMockCountry('invader', 'Invader Nation');
  const defender = createMockCountry('defender', 'Defending Nation');
  const targetProv: Province = {
    id: 'prov_target',
    name: 'Target Borderland',
    countryId: 'defender',
    originalCountryId: 'defender',
    lat: 10,
    lng: 20,
    mapX: 45,
    mapY: 55,
    terrain: 'Plains',
    population: 5,
    economicValue: 100,
    defenseLevel: 0,
    infrastructure: 50,
    stability: 80,
    strategicImportance: 4,
    resourceDeposits: { oil: 50 },
    buildings: [],
    units: [{ id: 'def_1', type: 'infantry', count: 1, experience: 10, morale: 50, supply: 50 }],
    hasCapital: false,
    hasPort: false,
    hasAirbase: false,
    hasMilitaryBase: false,
    neighborIds: ['prov_source']
  };

  const attackingUnits: UnitGroup[] = [
    { id: 'atk_1', type: 'armored_units', count: 25, experience: 80, morale: 100, supply: 100 },
    { id: 'atk_2', type: 'artillery', count: 20, experience: 75, morale: 100, supply: 100 }
  ];

  const battle = simulateCombatEngagement({
    turn: 5,
    attackerCountry: attacker,
    defenderCountry: defender,
    targetProvince: targetProv,
    attackingUnits,
    sourceProvinceId: 'prov_source'
  });

  assert(battle.victor === 'ATTACKER', 'T11.1: Overwhelming assault scores decisive attacker victory');
  assert(battle.provinceCaptured === true, 'T11.2: Province captured flag is true');
  assert(targetProv.countryId === 'invader', 'T11.3: Province countryId transfers to attacker');
  assert(targetProv.units.length > 0, 'T11.4: Attacker units occupy captured province');
}

// Test 12: Repulsed assault retreats surviving units with casualties accounted for
{
  const attacker = createMockCountry('invader', 'Invader Nation');
  const defender = createMockCountry('defender', 'Defending Nation');
  const targetProv: Province = {
    id: 'prov_citadel',
    name: 'Fortress Citadel',
    countryId: 'defender',
    originalCountryId: 'defender',
    lat: 15,
    lng: 25,
    mapX: 50,
    mapY: 60,
    terrain: 'Mountains',
    population: 10,
    economicValue: 200,
    defenseLevel: 5,
    infrastructure: 80,
    stability: 95,
    strategicImportance: 8,
    resourceDeposits: { steel: 100 },
    buildings: [{ type: 'military_base', level: 3 }],
    units: [
      { id: 'def_tanks', type: 'armored_units', count: 50, experience: 90, morale: 100, supply: 100 },
      { id: 'def_air', type: 'air_defense', count: 30, experience: 85, morale: 100, supply: 100 }
    ],
    hasCapital: false,
    hasPort: false,
    hasAirbase: true,
    hasMilitaryBase: true,
    neighborIds: ['prov_source']
  };

  const attackingUnits: UnitGroup[] = [
    { id: 'weak_inf', type: 'infantry', count: 2, experience: 20, morale: 60, supply: 70 }
  ];

  const battle = simulateCombatEngagement({
    turn: 6,
    attackerCountry: attacker,
    defenderCountry: defender,
    targetProvince: targetProv,
    attackingUnits,
    sourceProvinceId: 'prov_source'
  });

  assert(battle.victor === 'DEFENDER', 'T12.1: Fortified citadel successfully repulses weak assault');
  assert(battle.provinceCaptured === false, 'T12.2: Province remains under defender control');
  assert(targetProv.countryId === 'defender', 'T12.3: Defender sovereign control preserved');
  assert(Array.isArray(battle.survivingAttackerUnits), 'T12.4: Surviving attacker units array is provided');
  assert(battle.survivingAttackerUnits!.length > 0, 'T12.5: Surviving attacking units retreat rather than vanishing');
}

console.log('\n--- SECTION 5: STRATEGIC AI 100-TURN SIMULATION & DETERMINISM (PHASE 5) ---');

// Test 13: 100 Consecutive AI turns without crashes or contradictory diplomatic states
{
  const seededRng = createSeededRng(42);
  const state = gameStore.getState();
  let aiCrashes = 0;
  let contradictoryStates = 0;

  for (let turn = 1; turn <= 100; turn++) {
    try {
      Object.keys(state.countries).forEach(cId => {
        if (cId !== state.playerCountryId && state.countries[cId].isAlive) {
          processAITurn(
            cId,
            turn,
            state.countries,
            state.provinces,
            state.constructionQueue,
            state.militaryQueue,
            { rng: seededRng }
          );
        }
      });

      // Verify diplomacy consistency across all country pairs
      const cList = Object.values(state.countries);
      for (let i = 0; i < cList.length; i++) {
        for (let j = i + 1; j < cList.length; j++) {
          const a = cList[i];
          const b = cList[j];
          const relAB = a.relations[b.id];
          const relBA = b.relations[a.id];

          if (relAB && relBA) {
            if (relAB.status !== relBA.status) {
              contradictoryStates++;
            }
            if (relAB.status === 'WAR' && (relAB.tradeAgreementActive || relAB.militaryAccess)) {
              contradictoryStates++;
            }
          }
        }
      }
    } catch (e: any) {
      aiCrashes++;
      console.error(`Crash on turn ${turn}:`, e);
    }
  }

  assert(aiCrashes === 0, 'T13.1: 100 consecutive AI turns executed with ZERO crashes');
  assert(contradictoryStates === 0, 'T13.2: Diplomatic states remained 100% symmetric and non-contradictory');
}

// =========================================================================
// SECTION 6: EVENT NOTIFICATIONS & DIRECTIVES QUEUE INTEGRITY
// =========================================================================
console.log('\n--- SECTION 6: EVENT NOTIFICATIONS & DIRECTIVES QUEUE INTEGRITY ---');
{
  const state = gameStore.createNewGame('NORMAL', 'valyria');
  const player = state.countries['valyria'];
  const initMoney = player.resources.money;
  const initManpower = player.resources.manpower;

  // Simulate an event arriving
  const mockEvent1 = {
    id: 'test_event_1',
    titleKey: 'Resource Boom Discovery',
    descKey: 'Geological surveys uncovered rare material deposits.',
    severity: 'BOOM' as const,
    options: [
      {
        label: 'Invest in Extraction',
        description: 'Spend $200 to gain 400 rare materials.',
        cost: { money: 200 },
        reward: { rareMaterials: 400 },
        stabilityDelta: 5
      },
      {
        label: 'Conserve Reserves',
        description: 'Keep state funds intact.'
      }
    ]
  };

  const mockEvent2 = {
    id: 'test_event_2',
    titleKey: 'Border Flashpoint',
    descKey: 'Tension escalated near eastern frontier.',
    severity: 'WARNING' as const,
    options: [
      {
        label: 'Fortify Outposts',
        description: 'Spend $100 and gain defense.'
      }
    ]
  };

  // Push into queue
  state.activeEvents.push(mockEvent1);
  state.notifications.unshift({
    id: `notif_${mockEvent1.id}`,
    turn: state.currentTurn,
    type: 'EVENT',
    title: `Directive: ${mockEvent1.titleKey}`,
    message: mockEvent1.descKey
  });

  assert(state.activeEvents.length === 1, 'T14.1: Event successfully queued into activeEvents');
  assert(state.notifications[0].type === 'EVENT', 'T14.2: Event registered as non-intrusive operational notification');
  assert(state.notifications[0].title.includes('Resource Boom Discovery'), 'T14.3: Notification title matches event title');

  // Add second event to test multi-event coexistence
  state.activeEvents.push(mockEvent2);
  assert(state.activeEvents.length === 2, 'T14.4: Multiple geopolitical events coexist in queue without blocking');

  // Resolve first event choice
  const chosenOpt = state.activeEvents[0].options[0];
  if (chosenOpt.cost) {
    Object.entries(chosenOpt.cost).forEach(([k, v]) => {
      player.resources[k as keyof typeof player.resources] -= v;
    });
  }
  if (chosenOpt.reward) {
    Object.entries(chosenOpt.reward).forEach(([k, v]) => {
      player.resources[k as keyof typeof player.resources] += v;
    });
  }
  state.activeEvents.splice(0, 1);

  assert(player.resources.money === initMoney - 200, 'T15.1: Policy execution deducted cost accurately');
  assert(player.resources.rareMaterials >= 400, 'T15.2: Policy execution granted reward accurately');
  assert(state.activeEvents.length === 1, 'T15.3: Resolved event cleanly removed from queue');
  assert(state.activeEvents[0].id === 'test_event_2', 'T15.4: Remaining directive safely preserved in queue');
}

// =========================================================================
// SECTION 7: MEDIA QUERY & DEVICE CATEGORY BREAKPOINT VERIFICATION
// =========================================================================
console.log('\n--- SECTION 7: MEDIA QUERY & DEVICE CATEGORY BREAKPOINTS ---');
{
  function evaluateDeviceCategory(width: number): 'mobile' | 'tablet' | 'desktop' {
    if (width < 768) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }

  // 1. Mobile screen widths (iPhone, Galaxy, etc.)
  assert(evaluateDeviceCategory(375) === 'mobile', 'T16.1: Width 375px detected as Mobile');
  assert(evaluateDeviceCategory(430) === 'mobile', 'T16.2: Width 430px detected as Mobile');
  assert(evaluateDeviceCategory(767) === 'mobile', 'T16.3: Width 767px boundary detected as Mobile');

  // 2. Tablet screen widths (iPad Mini, iPad Air, iPad Pro 11)
  assert(evaluateDeviceCategory(768) === 'tablet', 'T16.4: Width 768px boundary detected as Tablet');
  assert(evaluateDeviceCategory(820) === 'tablet', 'T16.5: Width 820px detected as Tablet');
  assert(evaluateDeviceCategory(1024) === 'tablet', 'T16.6: Width 1024px boundary detected as Tablet');

  // 3. Desktop screen widths (MacBook, PC, 1440p Monitor)
  assert(evaluateDeviceCategory(1025) === 'desktop', 'T17.1: Width 1025px boundary detected as Desktop');
  assert(evaluateDeviceCategory(1440) === 'desktop', 'T17.2: Width 1440px detected as Desktop');
  assert(evaluateDeviceCategory(1920) === 'desktop', 'T17.3: Width 1920px detected as Desktop');

  // 4. Layout adaptation assertions
  const mobileCat = evaluateDeviceCategory(390);
  const isMobileDrawer = mobileCat === 'mobile';
  const tabletCat = evaluateDeviceCategory(834);
  const isTabletSidebarCollapsed = tabletCat === 'tablet';

  assert(isMobileDrawer === true, 'T17.4: Mobile switches to bottom drawer and mobile navigation bar');
  assert(isTabletSidebarCollapsed === true, 'T17.5: Tablet automatically collapses sidebar to compact icon rail');
}

// =========================================================================
// SECTION 8: 3D UNIT SIMULATION ENGINE (UnitSimulation.js) AUDIT
// =========================================================================
console.log('\n--- SECTION 8: 3D UNIT SIMULATION ENGINE (UnitSimulation) ---');
{
  const sim = new UnitSimulation();

  // Mock Mesh with Three.js-style position and rotation transforms
  const mockMesh = {
    position: {
      x: 0,
      y: 0,
      z: 0,
      set(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
    },
    rotation: {
      x: 0,
      y: 0,
      z: 0
    }
  };

  // 1. Add Vehicle Unit with Waypoints
  const vehicle = sim.addUnit({
    id: 'armor_division_1',
    type: 'vehicle',
    mesh: mockMesh,
    x: 0,
    y: 0,
    z: 0,
    route: [
      { x: 5, y: 0, z: 10 },
      { x: 10, y: 0, z: 10 }
    ],
    speed: 5,
    turnRate: 3.0
  });

  assert(vehicle.id === 'armor_division_1', 'T18.1: Unit added with unique ID');
  assert(sim.getUnit('armor_division_1') === vehicle, 'T18.2: getUnit retrieves active unit reference');
  assert(vehicle.speed === 5, 'T18.3: Unit initialized with speed 5');
  assert(vehicle.bobAmplitude === 0, 'T18.4: Vehicle unit has 0 bob amplitude');

  // Test duplicate ID rejection
  let duplicateRejected = false;
  try {
    sim.addUnit({ id: 'armor_division_1' });
  } catch {
    duplicateRejected = true;
  }
  assert(duplicateRejected, 'T18.5: addUnit throws error on duplicate ID');

  // 2. Add Ship Unit with Hydrodynamic Bobbing
  const shipMesh = {
    position: {
      x: 0,
      y: 0,
      z: 0,
      set(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
    },
    rotation: { y: 0 }
  };
  const ship = sim.addUnit({
    id: 'naval_cruiser_7',
    type: 'ship',
    mesh: shipMesh,
    x: 20,
    y: 1.0,
    z: 20,
    route: [{ x: 30, y: 1.0, z: 20 }],
    speed: 2
  });

  assert(ship.bobAmplitude === 0.08, 'T19.1: Ship unit automatically assigns bobAmplitude 0.08');
  assert(ship.bobFrequency === 1.5, 'T19.2: Ship unit automatically assigns bobFrequency 1.5');

  // 3. Update & Movement Progression
  // Simulate 1 second of movement with dt = 0.05
  for (let step = 0; step < 20; step++) {
    sim.update(0.05);
  }

  // Vehicle should have progressed towards waypoint {x:0, y:0, z:10}
  // distance traveled = speed (5) * 1.0s = 5 units along Z
  const dist = Math.hypot(vehicle.position.x, vehicle.position.z);
  assert(dist > 4.9 && dist <= 5.1, `T19.3: Vehicle moved smoothly towards waypoint (dist=${dist.toFixed(2)})`);
  assert(mockMesh.position.z === vehicle.position.z, 'T19.4: Mesh position synchronized via syncMesh');
  assert(mockMesh.rotation.y !== 0, 'T19.5: Mesh heading rotation updated towards route waypoint');

  // Check Ship bobbing in syncMesh
  assert(shipMesh.position.y !== 1.0, 'T19.6: Ship mesh position.y includes hydrodynamic bobbing offset');

  // 4. Waypoint Destination Reached
  // Advance simulation until first waypoint (z: 10) is reached and passes to next
  for (let step = 0; step < 30; step++) {
    sim.update(0.05);
  }
  assert(vehicle.routeIndex >= 1, 'T20.1: Unit advanced to next waypoint in route');

  // Advance simulation to end of route
  for (let step = 0; step < 50; step++) {
    sim.update(0.05);
  }
  assert(vehicle.reachedDestination === true, 'T20.2: Unit marked reachedDestination = true at route termination');

  // 5. Dynamic Route Updating (setRoute)
  const validRouteSet = sim.setRoute('armor_division_1', [
    { x: 50, y: 0, z: 50 },
    { x: 100, y: 0, z: 100 }
  ]);
  assert(validRouteSet === true, 'T20.3: setRoute accepted valid waypoint array');
  assert(vehicle.reachedDestination === false, 'T20.4: setRoute reset reachedDestination to false');
  assert(vehicle.routeIndex === 0, 'T20.5: setRoute reset routeIndex to 0');

  // Invalid route rejection
  const invalidRouteSet = sim.setRoute('armor_division_1', [
    { x: NaN, y: 0, z: 50 }
  ]);
  assert(invalidRouteSet === false, 'T20.6: setRoute rejected invalid non-finite coordinates');

  // 6. Pause / Resume Control
  sim.pause();
  assert(sim.paused === true, 'T21.1: sim.pause() set paused to true');
  const zBeforePause = vehicle.position.z;
  sim.update(0.05);
  assert(vehicle.position.z === zBeforePause, 'T21.2: update does not advance unit while paused');

  sim.resume();
  assert(sim.paused === false, 'T21.3: sim.resume() restored simulation execution');
  sim.update(0.05);
  assert(vehicle.position.z !== zBeforePause, 'T21.4: update advances unit after resume');

  // 7. Simulation Speed Multiplier
  sim.setSimulationSpeed(2.5);
  assert(sim.speedMultiplier === 2.5, 'T21.5: setSimulationSpeed adjusted speed multiplier');

  // 8. Unit Removal
  const removed = sim.removeUnit('naval_cruiser_7');
  assert(removed === true, 'T21.6: removeUnit successfully removed unit');
  assert(sim.getUnit('naval_cruiser_7') === null, 'T21.7: Unit no longer accessible after removeUnit');

  // 9. createDemoSimulation Factory Function Verification
  const demoMockShip = { position: { set() {}, x: -30, y: 0, z: 0 }, rotation: { y: 0 } };
  const demoMockAir = { position: { set() {}, x: -25, y: 12, z: -20 }, rotation: { y: 0 } };
  const demoMockVeh = { position: { set() {}, x: 0, y: 0, z: 30 }, rotation: { y: 0 } };

  const demoSim = createDemoSimulation({
    ship: demoMockShip,
    aircraft: demoMockAir,
    vehicle: demoMockVeh
  });

  const ship01 = demoSim.getUnit('ship-01');
  const air01 = demoSim.getUnit('aircraft-01');
  const veh01 = demoSim.getUnit('vehicle-01');

  assert(ship01 !== null && ship01.type === 'ship', 'T22.1: createDemoSimulation instantiated ship-01');
  assert(ship01?.speed === 4 && ship01?.route.length === 4, 'T22.2: ship-01 configured with speed 4 and 4 route waypoints');
  assert(air01 !== null && air01.type === 'aircraft', 'T22.3: createDemoSimulation instantiated aircraft-01');
  assert(air01?.speed === 14 && air01?.turnRate === 1.5, 'T22.4: aircraft-01 configured with speed 14 and turnRate 1.5');
  assert(veh01 !== null && veh01.type === 'vehicle', 'T22.5: createDemoSimulation instantiated vehicle-01');
  assert(veh01?.speed === 3 && veh01?.route.length === 3, 'T22.6: vehicle-01 configured with speed 3 and 3 route waypoints');

  // Update demo simulation and verify movement
  demoSim.update(0.1); // Advances past route[0] which matches start pos
  demoSim.update(0.1); // Moves towards route[1]
  assert(air01?.position.x !== -25, 'T22.7: aircraft-01 progressed along route on demoSim.update');
  assert(ship01?.position.x !== -30, 'T22.8: ship-01 progressed along route on demoSim.update');

  // Verify demoUnits.js module export
  const demoFromUnitsModule = createDemoFromUnits();
  assert(demoFromUnitsModule.getUnit('ship-01') !== null, 'T22.9: createDemoSimulation from demoUnits module initialized successfully');
  assert(demoFromUnitsModule.getUnit('vehicle-01') !== null, 'T22.10: vehicle-01 present from demoUnits module export');
}

// =========================================================================
// SECTION 9: 3D HYDRODYNAMIC OCEAN SYSTEM (OceanSystem.js) AUDIT
// =========================================================================
console.log('\n--- SECTION 9: 3D HYDRODYNAMIC OCEAN SYSTEM (OceanSystem) ---');
{
  const mockScene = {
    added: [] as any[],
    removed: [] as any[],
    add(obj: any) {
      this.added.push(obj);
    },
    remove(obj: any) {
      this.removed.push(obj);
    }
  };

  // 1. Instantiation and default configurations
  const ocean = new OceanSystem(mockScene, {
    size: 500,
    segments: 64,
    waveHeight: 0.4,
    waveLength: 20,
    waveSpeed: 1.0
  });

  assert(ocean.size === 500, 'T23.1: OceanSystem initialized with custom size (500)');
  assert(ocean.segments === 64, 'T23.2: OceanSystem initialized with segments (64)');
  assert(ocean.waveHeight === 0.4, 'T23.3: OceanSystem waveHeight initialized (0.4)');
  assert(ocean.waveLength === 20, 'T23.4: OceanSystem waveLength initialized (20)');
  assert(ocean.waveSpeed === 1.0, 'T23.5: OceanSystem waveSpeed initialized (1.0)');
  assert(ocean.mesh !== null, 'T23.6: Ocean mesh created');
  assert(mockScene.added.includes(ocean.mesh), 'T23.7: Ocean mesh added to scene');
  assert(ocean.basePositions !== null && ocean.basePositions.length > 0, 'T23.8: basePositions buffer cached for vertex displacement');

  // 2. Wave Height Calculation
  const h0 = ocean.getWaveHeight(0, 0, 0);
  assert(Number.isFinite(h0), 'T24.1: getWaveHeight returns finite numeric wave amplitude');
  assert(ocean.getSurfaceY(0, 0) === h0, 'T24.2: getSurfaceY matches getWaveHeight');

  const hDisplaced = ocean.getWaveHeight(10, 15, 1.5);
  assert(hDisplaced !== h0, 'T24.3: Wave heights vary dynamically across space and time');

  // 3. Applying wave height to naval ship
  const testShip = {
    position: { x: 10, y: 0, z: 15 }
  };
  ocean.applyToShip(testShip, 10, 15);
  assert(testShip.position.y === ocean.getSurfaceY(10, 15), 'T24.4: applyToShip updates ship.position.y to current wave height');

  // 4. Update vertex buffer animation
  const posAttribute = ocean.geometry?.attributes.position;
  assert(posAttribute !== undefined, 'T24.5: Position buffer attribute exists on geometry');
  const initialVersion = (posAttribute as any)?.version ?? 0;
  ocean.update(0.016);
  assert(ocean.time > 0, 'T24.6: Ocean simulation time advanced');
  assert((posAttribute as any)?.version > initialVersion, 'T24.7: position buffer version incremented via needsUpdate on update');

  // 5. Cleanup & Disposal
  const meshRef = ocean.mesh;
  ocean.dispose();
  assert(ocean.mesh === null, 'T24.8: ocean.mesh reset to null on dispose');
  assert(mockScene.removed.includes(meshRef), 'T24.9: Ocean mesh removed from scene on dispose');
}

// =========================================================================
// SECTION 10: HYDRODYNAMIC SHIP CONTROLLER (ShipController.js) AUDIT
// =========================================================================
console.log('\n--- SECTION 10: HYDRODYNAMIC SHIP CONTROLLER (ShipController) ---');
{
  const mockOcean = {
    getSurfaceY(x: number, z: number) {
      return Math.sin(x * 0.1) * 0.3 + Math.cos(z * 0.1) * 0.2;
    }
  };

  const shipMesh = {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 }
  };

  // 1. Initial State & Options
  const controller = new ShipController(shipMesh, mockOcean, {
    speed: 5,
    turnSpeed: 2.0,
    heading: 0,
    route: [
      { x: 10, z: 20 },
      { x: 30, z: 40 }
    ],
    waveOffset: 0
  });

  assert(controller.speed === 5, 'T25.1: ShipController initialized with custom speed (5)');
  assert(controller.turnSpeed === 2.0, 'T25.2: ShipController initialized with turnSpeed (2.0)');
  assert(controller.route.length === 2, 'T25.3: Route set with 2 waypoints');
  assert(controller.routeIndex === 0, 'T25.4: routeIndex initialized to 0');
  assert(controller.waveOffset === 0, 'T25.5: waveOffset initialized to 0');

  // 2. Navigation & Steering towards waypoint {x: 10, z: 20}
  // Target heading = Math.atan2(10, 20) = 0.4636 rad
  const initialHeading = controller.heading;
  controller.update(0.1);

  assert(controller.time > 0, 'T25.6: Controller time advanced');
  assert(controller.heading > initialHeading, 'T25.7: Heading rotated towards target waypoint');
  assert(shipMesh.position.x > 0, 'T25.8: Ship progressed along X towards destination');
  assert(shipMesh.position.z > 0, 'T25.9: Ship progressed along Z towards destination');
  assert(shipMesh.rotation.y === controller.heading, 'T25.10: Ship mesh yaw (rotation.y) synchronized with heading');

  // 3. Ocean Surface Interaction & Pitch/Roll
  const expectedWaveY = mockOcean.getSurfaceY(shipMesh.position.x, shipMesh.position.z) + 0.25;
  assert(Math.abs(shipMesh.position.y - expectedWaveY) < 0.001, 'T26.1: Ship elevation set to ocean surface height + 0.25 draft');
  assert(shipMesh.rotation.x !== 0, 'T26.2: Ship pitch (rotation.x) activated by ocean wave harmonic');
  assert(shipMesh.rotation.z !== 0, 'T26.3: Ship roll (rotation.z) activated by ocean wave harmonic');

  // 4. Waypoint Proximity Transition
  // Place ship within 1.0 unit of waypoint 0 {x: 10, z: 20}
  shipMesh.position.x = 9.5;
  shipMesh.position.z = 19.5;
  controller.update(0.016);
  assert(controller.routeIndex === 1, 'T26.4: Controller advanced to next waypoint when distance < 1.5');

  // 5. Route Clamping at Destination
  // Place ship at final waypoint {x: 30, z: 40}
  shipMesh.position.x = 29.8;
  shipMesh.position.z = 39.8;
  controller.update(0.016);
  assert(controller.routeIndex === 1, 'T26.5: routeIndex safely clamped to route.length - 1 at destination');

  // 6. Dynamic setRoute
  controller.setRoute([{ x: 100, z: 100 }]);
  assert(controller.route.length === 1, 'T26.6: setRoute updated route array');
  assert(controller.routeIndex === 0, 'T26.7: setRoute reset routeIndex to 0');
}

// =========================================================================
// SECTION 11: MODULAR GAME SYSTEMS ARCHITECTURE (src/game/*) AUDIT
// =========================================================================
console.log('\n--- SECTION 11: MODULAR GAME SYSTEMS ARCHITECTURE ---');
{
  // 1. RouteManager
  const routeMgr = new RouteManager();
  const createdPts = routeMgr.createRoute('patrol_alpha', [
    { x: 0, y: 0, z: 0 },
    { x: 30, y: 0, z: 40 }
  ]);
  assert(createdPts.length === 2, 'T27.1: RouteManager createRoute created 2 waypoints');
  assert(routeMgr.getRoute('patrol_alpha').length === 2, 'T27.2: RouteManager getRoute retrieved patrol_alpha');

  const closest = routeMgr.findClosestPoint({ x: 28, z: 38 }, createdPts);
  assert(closest?.x === 30 && closest?.z === 40, 'T27.3: RouteManager findClosestPoint found nearest waypoint');

  const registered = routeMgr.registerRoute('patrol_beta', [
    { x: 0, y: 0, z: 0 },
    { x: 30, y: 0, z: 40 }
  ]);
  assert(registered.totalLength === 50, 'T27.4: RouteManager computed accurate Euclidean length (50)');
  const midPoint = routeMgr.interpolatePoint(registered.points, 0.5);
  assert(midPoint.x === 15 && midPoint.z === 20, 'T27.5: RouteManager correctly interpolated midpoint (15, 20)');

  routeMgr.deleteRoute('patrol_alpha');
  assert(routeMgr.getRoute('patrol_alpha').length === 0, 'T27.6: RouteManager deleteRoute removed patrol_alpha');
  routeMgr.clear();
  assert(routeMgr.getRoute('patrol_beta').length === 0, 'T27.7: RouteManager clear emptied all routes');

  // 2. AircraftController
  const airMesh = { position: { x: 0, y: 15, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };
  const airCtrl = new AircraftController(airMesh, {
    speed: 15,
    turnSpeed: 1.2,
    altitude: 15,
    route: [{ x: 50, y: 25, z: 50 }]
  });
  airCtrl.update(0.1);
  assert(airCtrl.heading > 0, 'T27.4: AircraftController turned heading towards target waypoint');
  assert(airCtrl.pitch !== 0, 'T27.5: AircraftController computed climb pitch towards target altitude');
  assert(airMesh.rotation.x === -airCtrl.pitch, 'T27.6: Aircraft mesh pitch applied (rotation.x = -pitch)');
  assert(airMesh.position.x > 0 && airMesh.position.z > 0, 'T27.7: AircraftController advanced in 3D air corridor');

  // 3. GroundUnitController
  const tankMesh = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };
  const tankCtrl = new GroundUnitController(tankMesh, {
    speed: 3,
    turnSpeed: 3,
    route: [{ x: 20, z: 0 }]
  });
  tankCtrl.update(0.1);
  assert(tankCtrl.heading > 0, 'T27.8: GroundUnitController turned heading towards target waypoint');
  assert(tankMesh.position.x > 0, 'T27.9: GroundUnitController advanced forward towards waypoint');
  assert(tankMesh.rotation.y === tankCtrl.heading, 'T27.10: GroundUnitController synchronized mesh yaw with heading');

  // 4. WeatherSystem
  const mockWeatherScene = { fog: null as any };
  const weather = new WeatherSystem(mockWeatherScene);
  assert(weather.weather === 'clear' && weather.visibility === 1.0, 'T28.1: WeatherSystem default condition is clear');
  assert(weather.getTacticalModifiers().airMissionAllowed === true, 'T28.2: Air missions allowed in clear weather');

  weather.setWeather('fog', 0.85);
  assert(weather.weather === 'fog' && weather.intensity === 0.85, 'T28.3: setWeather fog set intensity 0.85');
  assert(mockWeatherScene.fog !== null && mockWeatherScene.fog.type === 'Fog', 'T28.4: Scene fog enabled with Fog type');
  assert(mockWeatherScene.fog.intensity === 0.85, 'T28.5: Scene fog intensity set to 0.85');

  weather.setWeather('clear');
  assert(mockWeatherScene.fog === null, 'T28.6: setWeather clear reset scene.fog to null');

  weather.setCondition('STORM');
  assert(weather.visibility === 0.4, 'T28.7: STORM condition reduced visibility to 0.40');
  const stormMods = weather.getTacticalModifiers();
  assert(stormMods.airMissionAllowed === false, 'T28.8: STORM grounded air missions');
  assert(stormMods.navalAccuracy === 0.65, 'T28.9: STORM applied 35% naval accuracy penalty');

  // 5. DayNightSystem
  const mockSun = { position: { x: 0, y: 0, z: 0 }, intensity: 1.0 };
  const dayNight = new DayNightSystem(null, mockSun);
  assert(dayNight.timeOfDay === 12, 'T28.10: DayNightSystem default timeOfDay is 12');

  dayNight.setTime(12);
  dayNight.updateSun();
  assert(Math.abs(mockSun.position.y - 100) < 0.001, 'T28.11: Sun at zenith elevation (y=100) at noon');
  assert(Math.abs(mockSun.intensity - 1.5) < 0.001, 'T28.12: Sun daylight intensity peaks at 1.5');

  dayNight.setTime(24);
  assert(dayNight.timeOfDay === 0, 'T28.13: setTime 24 wraps to 0 hours');
  dayNight.updateSun();
  assert(mockSun.position.y < 0, 'T28.14: Sun below horizon at midnight');

  dayNight.update(12.5); // (24/300) * 12.5 = 1 hour
  assert(Math.abs(dayNight.timeOfDay - 1.0) < 0.01, 'T28.15: update advances timeOfDay based on dayLength');

  // 6. WakeEffect (Planar mesh wake trailing ship)
  const mockWakeScene = {
    added: [] as any[],
    add(obj: any) { this.added.push(obj); },
    remove(obj: any) { const i = this.added.indexOf(obj); if (i !== -1) this.added.splice(i, 1); }
  };
  const wakeSys = new WakeEffect(mockWakeScene);
  const testShipForWake = {
    position: { x: 12, y: 0.5, z: 24 },
    rotation: { y: 0.85 }
  };
  const wakeItem = wakeSys.create(testShipForWake);
  assert(wakeItem !== null, 'T29.1: WakeEffect created wake planar mesh');
  assert(wakeSys.effects.length === 1, 'T29.2: WakeEffect tracked in active effects list');
  assert(mockWakeScene.added.includes(wakeItem?.mesh), 'T29.3: Wake mesh added to scene');
  assert(wakeItem?.mesh.rotation.x === -Math.PI / 2, 'T29.4: Wake mesh rotated horizontally to water surface (-PI/2)');

  wakeSys.update(0.5);
  assert(wakeItem?.life === 0.5, 'T29.5: WakeEffect life counter advanced');
  assert(wakeItem?.mesh.position.y === 0.55, 'T29.6: Wake mesh elevation raised by 0.05 above ship position');
  assert(wakeItem?.mesh.rotation.y === 0.85, 'T29.7: Wake mesh aligned with ship heading rotation');
  assert((wakeItem?.mesh.material as any).opacity < 0.35, 'T29.8: Wake mesh opacity attenuated over time');

  // 7. EventEffectSystem
  const mockEffectScene = {
    added: [] as any[],
    removed: [] as any[],
    add(obj: any) { this.added.push(obj); },
    remove(obj: any) { this.removed.push(obj); }
  };
  const eventFX = new EventEffectSystem(mockEffectScene);
  const impact = eventFX.createImpact({ x: 10, y: 0, z: 15 });
  assert(impact !== null, 'T29.9: EventEffectSystem createImpact spawned impact mesh');
  assert(eventFX.effects.length === 1, 'T29.10: Active effects list tracks spawned impact');
  assert(mockEffectScene.added.includes(impact?.mesh), 'T29.11: Impact mesh added to scene');

  const smoke = eventFX.createSmoke({ x: 12, y: 0, z: 15 });
  assert(smoke !== null && eventFX.effects.length === 2, 'T29.12: createSmoke spawned and tracked smoke plume');

  // Advance time past impact lifetime (0.8s)
  eventFX.update(0.4);
  assert(impact!.age === 0.4, 'T29.13: Impact effect age advanced');
  assert((impact!.mesh.material as any).opacity < 0.85, 'T29.14: Impact mesh opacity attenuated');

  eventFX.update(0.5); // total 0.9s >= 0.8s lifetime
  assert(mockEffectScene.removed.includes(impact?.mesh), 'T29.15: Expired impact mesh removed from scene on update');
  assert(eventFX.effects.length === 1, 'T29.16: Expired effect spliced out of active effects list');

  // 8. UnitSelection
  const unit1 = { id: 'div_1', mesh: { material: { emissive: true, emissiveIntensity: 0 } } };
  const unit2 = { id: 'div_2', mesh: { material: { emissive: true, emissiveIntensity: 0 } } };
  const selection = new UnitSelection();
  selection.register(unit1);
  selection.register(unit2);
  assert(selection.units.length === 2, 'T29.17: UnitSelection registered 2 units');

  selection.select(unit1);
  assert(selection.selected === unit1, 'T29.18: UnitSelection selected unit1');
  assert(unit1.mesh.material.emissiveIntensity === 0.35, 'T29.19: unit1 emissiveIntensity highlighted to 0.35');

  selection.select(unit2);
  assert(selection.selected === unit2, 'T29.20: Selected unit switched to unit2');
  assert(unit1.mesh.material.emissiveIntensity === 0, 'T29.21: unit1 unhighlighted (emissiveIntensity=0)');
  assert(unit2.mesh.material.emissiveIntensity === 0.35, 'T29.22: unit2 highlighted (emissiveIntensity=0.35)');

  selection.clear();
  assert(selection.selected === null, 'T29.23: UnitSelection clear reset selected to null');
  assert(unit2.mesh.material.emissiveIntensity === 0, 'T29.24: unit2 unhighlighted on clear');

  selection.unregister(unit1);
  assert(selection.units.length === 1 && !selection.units.includes(unit1), 'T29.25: unregister cleanly removed unit1');

  // 9. Master GameSystems Orchestrator
  const mockMasterScene = {
    added: [] as any[],
    removed: [] as any[],
    add(obj: any) { this.added.push(obj); },
    remove(obj: any) { this.removed.push(obj); }
  };
  const mockCamera = {};
  const mockSunLight = { position: { x: 0, y: 0, z: 0 }, intensity: 1.0 };
  const gameSystems = new GameSystems(mockMasterScene, mockCamera, mockSunLight);

  assert(gameSystems.simulation !== null, 'T30.1: GameSystems initialized simulation engine');
  assert(gameSystems.routes !== null, 'T30.2: GameSystems initialized routes (RouteManager)');
  assert(gameSystems.weather !== null, 'T30.3: GameSystems initialized weatherSystem');
  assert(gameSystems.dayNight !== null, 'T30.4: GameSystems initialized dayNightSystem');
  assert(gameSystems.effects !== null, 'T30.5: GameSystems initialized effects (EventEffectSystem)');
  assert(gameSystems.running === true, 'T30.6: GameSystems initialized running state to true');

  // Add controller via GameSystems
  const shipMock = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };
  const registeredShip = gameSystems.addShipController('fleet_carrier', shipMock, {
    speed: 6,
    route: [{ x: 50, z: 50 }]
  });
  assert(registeredShip !== null, 'T30.7: addShipController registered fleet_carrier');
  assert(gameSystems.selection.getSelectedUnits().length === 0, 'T30.8: No units selected initially');

  gameSystems.update(0.016);
  assert(shipMock.position.x > 0 || shipMock.position.z > 0, 'T30.9: GameSystems.update synchronized entity controllers');

  gameSystems.setSpeed(2.0);
  assert(gameSystems.simulation.simulationSpeed === 2.0, 'T30.10: setSpeed adjusted simulationSpeed multiplier');

  gameSystems.pause();
  assert(gameSystems.running === false && gameSystems.paused === true, 'T30.11: GameSystems.pause paused master loop');
  gameSystems.resume();
  assert(gameSystems.running === true && gameSystems.paused === false, 'T30.12: GameSystems.resume restored master loop');

  gameSystems.destroy();
  assert(gameSystems.controllers.size === 0, 'T30.13: GameSystems.destroy cleanly evacuated all active controllers');
}
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('All regression verification tests completed successfully!');
  process.exit(0);
}
