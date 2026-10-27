/**
 * Regression tests for the bugs found in the full code audit.
 * Run: npx tsx test/fixes_regression.ts   (also part of `npm test`)
 */
import { gameStore } from '../src/game/gameStore';
import { generateInitialWorld } from '../src/map/worldData';
import { simulateCombatEngagement } from '../src/combat/combatEngine';
import { processAITurn } from '../src/ai/aiEngine';
import { executeMarketTrade } from '../src/economy/economyEngine';
import { mergeUnitGroups } from '../src/utils/unitGroups';
import { storage } from '../src/storage/db';
import { TECH_TREE } from '../src/game/config';
import { GameState } from '../src/types';

let passed = 0;
let failed = 0;
function assert(cond: boolean, name: string) {
  if (cond) { passed++; console.log(`  ✓ [PASS] ${name}`); }
  else { failed++; console.log(`  ✗ [FAIL] ${name}`); }
}

gameStore.stopLoop();
const fresh = (difficulty: any = 'NORMAL'): GameState => {
  const s = gameStore.createNewGame(difficulty, 'valyria');
  gameStore.stopLoop();
  return s;
};
const enrich = (s: GameState) => {
  const r = s.countries['valyria'].resources;
  (['money', 'oil', 'steel', 'food', 'energy', 'rareMaterials', 'manpower'] as const).forEach(k => (r[k] = 1_000_000));
};

console.log('\n--- A: DIPLOMACY ---');
{
  const s = fresh();
  const player = s.countries['valyria'];
  const [a, b, c] = Object.values(s.countries).filter(x => x.id !== 'valyria');

  gameStore.declareWar(a.id);
  assert(player.relations[a.id].status === 'WAR', 'A1: war declared');

  const nap = gameStore.sendDiplomaticProposal(a.id, 'NON_AGGRESSION');
  assert(!nap.accepted && player.relations[a.id].status === 'WAR', 'A2: non-aggression pact cannot bypass an active war');
  assert(!gameStore.sendDiplomaticProposal(a.id, 'ALLIANCE').accepted, 'A3: alliance impossible during war');
  assert(!gameStore.sendDiplomaticProposal(a.id, 'TRADE_DEAL').accepted, 'A4: trade deal impossible during war');

  a.totalLosses = 9999; // the target is bleeding, so it accepts an armistice
  const peace = gameStore.sendDiplomaticProposal(a.id, 'PEACE_TREATY');
  assert(peace.accepted, 'A5: ceasefire request accepted');
  assert(player.relations[a.id].status === 'PEACE' && a.relations['valyria'].status === 'PEACE', 'A6: accepted ceasefire is actually APPLIED on both sides');

  assert(!gameStore.sendDiplomaticProposal(a.id, 'PEACE_TREATY').accepted, 'A7: cannot request peace when not at war');

  player.relations[b.id].trustScore = 90; b.relations['valyria'].trustScore = 90;
  assert(gameStore.sendDiplomaticProposal(b.id, 'MILITARY_ACCESS').accepted, 'A8: military access accepted with high trust');
  assert(player.relations[b.id].militaryAccess && b.relations['valyria'].militaryAccess, 'A9: accepted military access is APPLIED');

  assert(gameStore.sendDiplomaticProposal(c.id, 'NON_AGGRESSION').accepted, 'A10: non-aggression pact allowed in peacetime');
  const before = c.relations['valyria'].memory.betrayals;
  gameStore.declareWar(c.id);
  assert(c.relations['valyria'].memory.betrayals === before + 1, 'A11: attacking a treaty partner is recorded as a betrayal');
}

console.log('\n--- B: ATTACK / MISSILE GUARDS ---');
{
  const s = fresh();
  const own = Object.values(s.provinces).filter(p => p.countryId === 'valyria');
  const src = own.find(p => p.neighborIds.some(n => s.provinces[n].countryId === 'valyria'))!;
  const dst = s.provinces[src.neighborIds.find(n => s.provinces[n].countryId === 'valyria')!];
  src.units = [{ id: 'x', type: 'infantry', count: 4, experience: 0, morale: 100, supply: 100 }];
  assert(gameStore.launchPlayerAttack(src.id, dst.id, ['x']) === null, 'B1: attacking your own province is refused');
  assert(src.units.length === 1 && src.units[0].count === 4, 'B2: refused attack does not consume units');
  s.countries['valyria'].ballisticMissiles = 2;
  const m = gameStore.launchBallisticMissile(dst.id);
  assert(!m.success && s.countries['valyria'].ballisticMissiles === 2, 'B3: missile on own province refused and not spent');
}

console.log('\n--- C: COMBAT ---');
{
  const s = fresh();
  const A = s.countries['valyria'];
  const D = s.countries['aethelgard'];
  const prov = Object.values(s.provinces).find(p => p.countryId === D.id)!;
  prov.defenseLevel = 5;
  prov.units = [{ id: 'd', type: 'armored_units', count: 40, experience: 90, morale: 100, supply: 100 }];
  const rep = simulateCombatEngagement({
    turn: 1, attackerCountry: A, defenderCountry: D, targetProvince: prov,
    attackingUnits: [{ id: 'a', type: 'infantry', count: 1, experience: 0, morale: 100, supply: 100 }]
  });
  assert(rep.victor === 'DEFENDER', 'C1: hopeless attack fails');
  assert((rep.survivingAttackerUnits || []).length === 0, 'C2: a single regiment destroyed in battle is really destroyed (no immortal units)');

  // tech branch modifiers
  const A2 = s.countries['solaria'];
  A2.completedTechs = ['tech_stealth_avionics'];
  const prov2 = Object.values(s.provinces).find(p => p.countryId === D.id)!;
  prov2.units = [{ id: 'd2', type: 'infantry', count: 5, experience: 50, morale: 100, supply: 100 }];
  const air = [{ id: 'f', type: 'fighters' as const, count: 6, experience: 50, morale: 100, supply: 100 }];
  const withTech = simulateCombatEngagement({ turn: 1, attackerCountry: A2, defenderCountry: D, targetProvince: JSON.parse(JSON.stringify(prov2)), attackingUnits: JSON.parse(JSON.stringify(air)) });
  A2.completedTechs = [];
  const noTech = simulateCombatEngagement({ turn: 1, attackerCountry: A2, defenderCountry: D, targetProvince: JSON.parse(JSON.stringify(prov2)), attackingUnits: JSON.parse(JSON.stringify(air)) });
  assert(withTech.attackerPower > noTech.attackerPower, 'C3: AIR tech now buffs air units (before, only LAND bonuses were applied)');
}

console.log('\n--- D: ECONOMY / TRADE ---');
{
  const s = fresh();
  const p = s.countries['valyria'];
  const market = s.tradeMarketPrices;
  const money = p.resources.money;
  assert(!executeMarketTrade(p, 'oil', NaN, true, market).success, 'D1: NaN volume rejected');
  assert(!executeMarketTrade(p, 'oil', -50, false, market).success, 'D2: negative volume rejected');
  assert(!executeMarketTrade(p, 'oil', Infinity, true, market).success, 'D3: infinite volume rejected');
  assert(!executeMarketTrade(p, 'money', 1000, false, market).success, 'D4: money cannot be "sold" for money');
  assert(!executeMarketTrade(p, 'gold', 5, true, market).success, 'D5: gold cannot be bought on the market');
  assert(p.resources.money === money && Number.isFinite(p.resources.oil), 'D6: treasury untouched by rejected trades');

  enrich(s);
  const prov = Object.values(s.provinces).find(x => x.countryId === 'valyria')!;
  const q0 = s.constructionQueue.length;
  const m0 = p.resources.money;
  assert(gameStore.queueBuilding(prov.id, 'farm'), 'D7: first building order accepted');
  assert(!gameStore.queueBuilding(prov.id, 'farm'), 'D8: duplicate pending project refused');
  assert(s.constructionQueue.length - q0 === 1 && m0 - p.resources.money > 0, 'D9: only one project queued and paid');

  // market stays in a sane band over a long time
  const g = fresh();
  for (let i = 0; i < 300; i++) gameStore.advanceTurn();
  const prices = Object.values(gameStore.getState().tradeMarketPrices);
  assert(prices.every(v => v > 0 && v < 200), 'D10: market prices stay bounded after 300 turns');
}

console.log('\n--- E: RESEARCH & EVENTS ---');
{
  const s = fresh();
  const p = s.countries['valyria'];
  assert(gameStore.startResearch('tech_supercomputing'), 'E1: research starts');
  p.currentResearch!.progress = 80;
  assert(!gameStore.startResearch('tech_industrial_automation'), 'E2: cannot silently abandon a running project');
  assert(p.currentResearch!.progress === 80, 'E3: progress preserved');

  // AI never researches a tech whose prerequisites are missing
  const w = fresh();
  let violations = 0;
  for (let turn = 1; turn <= 40; turn++) {
    Object.values(w.countries).forEach(c => {
      if (c.isPlayer) return;
      c.resources.techPoints = 5000;
      processAITurn(c.id, turn, w.countries, w.provinces, w.constructionQueue, w.militaryQueue);
      if (c.currentResearch) {
        const t = TECH_TREE.find(x => x.id === c.currentResearch!.techId)!;
        if (!t.prerequisites.every(pr => c.completedTechs.includes(pr))) violations++;
        c.completedTechs.push(t.id); c.currentResearch = null;
      }
    });
  }
  assert(violations === 0, 'E4: AI respects tech prerequisites');

  // events
  const e = fresh();
  e.activeEvents.push({
    id: 'ev1', titleKey: 't', descKey: 'd', severity: 'CRISIS',
    options: [{ label: 'pay', description: '', cost: { money: 2000 }, reward: { rareMaterials: 500 } }, { label: 'free', description: '' }]
  });
  const ep = e.countries['valyria'];
  ep.resources.money = 100; const rare = ep.resources.rareMaterials;
  assert(!gameStore.resolveEventOption('ev1', 0).success, 'E5: unaffordable directive refused (was free before)');
  assert(ep.resources.rareMaterials === rare && e.activeEvents.length === 1, 'E6: nothing granted, event still pending');
  ep.resources.money = 5000;
  assert(gameStore.resolveEventOption('ev1', 0).success && ep.resources.money === 3000 && ep.resources.rareMaterials === rare + 500, 'E7: affordable directive pays cost and grants reward');
  assert(e.activeEvents.length === 0, 'E8: resolved event removed');
}

console.log('\n--- F: WORLD DATA & STATE ---');
{
  const { provinces, countries } = generateInitialWorld('NORMAL');
  let asym = 0;
  Object.values(provinces).forEach(p => p.neighborIds.forEach(n => { if (!provinces[n].neighborIds.includes(p.id)) asym++; }));
  assert(asym === 0, 'F1: every border is crossable in both directions');
  assert(Object.values(countries).every(c => provinces[c.capitalProvinceId]?.countryId === c.id), 'F2: capitals belong to their countries');

  const merged = mergeUnitGroups([
    { id: 'a', type: 'infantry', count: 2, experience: 10, morale: 100, supply: 100 },
    { id: 'b', type: 'infantry', count: 6, experience: 50, morale: 60, supply: 60 },
    { id: 'c', type: 'artillery', count: 1, experience: 0, morale: 100, supply: 100 }
  ]);
  assert(merged.length === 2 && merged.find(g => g.type === 'infantry')!.count === 8, 'F3: same-type groups merge');
  assert(merged.find(g => g.type === 'infantry')!.experience === 40, 'F4: merge uses count-weighted averages');
}

console.log('\n--- G: QUEUES AFTER CONQUEST ---');
{
  const s = fresh();
  const prov = Object.values(s.provinces).find(p => p.countryId === 'valyria')!;
  s.militaryQueue.push({ id: 'mq', provinceId: prov.id, unitType: 'infantry', count: 3, turnsRemaining: 1, totalTurns: 1, ownerCountryId: 'valyria' });
  const before = prov.units.reduce((n, u) => n + u.count, 0);
  prov.countryId = 'aethelgard'; // province falls to the enemy
  gameStore.advanceTurn();
  const after = prov.units.reduce((n, u) => n + u.count, 0);
  assert(after === before, 'G1: production queued by the old owner does not hand free units to the conqueror');
}

console.log('\n--- H: VICTORY / DEFEAT ---');
{
  const s = fresh();
  Object.values(s.provinces).forEach(p => { if (p.countryId === 'valyria') p.countryId = 'aethelgard'; });
  gameStore.advanceTurn();
  assert(s.gameOver?.status === 'DEFEAT', 'H1: losing every province ends the campaign in defeat');
  assert(s.countries['valyria'].isAlive === false, 'H2: eliminated nation marked dead');
  const turn = s.currentTurn; gameStore.advanceTurn();
  assert(s.currentTurn === turn, 'H3: the clock stops after the campaign ends');

  const v = fresh();
  const ids = Object.keys(v.provinces);
  ids.slice(0, Math.ceil(ids.length * 0.65)).forEach(id => (v.provinces[id].countryId = 'valyria'));
  gameStore.advanceTurn();
  assert(v.gameOver?.status === 'VICTORY', 'H4: controlling 60%+ of provinces wins');
  gameStore.continueAfterVictory();
  const t2 = v.currentTurn; gameStore.advanceTurn();
  assert(v.currentTurn === t2 + 1, 'H5: after a victory the player may keep playing');

  const c = fresh();
  Object.values(c.provinces).forEach(p => (p.countryId = 'valyria'));
  gameStore.advanceTurn();
  assert(c.gameOver?.status === 'VICTORY' && c.gameOver.reason.includes('conquest'), 'H6: total conquest victory');
}

console.log('\n--- I: SAVE / LOAD ---');
{
  const s = fresh();
  s.countries['valyria'].resources.money = 1234.7;
  (async () => {
    await storage.saveGame('t', 'test', s);
    assert(s.countries['valyria'].resources.money === 1234.7, 'I1: saving does not mutate the live game state');

    const copy: any = JSON.parse(JSON.stringify(s));
    delete copy.notifications; delete copy.missions; delete copy.intelReports; delete copy.gameOver;
    copy.gameSpeed = 99; copy.isPaused = false;
    gameStore.loadSavedState(copy);
    gameStore.stopLoop();
    const st = gameStore.getState();
    assert(Array.isArray(st.notifications) && Array.isArray(st.missions) && Array.isArray(st.intelReports), 'I2: old saves are migrated with safe defaults');
    assert(st.gameSpeed === 1 && st.isPaused === true, 'I3: invalid speed repaired and loaded games start paused');

    // difficulty now matters
    const income = (d: any) => { const w = fresh(d); gameStore.advanceTurn(); return Object.values(w.countries).filter(c => !c.isPlayer).reduce((n, c) => n + c.resources.money, 0); };
    const easy = income('EASY'); const hard = income('GRAND_STRATEGIST');
    assert(hard > easy, 'I4: higher difficulty gives the AI a stronger economy');

    console.log(`\nFIXES TEST SUMMARY: ${passed}/${passed + failed} TESTS PASSED`);
    gameStore.dispose();
    process.exit(failed === 0 ? 0 : 1);
  })();
}
