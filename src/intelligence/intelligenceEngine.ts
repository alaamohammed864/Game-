import { 
  Country, 
  IntelReport, 
  Province 
} from '../types';

export function generateProvinceIntel(
  targetCountry: Country,
  targetProvince: Province,
  turn: number,
  playerHasIntelCenter: boolean,
  playerCountryId: string = 'valyria'
): IntelReport {
  // Real numbers
  let actualTroops = 0;
  let actualAir = 0;

  targetProvince.units.forEach(u => {
    if (u.type === 'infantry' || u.type === 'special_forces') {
      actualTroops += u.count * 1000;
    } else if (u.type === 'armored_units' || u.type === 'mechanized_infantry') {
      actualTroops += u.count * 500;
    } else if (u.type === 'fighters' || u.type === 'bombers' || u.type === 'drones') {
      actualAir += u.count * 20;
    }
  });

  // Base confidence: 60% without intel center, 85% with intel center
  const baseConfidence = playerHasIntelCenter ? 85 : 62;
  const confidence = Math.min(98, Math.max(45, Math.round(baseConfidence + (Math.random() * 15 - 7))));

  // Margin of error inversely related to confidence
  const errorMargin = (100 - confidence) / 100;
  const minTroops = Math.max(0, Math.round(actualTroops * (1 - errorMargin * 0.8)));
  const maxTroops = Math.round(actualTroops * (1 + errorMargin * 1.2)) + 150;

  const minAir = Math.max(0, Math.round(actualAir * (1 - errorMargin)));
  const maxAir = Math.round(actualAir * (1 + errorMargin)) + 10;

  let economicHealth: 'CRITICAL' | 'STRUGGLING' | 'STABLE' | 'BOOMING' = 'STABLE';
  if (targetCountry.resources.oil <= 0 || targetCountry.resources.money < 1000) {
    economicHealth = 'CRITICAL';
  } else if (targetCountry.resources.food < 1500) {
    economicHealth = 'STRUGGLING';
  } else if (targetCountry.resources.money > 7000) {
    economicHealth = 'BOOMING';
  }

  const isHostile = targetCountry.aiProfile.aggressionRate > 0.55 || targetCountry.relations[playerCountryId]?.status === 'WAR';

  return {
    id: `intel_${targetProvince.id}_${turn}`,
    targetCountryId: targetCountry.id,
    targetProvinceId: targetProvince.id,
    turnGathered: turn,
    confidence,
    estimatedTroops: { min: minTroops, max: maxTroops },
    estimatedAirpower: { min: minAir, max: maxAir },
    economicStrength: economicHealth,
    hostileIntentDetected: isHostile,
    summary: `Recon dossier on ${targetProvince.name} (${targetCountry.name}). Confidence level ${confidence}%. Hostile invasion preparations: ${isHostile ? 'DETECTED - HIGH ALERT' : 'Negative/Standby'}.`
  };
}
