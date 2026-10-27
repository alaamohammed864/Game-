import { 
  BuildingDefinition, 
  BuildingType, 
  ResourceKey, 
  TechNode, 
  TerrainType, 
  UnitDefinition, 
  UnitType,
  AIDifficulty,
  Mission
} from '../types';

export const GAME_TITLE = "GLOBAL COMMAND: AGE OF STRATEGY";

export const BASE_MARKET_PRICES: Record<ResourceKey, number> = {
  money: 1,
  oil: 25,
  steel: 18,
  food: 12,
  energy: 15,
  rareMaterials: 45,
  techPoints: 30,
  manpower: 10,
  gold: 100,
};

export const UNIT_DEFINITIONS: Record<UnitType, UnitDefinition> = {
  // LAND
  infantry: {
    id: 'infantry',
    name: 'Standard Infantry',
    branch: 'LAND',
    attack: 24,
    defense: 36,
    speed: 1,
    range: 1,
    fuelConsumption: 1,
    cost: { money: 400, steel: 100, food: 200, manpower: 1000 },
    productionTurns: 1,
    manpowerRequired: 1000,
    maintenanceCost: 30,
    terrainModifiers: { Urban: 1.4, Mountains: 1.3, Forest: 1.25, Plains: 1.0, Desert: 0.9 },
    description: 'Disciplined infantry regiment equipped with rifles, light mortars, and anti-tank armaments.'
  },
  mechanized_infantry: {
    id: 'mechanized_infantry',
    name: 'Mechanized Infantry',
    branch: 'LAND',
    attack: 45,
    defense: 45,
    speed: 2,
    range: 1,
    fuelConsumption: 5,
    cost: { money: 850, steel: 350, oil: 200, manpower: 800 },
    productionTurns: 2,
    manpowerRequired: 800,
    maintenanceCost: 65,
    terrainModifiers: { Plains: 1.2, Desert: 1.15, Urban: 0.95, Mountains: 0.8 },
    description: 'Armored personnel carriers providing high mobility and combined-arms infantry shock.'
  },
  armored_units: {
    id: 'armored_units',
    name: 'Main Battle Tanks',
    branch: 'LAND',
    attack: 75,
    defense: 65,
    speed: 2,
    range: 1,
    fuelConsumption: 12,
    cost: { money: 1500, steel: 700, rareMaterials: 250, oil: 400, manpower: 400 },
    productionTurns: 3,
    manpowerRequired: 400,
    maintenanceCost: 120,
    terrainModifiers: { Plains: 1.45, Desert: 1.3, Mountains: 0.6, Urban: 0.7, Forest: 0.75 },
    description: 'Heavy breakthrough armor with reactive plating and high-caliber smoothbore cannons.'
  },
  artillery: {
    id: 'artillery',
    name: 'Self-Propelled Artillery',
    branch: 'LAND',
    attack: 60,
    defense: 25,
    speed: 1,
    range: 2,
    fuelConsumption: 4,
    cost: { money: 900, steel: 500, oil: 150, manpower: 300 },
    productionTurns: 2,
    manpowerRequired: 300,
    maintenanceCost: 70,
    terrainModifiers: { Plains: 1.2, Mountains: 0.85, Urban: 1.1 },
    description: 'Long-range bombardment batteries providing crushing fire support to frontline units.'
  },
  rocket_artillery: {
    id: 'rocket_artillery',
    name: 'MLRS Rocket Artillery',
    branch: 'LAND',
    attack: 85,
    defense: 20,
    speed: 2,
    range: 2,
    fuelConsumption: 8,
    cost: { money: 1400, steel: 600, rareMaterials: 300, oil: 300, manpower: 250 },
    productionTurns: 3,
    manpowerRequired: 250,
    maintenanceCost: 110,
    terrainModifiers: { Plains: 1.3, Desert: 1.2, Mountains: 0.75 },
    description: 'Multiple launch rocket systems delivering devastating saturation barrages.'
  },
  air_defense: {
    id: 'air_defense',
    name: 'SAM Mobile Air Defense',
    branch: 'LAND',
    attack: 35,
    defense: 70,
    speed: 1,
    range: 2,
    fuelConsumption: 4,
    cost: { money: 1100, steel: 400, rareMaterials: 350, energy: 200, manpower: 300 },
    productionTurns: 2,
    manpowerRequired: 300,
    maintenanceCost: 85,
    terrainModifiers: { Plains: 1.1, Urban: 1.2, Mountains: 1.15 },
    description: 'Surface-to-air missile batteries that intercept enemy bombers, drones, and fighters.'
  },
  special_forces: {
    id: 'special_forces',
    name: 'Special Operations Task Force',
    branch: 'LAND',
    attack: 65,
    defense: 55,
    speed: 2,
    range: 1,
    fuelConsumption: 2,
    cost: { money: 1200, rareMaterials: 200, food: 300, manpower: 300 },
    productionTurns: 2,
    manpowerRequired: 300,
    maintenanceCost: 90,
    terrainModifiers: { Mountains: 1.5, Urban: 1.45, Forest: 1.4, Arctic: 1.3 },
    description: 'Elite covert operatives trained for reconnaissance, sabotage, and asymmetric raids.'
  },

  // AIR
  fighters: {
    id: 'fighters',
    name: 'Air Superiority Fighters',
    branch: 'AIR',
    attack: 70,
    defense: 60,
    speed: 4,
    range: 3,
    fuelConsumption: 15,
    cost: { money: 2200, steel: 450, rareMaterials: 500, oil: 600, manpower: 150 },
    productionTurns: 3,
    manpowerRequired: 150,
    maintenanceCost: 160,
    terrainModifiers: { Plains: 1.1, Desert: 1.1, Mountains: 1.0, Urban: 1.0 },
    description: 'Supersonic multirole jet fighters designed to secure air dominance and shoot down hostile craft.'
  },
  bombers: {
    id: 'bombers',
    name: 'Strategic Heavy Bombers',
    branch: 'AIR',
    attack: 95,
    defense: 30,
    speed: 3,
    range: 4,
    fuelConsumption: 22,
    cost: { money: 3200, steel: 900, rareMaterials: 750, oil: 900, manpower: 200 },
    productionTurns: 4,
    manpowerRequired: 200,
    maintenanceCost: 220,
    terrainModifiers: { Urban: 1.35, Plains: 1.25, Mountains: 0.9 },
    description: 'Long-range strike bombers capable of leveling enemy fortifications and industrial sectors.'
  },
  transport_aircraft: {
    id: 'transport_aircraft',
    name: 'Tactical Airlift Transports',
    branch: 'AIR',
    attack: 5,
    defense: 25,
    speed: 4,
    range: 4,
    fuelConsumption: 12,
    cost: { money: 1200, steel: 400, oil: 400, manpower: 120 },
    productionTurns: 2,
    manpowerRequired: 120,
    maintenanceCost: 80,
    terrainModifiers: {},
    description: 'Heavy airlift cargo planes providing rapid overseas reinforcement and emergency supplies.'
  },
  recon_aircraft: {
    id: 'recon_aircraft',
    name: 'AWACS & Reconnaissance',
    branch: 'AIR',
    attack: 10,
    defense: 35,
    speed: 3,
    range: 4,
    fuelConsumption: 10,
    cost: { money: 1600, steel: 300, rareMaterials: 600, oil: 350, manpower: 100 },
    productionTurns: 2,
    manpowerRequired: 100,
    maintenanceCost: 110,
    terrainModifiers: {},
    description: 'Airborne radar surveillance craft boosting friendly combat intel and target acquisition.'
  },
  drones: {
    id: 'drones',
    name: 'Combat UAV Drone Swarm',
    branch: 'AIR',
    attack: 55,
    defense: 30,
    speed: 3,
    range: 3,
    fuelConsumption: 4,
    cost: { money: 950, steel: 200, rareMaterials: 400, energy: 300, manpower: 50 },
    productionTurns: 1,
    manpowerRequired: 50,
    maintenanceCost: 50,
    terrainModifiers: { Plains: 1.2, Desert: 1.25, Urban: 1.15 },
    description: 'Unmanned loitering combat drones offering precision strikes at minimal human risk.'
  },

  // NAVY
  patrol_ships: {
    id: 'patrol_ships',
    name: 'Coastal Patrol Corvettes',
    branch: 'NAVY',
    attack: 30,
    defense: 40,
    speed: 2,
    range: 2,
    fuelConsumption: 6,
    cost: { money: 1000, steel: 600, oil: 300, manpower: 250 },
    productionTurns: 2,
    manpowerRequired: 250,
    maintenanceCost: 75,
    terrainModifiers: { Coastal: 1.35 },
    description: 'Agile fast-attack corvettes defending littoral waters and intercepting infiltrators.'
  },
  frigates: {
    id: 'frigates',
    name: 'Guided Missile Frigates',
    branch: 'NAVY',
    attack: 60,
    defense: 65,
    speed: 2,
    range: 3,
    fuelConsumption: 10,
    cost: { money: 2100, steel: 1200, rareMaterials: 500, oil: 500, manpower: 400 },
    productionTurns: 3,
    manpowerRequired: 400,
    maintenanceCost: 150,
    terrainModifiers: { Coastal: 1.1 },
    description: 'Multimission surface combatants equipped for anti-submarine and air-defense duties.'
  },
  destroyers: {
    id: 'destroyers',
    name: 'Heavy Aegis Destroyers',
    branch: 'NAVY',
    attack: 85,
    defense: 80,
    speed: 2,
    range: 3,
    fuelConsumption: 16,
    cost: { money: 3400, steel: 2000, rareMaterials: 900, oil: 800, manpower: 600 },
    productionTurns: 4,
    manpowerRequired: 600,
    maintenanceCost: 240,
    terrainModifiers: {},
    description: 'State-of-the-art naval flagships wielding advanced phased-array radars and vertical launch tubes.'
  },
  submarines: {
    id: 'submarines',
    name: 'Attack Submarines',
    branch: 'NAVY',
    attack: 90,
    defense: 45,
    speed: 2,
    range: 3,
    fuelConsumption: 8,
    cost: { money: 2900, steel: 1500, rareMaterials: 800, energy: 400, manpower: 300 },
    productionTurns: 3,
    manpowerRequired: 300,
    maintenanceCost: 190,
    terrainModifiers: {},
    description: 'Stealth hunter-killer submarines lethal against surface fleets and trade convoys.'
  },
  aircraft_carriers: {
    id: 'aircraft_carriers',
    name: 'Supercarrier Strike Group',
    branch: 'NAVY',
    attack: 115,
    defense: 100,
    speed: 2,
    range: 4,
    fuelConsumption: 30,
    cost: { money: 6500, steel: 4000, rareMaterials: 2200, oil: 1500, manpower: 1500 },
    productionTurns: 6,
    manpowerRequired: 1500,
    maintenanceCost: 450,
    terrainModifiers: {},
    description: 'Immense floating sovereign airbases projecting overwhelming power across oceanic theatres.'
  }
};

export const BUILDING_DEFINITIONS: Record<BuildingType, BuildingDefinition> = {
  farm: {
    id: 'farm',
    name: 'Agri-Industrial Complex',
    description: 'Mass automated agricultural farming ensuring high population food stability and manpower growth.',
    maxLevel: 5,
    baseCost: { money: 350, steel: 80 },
    baseBuildTurns: 1,
    production: { food: 280, manpower: 60 },
    upkeep: { energy: 15, money: 20 }
  },
  oil_field: {
    id: 'oil_field',
    name: 'Petroleum Refinery & Extraction',
    description: 'Drives nation-wide military mechanized mobility, aircraft operations, and industrial chemicals.',
    maxLevel: 5,
    baseCost: { money: 600, steel: 250 },
    baseBuildTurns: 2,
    production: { oil: 220 },
    upkeep: { energy: 30, money: 45 }
  },
  mine: {
    id: 'mine',
    name: 'Deep Ore Excavation',
    description: 'Extracts strategic minerals and critical rare materials for advanced microelectronics and weaponry.',
    maxLevel: 5,
    baseCost: { money: 500, steel: 150 },
    baseBuildTurns: 2,
    production: { rareMaterials: 90 },
    upkeep: { energy: 25, money: 35 }
  },
  factory: {
    id: 'factory',
    name: 'Commercial Assembly Works',
    description: 'Mass consumer and precision manufacturing generating heavy tax revenues and commercial GDP.',
    maxLevel: 5,
    baseCost: { money: 550, steel: 200 },
    baseBuildTurns: 2,
    production: { money: 380 },
    upkeep: { energy: 40, steel: 25 }
  },
  steel_plant: {
    id: 'steel_plant',
    name: 'Heavy Smelting Blast Furnace',
    description: 'Converts raw inputs into forged structural steel for military hull plating and rapid construction.',
    maxLevel: 5,
    baseCost: { money: 650, energy: 100 },
    baseBuildTurns: 2,
    production: { steel: 260 },
    upkeep: { energy: 45, money: 40 }
  },
  power_plant: {
    id: 'power_plant',
    name: 'High-Output Nuclear & Grid Station',
    description: 'Provides immense electric power to fuel high-tech industries, radar arrays, and urban cities.',
    maxLevel: 5,
    baseCost: { money: 800, steel: 350, rareMaterials: 100 },
    baseBuildTurns: 2,
    production: { energy: 400 },
    upkeep: { money: 50 }
  },
  research_center: {
    id: 'research_center',
    name: 'National Technology Institute',
    description: 'Top-secret R&D complex accelerating discoveries in military doctrine, computing, and aerospace.',
    maxLevel: 5,
    baseCost: { money: 750, steel: 150, rareMaterials: 180 },
    baseBuildTurns: 2,
    production: { techPoints: 35 },
    upkeep: { energy: 40, money: 60 }
  },
  university: {
    id: 'university',
    name: 'Polytechnic University',
    description: 'Educates scientific minds and skilled engineers, boosting provincial stability and innovation.',
    maxLevel: 3,
    baseCost: { money: 600, steel: 100 },
    baseBuildTurns: 2,
    production: { techPoints: 20, money: 120 },
    upkeep: { money: 40 },
    specialEffect: '+10% Province Stability'
  },
  hospital: {
    id: 'hospital',
    name: 'Advanced Medical & Trauma Center',
    description: 'Provides civilian healthcare and field-trauma recovery, boosting manpower replenishment.',
    maxLevel: 3,
    baseCost: { money: 500, steel: 100 },
    baseBuildTurns: 1,
    production: { manpower: 120 },
    upkeep: { money: 45, energy: 15 },
    specialEffect: '+15% Manpower growth & reduces pandemic unrest'
  },
  roads: {
    id: 'roads',
    name: 'Trans-Provincial Highway Network',
    description: 'Expedites land logistics, unit travel speeds, and commercial trade flows.',
    maxLevel: 3,
    baseCost: { money: 300, steel: 80 },
    baseBuildTurns: 1,
    production: { money: 100 },
    upkeep: { money: 15 },
    specialEffect: '+25% Unit Movement & +10% Trade Flow'
  },
  railways: {
    id: 'railways',
    name: 'Heavy Freight Rail Corridor',
    description: 'Allows massive industrial cargo transport, boosting heavy factory efficiency and mobilization.',
    maxLevel: 3,
    baseCost: { money: 500, steel: 250 },
    baseBuildTurns: 2,
    production: { steel: 50, money: 150 },
    upkeep: { energy: 20, money: 25 },
    specialEffect: '+30% Supply throughput'
  },
  port: {
    id: 'port',
    name: 'Deepwater Naval Harbor & Shipyard',
    description: 'Constructs and repairs naval surface warships and nuclear submarines.',
    maxLevel: 4,
    baseCost: { money: 900, steel: 500 },
    baseBuildTurns: 3,
    production: { money: 200 },
    upkeep: { money: 60, energy: 25 },
    specialEffect: 'Enables construction of naval warships'
  },
  airport: {
    id: 'airport',
    name: 'Strategic Airbase & Hangars',
    description: 'Hardened aircraft shelters, refueling depots, and runways for fighter wings and bombers.',
    maxLevel: 4,
    baseCost: { money: 850, steel: 400 },
    baseBuildTurns: 2,
    production: {},
    upkeep: { money: 50, energy: 30 },
    specialEffect: 'Enables construction and staging of air squadrons'
  },
  military_base: {
    id: 'military_base',
    name: 'Bunker Network & Fortress Garrison',
    description: 'Reinforced defensive fortifications giving defenders a substantial combat multiplier.',
    maxLevel: 5,
    baseCost: { money: 700, steel: 450 },
    baseBuildTurns: 2,
    production: {},
    upkeep: { money: 50 },
    specialEffect: '+20% Defense multiplier per level'
  },
  radar_station: {
    id: 'radar_station',
    name: 'Over-the-Horizon Early Warning Radar',
    description: 'Detects approaching enemy air wings and hostile armor movements in neighboring provinces.',
    maxLevel: 3,
    baseCost: { money: 600, steel: 150, rareMaterials: 200 },
    baseBuildTurns: 1,
    production: {},
    upkeep: { energy: 45, money: 40 },
    specialEffect: '+35% Intelligence accuracy & warning of impending invasions'
  },
  intelligence_center: {
    id: 'intelligence_center',
    name: 'Signals Intelligence & Cyber HQ',
    description: 'Coordinates covert operations, satellite recon, counter-espionage, and cyber warfare.',
    maxLevel: 3,
    baseCost: { money: 800, rareMaterials: 350 },
    baseBuildTurns: 2,
    production: { techPoints: 15 },
    upkeep: { energy: 35, money: 75 },
    specialEffect: 'Enables high-confidence espionage and tech-theft missions'
  },
  missile_silo: {
    id: 'missile_silo',
    name: 'Ballistic Missile Silo & Iron Shield Array',
    description: 'Underground hardened launch silos storing long-range ballistic missiles capable of precision deep-strikes across any theatre, paired with anti-ballistic interceptors.',
    maxLevel: 3,
    baseCost: { money: 1500, steel: 800, rareMaterials: 500, energy: 300 },
    baseBuildTurns: 3,
    production: {},
    upkeep: { money: 100, energy: 50 },
    specialEffect: 'Enables tactical ballistic missile strikes & air-defense interception'
  }
};

export const TECH_TREE: TechNode[] = [
  // MILITARY
  {
    id: 'tech_infantry_doctrine',
    name: 'Combined Arms Doctrine',
    category: 'MILITARY',
    tier: 1,
    cost: 100,
    prerequisites: [],
    description: 'Integrates mechanization, close air support, and infantry communication.',
    bonuses: { unitBonus: { branch: 'LAND', attackBonus: 0.1, defenseBonus: 0.1 } }
  },
  {
    id: 'tech_composite_armor',
    name: 'Composite & Reactive Armor',
    category: 'MILITARY',
    tier: 2,
    cost: 250,
    prerequisites: ['tech_infantry_doctrine'],
    description: 'Advanced titanium-ceramic alloys absorbing kinetic projectile impacts.',
    bonuses: { unitBonus: { branch: 'LAND', defenseBonus: 0.2 } }
  },
  {
    id: 'tech_stealth_avionics',
    name: 'Stealth Aerospace Avionics',
    category: 'MILITARY',
    tier: 3,
    cost: 500,
    prerequisites: ['tech_composite_armor'],
    description: 'Radar-absorbent materials and low-observable airframe contours.',
    bonuses: { unitBonus: { branch: 'AIR', attackBonus: 0.25, defenseBonus: 0.15 } }
  },
  {
    id: 'tech_naval_aegis',
    name: 'Aegis Naval Defense Grid',
    category: 'MILITARY',
    tier: 3,
    cost: 550,
    prerequisites: ['tech_composite_armor'],
    description: 'Automated phased array radar tracking and counter-missile integration.',
    bonuses: { unitBonus: { branch: 'NAVY', attackBonus: 0.2, defenseBonus: 0.25 } }
  },

  // ECONOMY
  {
    id: 'tech_industrial_automation',
    name: 'Industrial Robotic Automation',
    category: 'ECONOMY',
    tier: 1,
    cost: 120,
    prerequisites: [],
    description: 'Robotic precision tooling that raises factory and steel throughput.',
    bonuses: { resourceBonus: { money: 100, steel: 80 }, efficiencyBonus: 0.15 }
  },
  {
    id: 'tech_deep_petroleum_drilling',
    name: 'Deep Petroleum Extraction',
    category: 'ECONOMY',
    tier: 2,
    cost: 260,
    prerequisites: ['tech_industrial_automation'],
    description: 'Hydraulic fracturing and ultra-deep drilling unlocking tight crude reserves.',
    bonuses: { resourceBonus: { oil: 120 } }
  },
  {
    id: 'tech_fusion_power',
    name: 'Compact Fusion Reactor',
    category: 'ECONOMY',
    tier: 3,
    cost: 650,
    prerequisites: ['tech_deep_petroleum_drilling'],
    description: 'Magnetic confinement fusion supplying abundant zero-emission energy.',
    bonuses: { resourceBonus: { energy: 350 }, efficiencyBonus: 0.25 }
  },

  // SCIENCE
  {
    id: 'tech_supercomputing',
    name: 'Quantum Supercomputing Array',
    category: 'SCIENCE',
    tier: 1,
    cost: 150,
    prerequisites: [],
    description: 'Accelerates simulations, cryptographic decoding, and strategic AI.',
    bonuses: { resourceBonus: { techPoints: 30 } }
  },
  {
    id: 'tech_satellite_constellation',
    name: 'Global Satellite Recon Constellation',
    category: 'SCIENCE',
    tier: 2,
    cost: 350,
    prerequisites: ['tech_supercomputing'],
    description: 'Real-time low-Earth orbit imaging revealing enemy deployments globally.',
    bonuses: { efficiencyBonus: 0.2 }
  },
  {
    id: 'tech_neural_battle_management',
    name: 'Neural Command AI',
    category: 'SCIENCE',
    tier: 3,
    cost: 700,
    prerequisites: ['tech_satellite_constellation'],
    description: 'Real-time algorithmic battle coordination granting decisive tactical edges.',
    bonuses: { unitBonus: { attackBonus: 0.2, defenseBonus: 0.2 } }
  },

  // INFRASTRUCTURE
  {
    id: 'tech_logistics_optimization',
    name: 'Algorithmic Logistics Grid',
    category: 'INFRASTRUCTURE',
    tier: 1,
    cost: 110,
    prerequisites: [],
    description: 'Streamlines supply lines and minimizes fuel waste across military corridors.',
    bonuses: { infrastructureBonus: 0.2 }
  },
  {
    id: 'tech_hardened_bunkers',
    name: 'Deep Subterranean Fortifications',
    category: 'INFRASTRUCTURE',
    tier: 2,
    cost: 280,
    prerequisites: ['tech_logistics_optimization'],
    description: 'Super-hardened command shelters impervious to orbital or aerial strikes.',
    bonuses: { unitBonus: { branch: 'LAND', defenseBonus: 0.25 } }
  },
  {
    id: 'tech_supersonic_maglev',
    name: 'Transcontinental Maglev Network',
    category: 'INFRASTRUCTURE',
    tier: 3,
    cost: 580,
    prerequisites: ['tech_hardened_bunkers'],
    description: 'Hyperloop conduits allowing instant mobilization of whole army divisions.',
    bonuses: { resourceBonus: { money: 200 }, infrastructureBonus: 0.35 }
  }
];

export const AI_DIFFICULTY_MODIFIERS: Record<AIDifficulty, {
  name: string;
  threatEvaluationWeight: number;
  economicCompetence: number;
  militaryCoordination: number;
  diplomaticCunning: number;
  reactionSpeed: number;
}> = {
  EASY: {
    name: 'Cadet (Easy)',
    threatEvaluationWeight: 0.6,
    economicCompetence: 0.7,
    militaryCoordination: 0.6,
    diplomaticCunning: 0.5,
    reactionSpeed: 0.5
  },
  NORMAL: {
    name: 'Commander (Normal)',
    threatEvaluationWeight: 1.0,
    economicCompetence: 1.0,
    militaryCoordination: 1.0,
    diplomaticCunning: 1.0,
    reactionSpeed: 1.0
  },
  HARD: {
    name: 'General (Hard)',
    threatEvaluationWeight: 1.25,
    economicCompetence: 1.2,
    militaryCoordination: 1.3,
    diplomaticCunning: 1.25,
    reactionSpeed: 1.2
  },
  EXPERT: {
    name: 'Field Marshal (Expert)',
    threatEvaluationWeight: 1.5,
    economicCompetence: 1.35,
    militaryCoordination: 1.5,
    diplomaticCunning: 1.45,
    reactionSpeed: 1.4
  },
  GRAND_STRATEGIST: {
    name: 'Grand Strategist (Master)',
    threatEvaluationWeight: 1.8,
    economicCompetence: 1.5,
    militaryCoordination: 1.8,
    diplomaticCunning: 1.7,
    reactionSpeed: 1.6
  }
};

export const INITIAL_MISSIONS: Mission[] = [
  {
    id: 'mission_industrial_giant',
    titleKey: 'mission_industrial_title',
    descKey: 'mission_industrial_desc',
    progress: 0,
    goal: 3000,
    isCompleted: false,
    isClaimed: false,
    rewards: { gold: 50, money: 2500, rareMaterials: 400 }
  },
  {
    id: 'mission_strategic_territory',
    titleKey: 'mission_territory_title',
    descKey: 'mission_territory_desc',
    progress: 4,
    goal: 6,
    isCompleted: false,
    isClaimed: false,
    rewards: { gold: 100, manpower: 5000, techPoints: 150 }
  },
  {
    id: 'mission_tech_mastery',
    titleKey: 'mission_tech_title',
    descKey: 'mission_tech_desc',
    progress: 0,
    goal: 5,
    isCompleted: false,
    isClaimed: false,
    rewards: { gold: 75, techPoints: 300, energy: 1000 }
  },
  {
    id: 'mission_coalition_architect',
    titleKey: 'mission_alliance_title',
    descKey: 'mission_alliance_desc',
    progress: 0,
    goal: 2,
    isCompleted: false,
    isClaimed: false,
    rewards: { gold: 80, money: 3000, food: 1500 }
  },
  {
    id: 'mission_oil_autarky',
    titleKey: 'mission_oil_title',
    descKey: 'mission_oil_desc',
    progress: 0,
    goal: 2000,
    isCompleted: false,
    isClaimed: false,
    rewards: { gold: 60, oil: 1000, steel: 500 }
  }
];
