import { ensureBilateralRelation, setBilateralDiplomaticStatus, validateWarDeclaration } from '../src/diplomacy/diplomacyUtils';
import { evaluateDiplomaticProposal } from '../src/diplomacy/diplomacyEngine';
import { processAITurn } from '../src/ai/aiEngine';
import { storage, SAVE_SCHEMA_VERSION } from '../src/storage/db';
import { gameStore } from '../src/game/gameStore';
import { Country, DiplomaticRelation } from '../src/types';

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

console.log('\n--- SECTION 4: STRATEGIC AI 100-TURN SIMULATION & DETERMINISM (PHASE 5) ---');

// Test 11: 100 Consecutive AI turns without crashes or contradictory diplomatic states
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

  assert(aiCrashes === 0, 'T11.1: 100 consecutive AI turns executed with ZERO crashes');
  assert(contradictoryStates === 0, 'T11.2: Diplomatic states remained 100% symmetric and non-contradictory');
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
