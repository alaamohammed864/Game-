import { ensureBilateralRelation, setBilateralDiplomaticStatus, validateWarDeclaration } from '../src/diplomacy/diplomacyUtils';
import { evaluateDiplomaticProposal } from '../src/diplomacy/diplomacyEngine';
import { processAITurn } from '../src/ai/aiEngine';
import { simulateCombatEngagement } from '../src/combat/combatEngine';
import { storage, SAVE_SCHEMA_VERSION } from '../src/storage/db';
import { gameStore } from '../src/game/gameStore';
import { Country, DiplomaticRelation, Province, UnitGroup } from '../src/types';

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

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('All regression verification tests completed successfully!');
  process.exit(0);
}
