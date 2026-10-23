import { Country, DiplomaticRelation, DiplomaticStatus } from '../types';

/**
 * Creates default initialized relationship between two countries if none exists.
 */
export function createDefaultRelation(targetCountryId: string, status: DiplomaticStatus = 'PEACE'): DiplomaticRelation {
  return {
    targetCountryId,
    status,
    trustScore: 0,
    relationScore: 0,
    threatPerception: 20,
    militaryAccess: false,
    tradeAgreementActive: false,
    memory: {
      warsFought: 0,
      betrayals: 0,
      treatiesKept: 0,
      tradeVolume: 0,
      lastAggressionTurn: -1,
      summary: 'Baseline sovereign diplomatic relations established.'
    }
  };
}

/**
 * Safely ensures bilateral relationship entries exist and are mutually consistent
 * between two countries.
 */
export function ensureBilateralRelation(
  countryA: Country | undefined | null,
  countryB: Country | undefined | null
): { relAtoB: DiplomaticRelation; relBtoA: DiplomaticRelation } | null {
  if (!countryA || !countryB || countryA.id === countryB.id) {
    return null;
  }

  if (!countryA.relations) {
    countryA.relations = {};
  }
  if (!countryB.relations) {
    countryB.relations = {};
  }

  if (!countryA.relations[countryB.id]) {
    countryA.relations[countryB.id] = createDefaultRelation(countryB.id);
  }
  if (!countryB.relations[countryA.id]) {
    countryB.relations[countryA.id] = createDefaultRelation(countryA.id);
  }

  const relA = countryA.relations[countryB.id];
  const relB = countryB.relations[countryA.id];

  // Harmonize conflicting statuses (WAR takes precedence over peaceful treaties; otherwise A's status or default to PEACE)
  if (relA.status !== relB.status) {
    if (relA.status === 'WAR' || relB.status === 'WAR') {
      relA.status = 'WAR';
      relB.status = 'WAR';
      relA.tradeAgreementActive = false;
      relB.tradeAgreementActive = false;
      relA.militaryAccess = false;
      relB.militaryAccess = false;
    } else {
      // Synchronize to the more specific agreement
      const dominantStatus = relA.status === 'PEACE' ? relB.status : relA.status;
      relA.status = dominantStatus;
      relB.status = dominantStatus;
    }
  }

  return { relAtoB: relA, relBtoA: relB };
}

/**
 * Safely sets diplomatic status bilaterally between two countries,
 * adjusting trust and mutually incompatible treaty flags.
 */
export function setBilateralDiplomaticStatus(
  countryA: Country,
  countryB: Country,
  status: DiplomaticStatus,
  trustImpact: number = 0,
  turn: number = 1
): boolean {
  const rels = ensureBilateralRelation(countryA, countryB);
  if (!rels) return false;

  const { relAtoB, relBtoA } = rels;

  // Incompatible state resolution
  if (status === 'WAR') {
    relAtoB.status = 'WAR';
    relBtoA.status = 'WAR';
    relAtoB.tradeAgreementActive = false;
    relBtoA.tradeAgreementActive = false;
    relAtoB.militaryAccess = false;
    relBtoA.militaryAccess = false;
    relAtoB.trustScore = Math.max(-100, Math.min(100, relAtoB.trustScore - 40 + trustImpact));
    relBtoA.trustScore = Math.max(-100, Math.min(100, relBtoA.trustScore - 40 + trustImpact));
    relAtoB.memory.warsFought += 1;
    relBtoA.memory.warsFought += 1;
    relAtoB.memory.lastAggressionTurn = turn;
    relBtoA.memory.lastAggressionTurn = turn;
  } else {
    relAtoB.status = status;
    relBtoA.status = status;
    if (trustImpact !== 0) {
      relAtoB.trustScore = Math.max(-100, Math.min(100, relAtoB.trustScore + trustImpact));
      relBtoA.trustScore = Math.max(-100, Math.min(100, relBtoA.trustScore + trustImpact));
    }
    if (status === 'ALLIANCE' || status === 'DEFENSIVE_PACT') {
      relAtoB.militaryAccess = true;
      relBtoA.militaryAccess = true;
      relAtoB.memory.treatiesKept += 1;
      relBtoA.memory.treatiesKept += 1;
    }
  }

  return true;
}

/**
 * Validates whether country A can declare war on country B.
 */
export function validateWarDeclaration(
  attacker: Country | undefined | null,
  target: Country | undefined | null
): { valid: boolean; reason?: string } {
  if (!attacker || !target) {
    return { valid: false, reason: 'Invalid sovereign nation reference.' };
  }
  if (attacker.id === target.id) {
    return { valid: false, reason: 'A nation cannot declare war on itself.' };
  }
  if (!target.isAlive) {
    return { valid: false, reason: 'Target nation is already eliminated.' };
  }
  const rels = ensureBilateralRelation(attacker, target);
  if (rels && rels.relAtoB.status === 'WAR') {
    return { valid: false, reason: 'Nations are already in a state of declared war.' };
  }
  return { valid: true };
}
