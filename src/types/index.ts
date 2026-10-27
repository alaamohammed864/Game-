export type AIPersonalityType = 
  | 'Aggressive' 
  | 'Defensive' 
  | 'Economic' 
  | 'Expansionist' 
  | 'Diplomatic' 
  | 'Opportunistic' 
  | 'Balanced';

export type AIDifficulty = 
  | 'EASY' 
  | 'NORMAL' 
  | 'HARD' 
  | 'EXPERT' 
  | 'GRAND_STRATEGIST';

export type TerrainType = 
  | 'Plains' 
  | 'Mountains' 
  | 'Desert' 
  | 'Urban' 
  | 'Forest' 
  | 'Coastal' 
  | 'Arctic';

export type UnitBranch = 'LAND' | 'AIR' | 'NAVY';

export type UnitType = 
  // LAND
  | 'infantry'
  | 'mechanized_infantry'
  | 'armored_units'
  | 'artillery'
  | 'rocket_artillery'
  | 'air_defense'
  | 'special_forces'
  // AIR
  | 'fighters'
  | 'bombers'
  | 'transport_aircraft'
  | 'recon_aircraft'
  | 'drones'
  // NAVY
  | 'patrol_ships'
  | 'frigates'
  | 'destroyers'
  | 'submarines'
  | 'aircraft_carriers';

export type BuildingType = 
  | 'farm'
  | 'oil_field'
  | 'mine'
  | 'factory'
  | 'steel_plant'
  | 'power_plant'
  | 'research_center'
  | 'university'
  | 'hospital'
  | 'roads'
  | 'railways'
  | 'port'
  | 'airport'
  | 'military_base'
  | 'radar_station'
  | 'intelligence_center'
  | 'missile_silo';

export type ResourceKey = 
  | 'money'
  | 'oil'
  | 'steel'
  | 'food'
  | 'energy'
  | 'rareMaterials'
  | 'techPoints'
  | 'manpower'
  | 'gold';

export interface Resources {
  money: number;
  oil: number;
  steel: number;
  food: number;
  energy: number;
  rareMaterials: number;
  techPoints: number;
  manpower: number;
  gold: number;
}

export interface ResourceRate {
  production: number;
  consumption: number;
  net: number;
}

export type ResourceBalance = Record<ResourceKey, ResourceRate>;

export interface UnitDefinition {
  id: UnitType;
  name: string;
  branch: UnitBranch;
  attack: number;
  defense: number;
  speed: number;
  range: number;
  fuelConsumption: number; // per turn in operations
  cost: Partial<Record<ResourceKey, number>>;
  productionTurns: number;
  manpowerRequired: number;
  maintenanceCost: number; // money per turn
  terrainModifiers: Partial<Record<TerrainType, number>>; // e.g. 1.2 = +20% power
  description: string;
}

export interface UnitGroup {
  id: string;
  type: UnitType;
  count: number;
  experience: number; // 0 to 100
  morale: number; // 0 to 100
  supply: number; // 0 to 100
}

export interface BuildingDefinition {
  id: BuildingType;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: Partial<Record<ResourceKey, number>>;
  baseBuildTurns: number;
  production: Partial<Record<ResourceKey, number>>;
  upkeep: Partial<Record<ResourceKey, number>>;
  specialEffect?: string;
}

export interface ProvinceBuilding {
  type: BuildingType;
  level: number;
}

export interface ConstructionQueueItem {
  id: string;
  provinceId: string;
  type: BuildingType;
  targetLevel: number;
  turnsRemaining: number;
  totalTurns: number;
  ownerCountryId?: string; // owner when queued; item is dropped if the province changes hands
}

export interface MilitaryQueueItem {
  id: string;
  provinceId: string;
  unitType: UnitType;
  count: number;
  turnsRemaining: number;
  totalTurns: number;
  ownerCountryId?: string; // owner when queued; item is dropped if the province changes hands
}

export interface Province {
  id: string;
  name: string;
  countryId: string;
  originalCountryId: string;
  lat: number;
  lng: number;
  mapX: number; // Normalized 0-100 for 2D map
  mapY: number; // Normalized 0-100 for 2D map
  terrain: TerrainType;
  population: number; // In millions
  economicValue: number;
  defenseLevel: number; // Fortification level (0-5)
  infrastructure: number; // (0-100)
  stability: number; // (0-100)
  strategicImportance: number; // (1-10)
  resourceDeposits: Partial<Record<ResourceKey, number>>;
  buildings: ProvinceBuilding[];
  units: UnitGroup[];
  hasCapital: boolean;
  hasPort: boolean;
  hasAirbase: boolean;
  hasMilitaryBase: boolean;
  neighborIds: string[];
}

export type DiplomaticStatus = 
  | 'ALLIANCE'
  | 'DEFENSIVE_PACT'
  | 'NON_AGGRESSION'
  | 'TRADE_AGREEMENT'
  | 'PEACE'
  | 'CEASEFIRE'
  | 'WAR';

export interface DiplomaticMemory {
  warsFought: number;
  betrayals: number;
  treatiesKept: number;
  tradeVolume: number;
  lastAggressionTurn: number;
  summary: string;
}

export interface DiplomaticRelation {
  targetCountryId: string;
  status: DiplomaticStatus;
  trustScore: number; // -100 to 100
  relationScore: number; // -100 to 100
  threatPerception: number; // 0 to 100
  militaryAccess: boolean;
  tradeAgreementActive: boolean;
  memory: DiplomaticMemory;
}

export interface TechNode {
  id: string;
  name: string;
  category: 'MILITARY' | 'ECONOMY' | 'SCIENCE' | 'INFRASTRUCTURE';
  tier: number;
  cost: number;
  prerequisites: string[];
  description: string;
  bonuses: {
    unitBonus?: { branch?: UnitBranch; attackBonus?: number; defenseBonus?: number };
    resourceBonus?: Partial<Record<ResourceKey, number>>;
    efficiencyBonus?: number;
    infrastructureBonus?: number;
  };
}

export interface IntelReport {
  id: string;
  targetCountryId: string;
  targetProvinceId?: string;
  turnGathered: number;
  confidence: number; // percentage (0 - 100)
  estimatedTroops: { min: number; max: number };
  estimatedAirpower: { min: number; max: number };
  economicStrength: 'CRITICAL' | 'STRUGGLING' | 'STABLE' | 'BOOMING';
  hostileIntentDetected: boolean;
  summary: string;
}

export interface AIMemoryItem {
  type: 'WAR' | 'TREATY_BROKEN' | 'AID_RECEIVED' | 'INVASION_REPULSED';
  turn: number;
  countryId: string;
  sentimentImpact: number;
  detail: string;
}

export interface CountryAIProfile {
  personality: AIPersonalityType;
  difficulty: AIDifficulty;
  aggressionRate: number; // 0 to 1
  economicFocus: number; // 0 to 1
  militaryFocus: number; // 0 to 1
  techFocus: number; // 0 to 1
  riskTolerance: number; // 0 to 1
  strategicGoals: string[];
  memories: AIMemoryItem[];
}

export interface General {
  id: string;
  name: string;
  title: string;
  avatarIcon: string;
  level: number;
  specialization: 'ARMOR_SPEARHEAD' | 'AIR_SUPERIORITY' | 'SIEGE_FORTRESS' | 'LOGISTICS_MASTER' | 'COVERT_OPS';
  specializationLabel: string;
  attackBonus: number; // e.g. 0.20 for +20%
  defenseBonus: number;
  speedBonus: number;
  assignedProvinceId: string | null;
  experience: number;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  color: string;
  flagColor: string;
  capitalProvinceId: string;
  isPlayer: boolean;
  isAlive: boolean;
  resources: Resources;
  completedTechs: string[];
  currentResearch: { techId: string; progress: number } | null;
  relations: Record<string, DiplomaticRelation>;
  aiProfile: CountryAIProfile;
  totalKills: number;
  totalLosses: number;
  score: number;
  generals?: General[];
  ballisticMissiles?: number;
  lastMissileTurn?: number;
}

export interface BattleReport {
  id: string;
  turn: number;
  provinceId: string;
  provinceName: string;
  attackerCountryId: string;
  attackerCountryName: string;
  defenderCountryId: string;
  defenderCountryName: string;
  attackerPower: number;
  defenderPower: number;
  attackerLosses: { totalTroops: number; vehicles: number; aircraft: number };
  defenderLosses: { totalTroops: number; vehicles: number; aircraft: number };
  terrain: TerrainType;
  airSuperiority: 'ATTACKER' | 'DEFENDER' | 'CONTESTED' | 'NONE';
  attackerSupplyPct: number;
  defenderSupplyPct: number;
  victor: 'ATTACKER' | 'DEFENDER';
  provinceCaptured: boolean;
  detailsLog: string[];
  survivingAttackerUnits?: UnitGroup[];
}

export interface MissileStrikeRecord {
  id: string;
  targetProvinceId: string;
  turn: number;
  outcome: 'HIT' | 'INTERCEPTED';
  launchedAt: number;
}

export interface Mission {
  id: string;
  titleKey: string;
  descKey: string;
  progress: number;
  goal: number;
  isCompleted: boolean;
  isClaimed: boolean;
  rewards: Partial<Record<ResourceKey, number>>;
}

export interface EventOption {
  textKey: string;
  consequencesKey: string;
  effects: (state: any) => void;
}

export interface GameEvent {
  id: string;
  titleKey: string;
  descKey: string;
  severity: 'INFO' | 'WARNING' | 'CRISIS' | 'BOOM';
  countryId?: string;
  options: {
    label: string;
    description: string;
    cost?: Partial<Record<ResourceKey, number>>;
    reward?: Partial<Record<ResourceKey, number>>;
    stabilityDelta?: number;
    relationDelta?: { countryId: string; delta: number };
  }[];
}

export interface GameNotification {
  id: string;
  turn: number;
  type: 'COMBAT' | 'DIPLOMACY' | 'ECONOMY' | 'RESEARCH' | 'EVENT' | 'INTEL' | 'MILITARY';
  title: string;
  message: string;
  provinceId?: string;
  countryId?: string;
}

export type ViewTab = 
  | 'OVERVIEW'
  | 'MILITARY'
  | 'GENERALS'
  | 'ECONOMY'
  | 'RESEARCH'
  | 'DIPLOMACY'
  | 'INTELLIGENCE'
  | 'MISSIONS'
  | 'WAR_ROOM';

export interface GameOverState {
  status: 'VICTORY' | 'DEFEAT';
  reason: string;
  turn: number;
  acknowledged?: boolean; // VICTORY only: player chose to keep playing
}

export type DiplomaticProposal =
  | 'ALLIANCE'
  | 'DEFENSIVE_PACT'
  | 'NON_AGGRESSION'
  | 'PEACE'
  | 'PEACE_TREATY'
  | 'TRADE_DEAL'
  | 'TRADE_AGREEMENT'
  | 'MILITARY_ACCESS';

export interface GameState {
  version: string;
  gameId: string;
  currentTurn: number;
  currentDate: string; // e.g. "Oct 2026"
  isPaused: boolean;
  gameSpeed: 1 | 2 | 5; // Turns per second or ticker interval
  playerCountryId: string;
  activeDifficulty: AIDifficulty;
  isDevMode: boolean;
  fogOfWarRevealed: boolean;
  unlimitedGoldDev?: boolean;
  unlimitedResourcesDev: boolean;
  instantBuildDev?: boolean;
  instantResearchDev?: boolean;
  countries: Record<string, Country>;
  provinces: Record<string, Province>;
  constructionQueue: ConstructionQueueItem[];
  militaryQueue: MilitaryQueueItem[];
  recentBattles: BattleReport[];
  missileStrikes: MissileStrikeRecord[];
  notifications: GameNotification[];
  activeEvents: GameEvent[];
  missions: Mission[];
  intelReports: IntelReport[];
  tradeMarketPrices: Record<ResourceKey, number>;
  gameOver?: GameOverState | null;
}
