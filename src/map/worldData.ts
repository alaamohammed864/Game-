import { Country, Province, AIDifficulty, AIPersonalityType, General } from '../types';

export interface WorldDataSetup {
  countries: Record<string, Country>;
  provinces: Record<string, Province>;
}

export function createNationGenerals(countryId: string): General[] {
  return [
    {
      id: `gen_${countryId}_1`,
      name: 'Gen. Tariq Al-Mansoor',
      title: 'Supreme Armor Vanguard Commander',
      avatarIcon: 'Tank',
      level: 1,
      specialization: 'ARMOR_SPEARHEAD',
      specializationLabel: 'قائد سلاح المدرعات والصدمة (Armor Spearhead)',
      attackBonus: 0.25,
      defenseBonus: 0.10,
      speedBonus: 0.15,
      assignedProvinceId: null,
      experience: 45
    },
    {
      id: `gen_${countryId}_2`,
      name: 'Marshal Sarah Vance',
      title: 'Chief Air Combat Marshal',
      avatarIcon: 'Plane',
      level: 1,
      specialization: 'AIR_SUPERIORITY',
      specializationLabel: 'مشير السيادة والضربات الجوية (Air Superiority)',
      attackBonus: 0.30,
      defenseBonus: 0.05,
      speedBonus: 0.20,
      assignedProvinceId: null,
      experience: 50
    },
    {
      id: `gen_${countryId}_3`,
      name: 'Gen. Hector Ironclad',
      title: 'Master Defense & Siege Architect',
      avatarIcon: 'Shield',
      level: 1,
      specialization: 'SIEGE_FORTRESS',
      specializationLabel: 'مهندس التحصينات والدفاع الحصين (Siege Fortress)',
      attackBonus: 0.05,
      defenseBonus: 0.35,
      speedBonus: 0.0,
      assignedProvinceId: null,
      experience: 40
    },
    {
      id: `gen_${countryId}_4`,
      name: 'Col. Farhan Al-Khalil',
      title: 'Strategic Supply & Fuel Director',
      avatarIcon: 'Truck',
      level: 1,
      specialization: 'LOGISTICS_MASTER',
      specializationLabel: 'خبير اللوجستيات وسلاسل الإمداد (Logistics Master)',
      attackBonus: 0.10,
      defenseBonus: 0.15,
      speedBonus: 0.25,
      assignedProvinceId: null,
      experience: 35
    }
  ];
}

export function generateInitialWorld(difficulty: AIDifficulty = 'NORMAL'): WorldDataSetup {
  const provinces: Record<string, Province> = {
    // VALYRIA REPUBLIC (4 Provinces - Western Industrial)
    p_valyria_prime: {
      id: 'p_valyria_prime',
      name: 'Valyria Metropolis (Capital)',
      countryId: 'valyria',
      originalCountryId: 'valyria',
      lat: 42.0,
      lng: -20.0,
      mapX: 24,
      mapY: 34,
      terrain: 'Urban',
      population: 18.5,
      economicValue: 85,
      defenseLevel: 3,
      infrastructure: 90,
      stability: 95,
      strategicImportance: 10,
      resourceDeposits: { money: 450, energy: 300, techPoints: 30 },
      buildings: [
        { type: 'factory', level: 3 },
        { type: 'power_plant', level: 2 },
        { type: 'research_center', level: 2 },
        { type: 'airport', level: 2 }
      ],
      units: [
        { id: 'u_val_1', type: 'infantry', count: 4, experience: 40, morale: 95, supply: 100 },
        { id: 'u_val_2', type: 'armored_units', count: 2, experience: 50, morale: 90, supply: 100 },
        { id: 'u_val_3', type: 'fighters', count: 2, experience: 60, morale: 95, supply: 100 },
        { id: 'u_val_4', type: 'air_defense', count: 1, experience: 45, morale: 90, supply: 100 }
      ],
      hasCapital: true,
      hasPort: true,
      hasAirbase: true,
      hasMilitaryBase: true,
      neighborIds: ['p_valyria_coast', 'p_valyria_plains', 'p_aethel_south']
    },
    p_valyria_coast: {
      id: 'p_valyria_coast',
      name: 'Port Sterling',
      countryId: 'valyria',
      originalCountryId: 'valyria',
      lat: 36.0,
      lng: -26.0,
      mapX: 20,
      mapY: 42,
      terrain: 'Coastal',
      population: 8.2,
      economicValue: 60,
      defenseLevel: 2,
      infrastructure: 85,
      stability: 90,
      strategicImportance: 8,
      resourceDeposits: { money: 300, food: 200 },
      buildings: [
        { type: 'port', level: 2 },
        { type: 'farm', level: 2 },
        { type: 'roads', level: 2 }
      ],
      units: [
        { id: 'u_val_5', type: 'patrol_ships', count: 3, experience: 35, morale: 88, supply: 100 },
        { id: 'u_val_6', type: 'destroyers', count: 1, experience: 55, morale: 92, supply: 100 },
        { id: 'u_val_7', type: 'infantry', count: 2, experience: 30, morale: 85, supply: 100 }
      ],
      hasCapital: false,
      hasPort: true,
      hasAirbase: false,
      hasMilitaryBase: true,
      neighborIds: ['p_valyria_prime', 'p_valyria_plains', 'p_solaria_north']
    },
    p_valyria_plains: {
      id: 'p_valyria_plains',
      name: 'Eldoria Heartland',
      countryId: 'valyria',
      originalCountryId: 'valyria',
      lat: 44.0,
      lng: -10.0,
      mapX: 29,
      mapY: 30,
      terrain: 'Plains',
      population: 11.4,
      economicValue: 65,
      defenseLevel: 1,
      infrastructure: 75,
      stability: 88,
      strategicImportance: 6,
      resourceDeposits: { food: 350, steel: 180 },
      buildings: [
        { type: 'farm', level: 3 },
        { type: 'steel_plant', level: 2 }
      ],
      units: [
        { id: 'u_val_8', type: 'mechanized_infantry', count: 2, experience: 40, morale: 88, supply: 95 }
      ],
      hasCapital: false,
      hasPort: false,
      hasAirbase: false,
      hasMilitaryBase: false,
      neighborIds: ['p_valyria_prime', 'p_valyria_coast', 'p_nordic_fjord']
    },
    p_valyria_reach: {
      id: 'p_valyria_reach',
      name: 'Blackwood Ridges',
      countryId: 'valyria',
      originalCountryId: 'valyria',
      lat: 48.0,
      lng: -15.0,
      mapX: 26,
      mapY: 22,
      terrain: 'Forest',
      population: 5.6,
      economicValue: 40,
      defenseLevel: 2,
      infrastructure: 65,
      stability: 85,
      strategicImportance: 5,
      resourceDeposits: { rareMaterials: 100, energy: 150 },
      buildings: [
        { type: 'mine', level: 2 },
        { type: 'military_base', level: 1 }
      ],
      units: [
        { id: 'u_val_9', type: 'infantry', count: 3, experience: 45, morale: 88, supply: 95 },
        { id: 'u_val_10', type: 'artillery', count: 1, experience: 50, morale: 90, supply: 95 }
      ],
      hasCapital: false,
      hasPort: false,
      hasAirbase: false,
      hasMilitaryBase: true,
      neighborIds: ['p_valyria_prime', 'p_nordic_fjord', 'p_aethel_west']
    },

    // AETHELGARD FEDERATION (4 Provinces - Northern Military Powerhouse)
    p_aethel_capital: {
      id: 'p_aethel_capital',
      name: 'Kragor Fortress (Capital)',
      countryId: 'aethelgard',
      originalCountryId: 'aethelgard',
      lat: 56.0,
      lng: 15.0,
      mapX: 45,
      mapY: 15,
      terrain: 'Mountains',
      population: 16.0,
      economicValue: 80,
      defenseLevel: 4,
      infrastructure: 85,
      stability: 92,
      strategicImportance: 10,
      resourceDeposits: { steel: 400, money: 320, rareMaterials: 180 },
      buildings: [
        { type: 'military_base', level: 3 },
        { type: 'steel_plant', level: 3 },
        { type: 'airport', level: 2 },
        { type: 'power_plant', level: 2 }
      ],
      units: [
        { id: 'u_aet_1', type: 'armored_units', count: 4, experience: 65, morale: 95, supply: 100 },
        { id: 'u_aet_2', type: 'infantry', count: 5, experience: 60, morale: 95, supply: 100 },
        { id: 'u_aet_3', type: 'artillery', count: 2, experience: 55, morale: 90, supply: 100 },
        { id: 'u_aet_4', type: 'fighters', count: 2, experience: 60, morale: 95, supply: 100 }
      ],
      hasCapital: true,
      hasPort: false,
      hasAirbase: true,
      hasMilitaryBase: true,
      neighborIds: ['p_aethel_west', 'p_aethel_south', 'p_aethel_east']
    },
    p_aethel_west: {
      id: 'p_aethel_west',
      name: 'Ironvale Heights',
      countryId: 'aethelgard',
      originalCountryId: 'aethelgard',
      lat: 52.0,
      lng: 0.0,
      mapX: 38,
      mapY: 18,
      terrain: 'Mountains',
      population: 7.5,
      economicValue: 55,
      defenseLevel: 3,
      infrastructure: 70,
      stability: 85,
      strategicImportance: 7,
      resourceDeposits: { steel: 300, rareMaterials: 150 },
      buildings: [
        { type: 'mine', level: 3 },
        { type: 'military_base', level: 2 }
      ],
      units: [
        { id: 'u_aet_5', type: 'special_forces', count: 1, experience: 75, morale: 95, supply: 100 },
        { id: 'u_aet_6', type: 'infantry', count: 3, experience: 50, morale: 88, supply: 100 }
      ],
      hasCapital: false,
      hasPort: false,
      hasAirbase: false,
      hasMilitaryBase: true,
      neighborIds: ['p_aethel_capital', 'p_valyria_reach', 'p_nordic_fjord']
    },
    p_aethel_south: {
      id: 'p_aethel_south',
      name: 'Vanguard Steppes',
      countryId: 'aethelgard',
      originalCountryId: 'aethelgard',
      lat: 46.0,
      lng: 12.0,
      mapX: 43,
      mapY: 28,
      terrain: 'Plains',
      population: 9.0,
      economicValue: 50,
      defenseLevel: 2,
      infrastructure: 75,
      stability: 82,
      strategicImportance: 7,
      resourceDeposits: { food: 220, oil: 100 },
      buildings: [
        { type: 'roads', level: 2 },
        { type: 'farm', level: 2 }
      ],
      units: [
        { id: 'u_aet_7', type: 'mechanized_infantry', count: 3, experience: 55, morale: 90, supply: 95 },
        { id: 'u_aet_8', type: 'rocket_artillery', count: 1, experience: 60, morale: 92, supply: 95 }
      ],
      hasCapital: false,
      hasPort: false,
      hasAirbase: false,
      hasMilitaryBase: false,
      neighborIds: ['p_aethel_capital', 'p_valyria_prime', 'p_zul_north', 'p_kalyan_west']
    },
    p_aethel_east: {
      id: 'p_aethel_east',
      name: 'Tundra Bastion',
      countryId: 'aethelgard',
      originalCountryId: 'aethelgard',
      lat: 58.0,
      lng: 30.0,
      mapX: 52,
      mapY: 12,
      terrain: 'Arctic',
      population: 4.2,
      economicValue: 40,
      defenseLevel: 3,
      infrastructure: 60,
      stability: 90,
      strategicImportance: 6,
      resourceDeposits: { oil: 200, rareMaterials: 120 },
      buildings: [
        { type: 'oil_field', level: 2 },
        { type: 'radar_station', level: 2 }
      ],
      units: [
        { id: 'u_aet_9', type: 'air_defense', count: 2, experience: 50, morale: 88, supply: 95 }
      ],
      hasCapital: false,
      hasPort: false,
      hasAirbase: false,
      hasMilitaryBase: true,
      neighborIds: ['p_aethel_capital', 'p_kalyan_north']
    },

    // SOLARIA DOMINION (4 Provinces - Desert Oil Powerhouse)
    p_solaria_capital: {
      id: 'p_solaria_capital',
      name: 'Helios Citadel (Capital)',
      countryId: 'solaria',
      originalCountryId: 'solaria',
      lat: 18.0,
      lng: -15.0,
      mapX: 28,
      mapY: 62,
      terrain: 'Desert',
      population: 14.0,
      economicValue: 90,
      defenseLevel: 2,
      infrastructure: 85,
      stability: 88,
      strategicImportance: 10,
      resourceDeposits: { oil: 500, money: 600, energy: 250 },
      buildings: [
        { type: 'oil_field', level: 4 },
        { type: 'factory', level: 3 },
        { type: 'airport', level: 2 },
        { type: 'power_plant', level: 2 }
      ],
      units: [
        { id: 'u_sol_1', type: 'armored_units', count: 3, experience: 45, morale: 90, supply: 100 },
        { id: 'u_sol_2', type: 'fighters', count: 3, experience: 50, morale: 92, supply: 100 },
        { id: 'u_sol_3', type: 'infantry', count: 4, experience: 40, morale: 88, supply: 100 }
      ],
      hasCapital: true,
      hasPort: false,
      hasAirbase: true,
      hasMilitaryBase: true,
      neighborIds: ['p_solaria_north', 'p_solaria_east', 'p_solaria_south']
    },
    p_solaria_north: {
      id: 'p_solaria_north',
      name: 'Oasis Sands',
      countryId: 'solaria',
      originalCountryId: 'solaria',
      lat: 28.0,
      lng: -22.0,
      mapX: 23,
      mapY: 52,
      terrain: 'Desert',
      population: 6.5,
      economicValue: 60,
      defenseLevel: 1,
      infrastructure: 70,
      stability: 85,
      strategicImportance: 7,
      resourceDeposits: { oil: 350, money: 250 },
      buildings: [
        { type: 'oil_field', level: 3 },
        { type: 'roads', level: 2 }
      ],
      units: [
        { id: 'u_sol_4', type: 'mechanized_infantry', count: 2, experience: 40, morale: 88, supply: 95 }
      ],
      hasCapital: false,
      hasPort: false,
      hasAirbase: false,
      hasMilitaryBase: false,
      neighborIds: ['p_solaria_capital', 'p_valyria_coast', 'p_zul_south']
    },
    p_solaria_east: {
      id: 'p_solaria_east',
      name: 'Dune Basin',
      countryId: 'solaria',
      originalCountryId: 'solaria',
      lat: 16.0,
      lng: 0.0,
      mapX: 35,
      mapY: 65,
      terrain: 'Desert',
      population: 5.0,
      economicValue: 45,
      defenseLevel: 1,
      infrastructure: 65,
      stability: 80,
      strategicImportance: 6,
      resourceDeposits: { oil: 300, rareMaterials: 80 },
      buildings: [
        { type: 'oil_field', level: 2 },
        { type: 'radar_station', level: 1 }
      ],
      units: [
        { id: 'u_sol_5', type: 'drones', count: 2, experience: 45, morale: 85, supply: 95 }
      ],
      hasCapital: false,
      hasPort: false,
      hasAirbase: false,
      hasMilitaryBase: false,
      neighborIds: ['p_solaria_capital', 'p_zul_south', 'p_solaria_south']
    },
    p_solaria_south: {
      id: 'p_solaria_south',
      name: 'Suncoast Reach',
      countryId: 'solaria',
      originalCountryId: 'solaria',
      lat: 6.0,
      lng: -10.0,
      mapX: 31,
      mapY: 76,
      terrain: 'Coastal',
      population: 7.8,
      economicValue: 50,
      defenseLevel: 2,
      infrastructure: 75,
      stability: 86,
      strategicImportance: 6,
      resourceDeposits: { food: 180, money: 200 },
      buildings: [
        { type: 'port', level: 2 },
        { type: 'farm', level: 2 }
      ],
      units: [
        { id: 'u_sol_6', type: 'patrol_ships', count: 2, experience: 40, morale: 88, supply: 100 },
        { id: 'u_sol_7', type: 'infantry', count: 2, experience: 35, morale: 85, supply: 100 }
      ],
      hasCapital: false,
      hasPort: true,
      hasAirbase: false,
      hasMilitaryBase: false,
      neighborIds: ['p_solaria_capital', 'p_solaria_east', 'p_oceana_west']
    },

    // KALYAN COMMONWEALTH (4 Provinces - Eastern Demographic & Tech Power)
    p_kalyan_capital: {
      id: 'p_kalyan_capital',
      name: 'Ashoka Megacity (Capital)',
      countryId: 'kalyan',
      originalCountryId: 'kalyan',
      lat: 30.0,
      lng: 65.0,
      mapX: 72,
      mapY: 48,
      terrain: 'Urban',
      population: 32.0,
      economicValue: 95,
      defenseLevel: 3,
      infrastructure: 88,
      stability: 90,
      strategicImportance: 10,
      resourceDeposits: { manpower: 800, money: 550, techPoints: 35 },
      buildings: [
        { type: 'factory', level: 4 },
        { type: 'research_center', level: 3 },
        { type: 'hospital', level: 2 },
        { type: 'power_plant', level: 3 }
      ],
      units: [
        { id: 'u_kal_1', type: 'infantry', count: 8, experience: 50, morale: 92, supply: 100 },
        { id: 'u_kal_2', type: 'mechanized_infantry', count: 3, experience: 45, morale: 90, supply: 100 },
        { id: 'u_kal_3', type: 'rocket_artillery', count: 2, experience: 55, morale: 90, supply: 100 },
        { id: 'u_kal_4', type: 'air_defense', count: 2, experience: 50, morale: 90, supply: 100 }
      ],
      hasCapital: true,
      hasPort: false,
      hasAirbase: true,
      hasMilitaryBase: true,
      neighborIds: ['p_kalyan_north', 'p_kalyan_west', 'p_kalyan_delta']
    },
    p_kalyan_north: {
      id: 'p_kalyan_north',
      name: 'Himal Ridges',
      countryId: 'kalyan',
      originalCountryId: 'kalyan',
      lat: 42.0,
      lng: 60.0,
      mapX: 68,
      mapY: 34,
      terrain: 'Mountains',
      population: 12.0,
      economicValue: 60,
      defenseLevel: 3,
      infrastructure: 70,
      stability: 88,
      strategicImportance: 7,
      resourceDeposits: { rareMaterials: 220, steel: 200 },
      buildings: [
        { type: 'mine', level: 3 },
        { type: 'military_base', level: 2 }
      ],
      units: [
        { id: 'u_kal_5', type: 'special_forces', count: 2, experience: 60, morale: 92, supply: 100 },
        { id: 'u_kal_6', type: 'artillery', count: 2, experience: 45, morale: 88, supply: 100 }
      ],
      hasCapital: false,
      hasPort: false,
      hasAirbase: false,
      hasMilitaryBase: true,
      neighborIds: ['p_kalyan_capital', 'p_aethel_east', 'p_kalyan_west']
    },
    p_kalyan_west: {
      id: 'p_kalyan_west',
      name: 'Indus Valleys',
      countryId: 'kalyan',
      originalCountryId: 'kalyan',
      lat: 34.0,
      lng: 45.0,
      mapX: 60,
      mapY: 42,
      terrain: 'Plains',
      population: 20.0,
      economicValue: 70,
      defenseLevel: 2,
      infrastructure: 80,
      stability: 86,
      strategicImportance: 7,
      resourceDeposits: { food: 450, money: 250 },
      buildings: [
        { type: 'farm', level: 4 },
        { type: 'roads', level: 2 }
      ],
      units: [
        { id: 'u_kal_7', type: 'armored_units', count: 2, experience: 45, morale: 88, supply: 95 },
        { id: 'u_kal_8', type: 'infantry', count: 4, experience: 40, morale: 88, supply: 95 }
      ],
      hasCapital: false,
      hasPort: false,
      hasAirbase: false,
      hasMilitaryBase: false,
      neighborIds: ['p_kalyan_capital', 'p_kalyan_north', 'p_zul_north', 'p_aethel_south']
    },
    p_kalyan_delta: {
      id: 'p_kalyan_delta',
      name: 'Bengal Littoral',
      countryId: 'kalyan',
      originalCountryId: 'kalyan',
      lat: 20.0,
      lng: 75.0,
      mapX: 78,
      mapY: 58,
      terrain: 'Coastal',
      population: 18.0,
      economicValue: 75,
      defenseLevel: 2,
      infrastructure: 82,
      stability: 88,
      strategicImportance: 8,
      resourceDeposits: { money: 350, food: 300 },
      buildings: [
        { type: 'port', level: 3 },
        { type: 'factory', level: 2 }
      ],
      units: [
        { id: 'u_kal_9', type: 'frigates', count: 2, experience: 45, morale: 90, supply: 100 },
        { id: 'u_kal_10', type: 'destroyers', count: 1, experience: 50, morale: 92, supply: 100 }
      ],
      hasCapital: false,
      hasPort: true,
      hasAirbase: false,
      hasMilitaryBase: false,
      neighborIds: ['p_kalyan_capital', 'p_oceana_east']
    },

    // NORDIC CONCORDAT (4 Provinces - Subarctic Naval & Science Fortress)
    p_nordic_capital: {
      id: 'p_nordic_capital',
      name: 'Frostholm Citadel (Capital)',
      countryId: 'nordic',
      originalCountryId: 'nordic',
      lat: 68.0,
      lng: -5.0,
      mapX: 32,
      mapY: 6,
      terrain: 'Arctic',
      population: 6.2,
      economicValue: 75,
      defenseLevel: 4,
      infrastructure: 92,
      stability: 98,
      strategicImportance: 10,
      resourceDeposits: { techPoints: 50, energy: 350, money: 300 },
      buildings: [
        { type: 'research_center', level: 4 },
        { type: 'university', level: 3 },
        { type: 'radar_station', level: 3 },
        { type: 'port', level: 2 }
      ],
      units: [
        { id: 'u_nor_1', type: 'submarines', count: 3, experience: 70, morale: 95, supply: 100 },
        { id: 'u_nor_2', type: 'special_forces', count: 2, experience: 75, morale: 96, supply: 100 },
        { id: 'u_nor_3', type: 'fighters', count: 2, experience: 65, morale: 95, supply: 100 }
      ],
      hasCapital: true,
      hasPort: true,
      hasAirbase: true,
      hasMilitaryBase: true,
      neighborIds: ['p_nordic_fjord', 'p_nordic_mines', 'p_nordic_shelf']
    },
    p_nordic_fjord: {
      id: 'p_nordic_fjord',
      name: 'North Fjord Deep',
      countryId: 'nordic',
      originalCountryId: 'nordic',
      lat: 60.0,
      lng: -12.0,
      mapX: 28,
      mapY: 12,
      terrain: 'Coastal',
      population: 4.0,
      economicValue: 50,
      defenseLevel: 2,
      infrastructure: 85,
      stability: 95,
      strategicImportance: 7,
      resourceDeposits: { oil: 250, food: 150 },
      buildings: [
        { type: 'port', level: 3 },
        { type: 'oil_field', level: 2 }
      ],
      units: [
        { id: 'u_nor_4', type: 'frigates', count: 2, experience: 60, morale: 92, supply: 100 },
        { id: 'u_nor_5', type: 'destroyers', count: 1, experience: 65, morale: 94, supply: 100 }
      ],
      hasCapital: false,
      hasPort: true,
      hasAirbase: false,
      hasMilitaryBase: true,
      neighborIds: ['p_nordic_capital', 'p_valyria_reach', 'p_valyria_plains', 'p_aethel_west']
    },
    p_nordic_mines: {
      id: 'p_nordic_mines',
      name: 'Boreal Iron Ridge',
      countryId: 'nordic',
      originalCountryId: 'nordic',
      lat: 65.0,
      lng: 10.0,
      mapX: 41,
      mapY: 8,
      terrain: 'Mountains',
      population: 3.0,
      economicValue: 45,
      defenseLevel: 3,
      infrastructure: 75,
      stability: 92,
      strategicImportance: 6,
      resourceDeposits: { steel: 350, rareMaterials: 180 },
      buildings: [
        { type: 'mine', level: 3 },
        { type: 'steel_plant', level: 2 }
      ],
      units: [
        { id: 'u_nor_6', type: 'air_defense', count: 2, experience: 60, morale: 90, supply: 100 }
      ],
      hasCapital: false,
      hasPort: false,
      hasAirbase: false,
      hasMilitaryBase: true,
      neighborIds: ['p_nordic_capital', 'p_aethel_capital']
    },
    p_nordic_shelf: {
      id: 'p_nordic_shelf',
      name: 'Glacier Offshore Bank',
      countryId: 'nordic',
      originalCountryId: 'nordic',
      lat: 72.0,
      lng: 5.0,
      mapX: 37,
      mapY: 2,
      terrain: 'Arctic',
      population: 1.2,
      economicValue: 50,
      defenseLevel: 1,
      infrastructure: 70,
      stability: 95,
      strategicImportance: 6,
      resourceDeposits: { oil: 300, energy: 200 },
      buildings: [
        { type: 'oil_field', level: 3 },
        { type: 'radar_station', level: 2 }
      ],
      units: [
        { id: 'u_nor_7', type: 'submarines', count: 2, experience: 75, morale: 95, supply: 100 }
      ],
      hasCapital: false,
      hasPort: false,
      hasAirbase: false,
      hasMilitaryBase: false,
      neighborIds: ['p_nordic_capital']
    },

    // ZUL-QARNAIN COALITION (4 Provinces - Central Crossroads & Refining Power)
    p_zul_capital: {
      id: 'p_zul_capital',
      name: 'Bab-Al-Shams (Capital)',
      countryId: 'zulqarnain',
      originalCountryId: 'zulqarnain',
      lat: 32.0,
      lng: 25.0,
      mapX: 50,
      mapY: 45,
      terrain: 'Urban',
      population: 15.0,
      economicValue: 85,
      defenseLevel: 3,
      infrastructure: 85,
      stability: 85,
      strategicImportance: 10,
      resourceDeposits: { oil: 400, money: 500, energy: 200 },
      buildings: [
        { type: 'oil_field', level: 3 },
        { type: 'factory', level: 3 },
        { type: 'airport', level: 2 },
        { type: 'intelligence_center', level: 2 }
      ],
      units: [
        { id: 'u_zul_1', type: 'bombers', count: 2, experience: 50, morale: 92, supply: 100 },
        { id: 'u_zul_2', type: 'fighters', count: 3, experience: 55, morale: 92, supply: 100 },
        { id: 'u_zul_3', type: 'infantry', count: 4, experience: 45, morale: 88, supply: 100 }
      ],
      hasCapital: true,
      hasPort: false,
      hasAirbase: true,
      hasMilitaryBase: true,
      neighborIds: ['p_zul_north', 'p_zul_south', 'p_zul_east']
    },
    p_zul_north: {
      id: 'p_zul_north',
      name: 'Levant Gates',
      countryId: 'zulqarnain',
      originalCountryId: 'zulqarnain',
      lat: 40.0,
      lng: 28.0,
      mapX: 52,
      mapY: 36,
      terrain: 'Plains',
      population: 8.5,
      economicValue: 55,
      defenseLevel: 2,
      infrastructure: 80,
      stability: 82,
      strategicImportance: 8,
      resourceDeposits: { food: 220, money: 200 },
      buildings: [
        { type: 'roads', level: 2 },
        { type: 'farm', level: 2 }
      ],
      units: [
        { id: 'u_zul_4', type: 'armored_units', count: 2, experience: 50, morale: 88, supply: 95 }
      ],
      hasCapital: false,
      hasPort: false,
      hasAirbase: false,
      hasMilitaryBase: false,
      neighborIds: ['p_zul_capital', 'p_aethel_south', 'p_kalyan_west']
    },
    p_zul_south: {
      id: 'p_zul_south',
      name: 'Arabian Dunes',
      countryId: 'zulqarnain',
      originalCountryId: 'zulqarnain',
      lat: 22.0,
      lng: 22.0,
      mapX: 47,
      mapY: 57,
      terrain: 'Desert',
      population: 6.0,
      economicValue: 70,
      defenseLevel: 2,
      infrastructure: 75,
      stability: 80,
      strategicImportance: 7,
      resourceDeposits: { oil: 450, money: 300 },
      buildings: [
        { type: 'oil_field', level: 3 },
        { type: 'military_base', level: 2 }
      ],
      units: [
        { id: 'u_zul_5', type: 'rocket_artillery', count: 2, experience: 50, morale: 88, supply: 95 }
      ],
      hasCapital: false,
      hasPort: false,
      hasAirbase: false,
      hasMilitaryBase: true,
      neighborIds: ['p_zul_capital', 'p_solaria_north', 'p_solaria_east', 'p_oceana_central']
    },
    p_zul_east: {
      id: 'p_zul_east',
      name: 'Persian Strait Haven',
      countryId: 'zulqarnain',
      originalCountryId: 'zulqarnain',
      lat: 26.0,
      lng: 38.0,
      mapX: 55,
      mapY: 52,
      terrain: 'Coastal',
      population: 7.2,
      economicValue: 65,
      defenseLevel: 3,
      infrastructure: 85,
      stability: 84,
      strategicImportance: 9,
      resourceDeposits: { money: 320, oil: 200 },
      buildings: [
        { type: 'port', level: 3 },
        { type: 'radar_station', level: 2 }
      ],
      units: [
        { id: 'u_zul_6', type: 'destroyers', count: 1, experience: 55, morale: 90, supply: 100 },
        { id: 'u_zul_7', type: 'patrol_ships', count: 2, experience: 45, morale: 88, supply: 100 }
      ],
      hasCapital: false,
      hasPort: true,
      hasAirbase: false,
      hasMilitaryBase: false,
      neighborIds: ['p_zul_capital', 'p_oceana_central', 'p_kalyan_west']
    },

    // OCEANA LEAGUE (4 Provinces - Island & Archipelago Carrier Fleets)
    p_oceana_capital: {
      id: 'p_oceana_capital',
      name: 'Coral Atoll Nexus (Capital)',
      countryId: 'oceana',
      originalCountryId: 'oceana',
      lat: -8.0,
      lng: 50.0,
      mapX: 62,
      mapY: 82,
      terrain: 'Coastal',
      population: 12.0,
      economicValue: 80,
      defenseLevel: 3,
      infrastructure: 88,
      stability: 92,
      strategicImportance: 10,
      resourceDeposits: { money: 450, rareMaterials: 220, food: 250 },
      buildings: [
        { type: 'port', level: 4 },
        { type: 'airport', level: 3 },
        { type: 'research_center', level: 2 }
      ],
      units: [
        { id: 'u_oce_1', type: 'aircraft_carriers', count: 1, experience: 75, morale: 98, supply: 100 },
        { id: 'u_oce_2', type: 'destroyers', count: 2, experience: 65, morale: 95, supply: 100 },
        { id: 'u_oce_3', type: 'fighters', count: 3, experience: 70, morale: 95, supply: 100 },
        { id: 'u_oce_4', type: 'submarines', count: 2, experience: 65, morale: 92, supply: 100 }
      ],
      hasCapital: true,
      hasPort: true,
      hasAirbase: true,
      hasMilitaryBase: true,
      neighborIds: ['p_oceana_west', 'p_oceana_central', 'p_oceana_east']
    },
    p_oceana_west: {
      id: 'p_oceana_west',
      name: 'Zephyr Shoals',
      countryId: 'oceana',
      originalCountryId: 'oceana',
      lat: -12.0,
      lng: 15.0,
      mapX: 44,
      mapY: 86,
      terrain: 'Coastal',
      population: 4.5,
      economicValue: 45,
      defenseLevel: 2,
      infrastructure: 75,
      stability: 90,
      strategicImportance: 6,
      resourceDeposits: { food: 200, money: 180 },
      buildings: [
        { type: 'port', level: 2 },
        { type: 'farm', level: 2 }
      ],
      units: [
        { id: 'u_oce_5', type: 'patrol_ships', count: 2, experience: 50, morale: 90, supply: 100 }
      ],
      hasCapital: false,
      hasPort: true,
      hasAirbase: false,
      hasMilitaryBase: false,
      neighborIds: ['p_oceana_capital', 'p_solaria_south', 'p_oceana_central']
    },
    p_oceana_central: {
      id: 'p_oceana_central',
      name: 'Equatorial Archway',
      countryId: 'oceana',
      originalCountryId: 'oceana',
      lat: 4.0,
      lng: 35.0,
      mapX: 54,
      mapY: 72,
      terrain: 'Coastal',
      population: 5.5,
      economicValue: 50,
      defenseLevel: 2,
      infrastructure: 80,
      stability: 88,
      strategicImportance: 8,
      resourceDeposits: { money: 280, energy: 150 },
      buildings: [
        { type: 'port', level: 2 },
        { type: 'radar_station', level: 2 }
      ],
      units: [
        { id: 'u_oce_6', type: 'frigates', count: 2, experience: 60, morale: 92, supply: 100 }
      ],
      hasCapital: false,
      hasPort: true,
      hasAirbase: false,
      hasMilitaryBase: false,
      neighborIds: ['p_oceana_capital', 'p_zul_south', 'p_zul_east', 'p_oceana_west']
    },
    p_oceana_east: {
      id: 'p_oceana_east',
      name: 'Austral Isle Anchor',
      countryId: 'oceana',
      originalCountryId: 'oceana',
      lat: -2.0,
      lng: 70.0,
      mapX: 74,
      mapY: 74,
      terrain: 'Coastal',
      population: 6.0,
      economicValue: 55,
      defenseLevel: 2,
      infrastructure: 80,
      stability: 90,
      strategicImportance: 7,
      resourceDeposits: { rareMaterials: 150, money: 220 },
      buildings: [
        { type: 'port', level: 2 },
        { type: 'mine', level: 2 }
      ],
      units: [
        { id: 'u_oce_7', type: 'destroyers', count: 1, experience: 60, morale: 92, supply: 100 },
        { id: 'u_oce_8', type: 'infantry', count: 2, experience: 40, morale: 88, supply: 100 }
      ],
      hasCapital: false,
      hasPort: true,
      hasAirbase: false,
      hasMilitaryBase: false,
      neighborIds: ['p_oceana_capital', 'p_kalyan_delta']
    }
  };

  const countries: Record<string, Country> = {
    valyria: {
      id: 'valyria',
      name: 'Valyrian Republic',
      code: 'VAL',
      color: '#3b82f6',
      flagColor: '#1d4ed8',
      capitalProvinceId: 'p_valyria_prime',
      isPlayer: true,
      isAlive: true,
      resources: {
        money: 6000,
        oil: 1500,
        steel: 2000,
        food: 3000,
        energy: 1800,
        rareMaterials: 800,
        techPoints: 200,
        manpower: 15000,
        gold: 150
      },
      completedTechs: ['tech_infantry_doctrine'],
      currentResearch: null,
      relations: {},
      aiProfile: {
        personality: 'Balanced',
        difficulty,
        aggressionRate: 0.35,
        economicFocus: 0.65,
        militaryFocus: 0.5,
        techFocus: 0.7,
        riskTolerance: 0.4,
        strategicGoals: ['Maintain economic dominance', 'Protect maritime trade routes', 'Fortify northern border'],
        memories: []
      },
      totalKills: 0,
      totalLosses: 0,
      score: 1200
    },
    aethelgard: {
      id: 'aethelgard',
      name: 'Aethelgard Federation',
      code: 'AET',
      color: '#ef4444',
      flagColor: '#b91c1c',
      capitalProvinceId: 'p_aethel_capital',
      isPlayer: false,
      isAlive: true,
      resources: {
        money: 5000,
        oil: 1200,
        steel: 3500,
        food: 2400,
        energy: 1600,
        rareMaterials: 900,
        techPoints: 180,
        manpower: 20000,
        gold: 100
      },
      completedTechs: ['tech_infantry_doctrine', 'tech_composite_armor'],
      currentResearch: null,
      relations: {},
      aiProfile: {
        personality: 'Expansionist',
        difficulty,
        aggressionRate: 0.7,
        economicFocus: 0.4,
        militaryFocus: 0.85,
        techFocus: 0.45,
        riskTolerance: 0.65,
        strategicGoals: ['Expand southern buffer zone', 'Subjugate rich border plains', 'Build armored dominance'],
        memories: []
      },
      totalKills: 0,
      totalLosses: 0,
      score: 1150
    },
    solaria: {
      id: 'solaria',
      name: 'Solaria Dominion',
      code: 'SOL',
      color: '#eab308',
      flagColor: '#ca8a04',
      capitalProvinceId: 'p_solaria_capital',
      isPlayer: false,
      isAlive: true,
      resources: {
        money: 8500,
        oil: 4500,
        steel: 1800,
        food: 2000,
        energy: 2200,
        rareMaterials: 650,
        techPoints: 160,
        manpower: 12000,
        gold: 250
      },
      completedTechs: ['tech_industrial_automation'],
      currentResearch: null,
      relations: {},
      aiProfile: {
        personality: 'Economic',
        difficulty,
        aggressionRate: 0.25,
        economicFocus: 0.85,
        militaryFocus: 0.45,
        techFocus: 0.5,
        riskTolerance: 0.3,
        strategicGoals: ['Monopolize petroleum global exports', 'Build vast fiscal reserves', 'Defend coastal refinery ports'],
        memories: []
      },
      totalKills: 0,
      totalLosses: 0,
      score: 1300
    },
    kalyan: {
      id: 'kalyan',
      name: 'Kalyan Commonwealth',
      code: 'KAL',
      color: '#10b981',
      flagColor: '#047857',
      capitalProvinceId: 'p_kalyan_capital',
      isPlayer: false,
      isAlive: true,
      resources: {
        money: 7200,
        oil: 1800,
        steel: 2800,
        food: 5000,
        energy: 2400,
        rareMaterials: 1100,
        techPoints: 220,
        manpower: 35000,
        gold: 180
      },
      completedTechs: ['tech_industrial_automation', 'tech_logistics_optimization'],
      currentResearch: null,
      relations: {},
      aiProfile: {
        personality: 'Defensive',
        difficulty,
        aggressionRate: 0.3,
        economicFocus: 0.75,
        militaryFocus: 0.6,
        techFocus: 0.65,
        riskTolerance: 0.35,
        strategicGoals: ['Maintain demographic equilibrium', 'Deter western incursions', 'Expand eastern port facilities'],
        memories: []
      },
      totalKills: 0,
      totalLosses: 0,
      score: 1400
    },
    nordic: {
      id: 'nordic',
      name: 'Nordic Concordat',
      code: 'NOR',
      color: '#06b6d4',
      flagColor: '#0891b2',
      capitalProvinceId: 'p_nordic_capital',
      isPlayer: false,
      isAlive: true,
      resources: {
        money: 5800,
        oil: 2400,
        steel: 2400,
        food: 2100,
        energy: 2800,
        rareMaterials: 1300,
        techPoints: 350,
        manpower: 9000,
        gold: 140
      },
      completedTechs: ['tech_supercomputing', 'tech_infantry_doctrine'],
      currentResearch: null,
      relations: {},
      aiProfile: {
        personality: 'Diplomatic',
        difficulty,
        aggressionRate: 0.2,
        economicFocus: 0.6,
        militaryFocus: 0.5,
        techFocus: 0.9,
        riskTolerance: 0.25,
        strategicGoals: ['Lead world scientific research', 'Safeguard arctic shipping lanes', 'Form defensive covenants'],
        memories: []
      },
      totalKills: 0,
      totalLosses: 0,
      score: 1250
    },
    zulqarnain: {
      id: 'zulqarnain',
      name: 'Zul-Qarnain Coalition',
      code: 'ZUL',
      color: '#f97316',
      flagColor: '#c2410c',
      capitalProvinceId: 'p_zul_capital',
      isPlayer: false,
      isAlive: true,
      resources: {
        money: 6400,
        oil: 3800,
        steel: 2000,
        food: 2500,
        energy: 1900,
        rareMaterials: 750,
        techPoints: 170,
        manpower: 16000,
        gold: 120
      },
      completedTechs: ['tech_industrial_automation'],
      currentResearch: null,
      relations: {},
      aiProfile: {
        personality: 'Opportunistic',
        difficulty,
        aggressionRate: 0.55,
        economicFocus: 0.6,
        militaryFocus: 0.7,
        techFocus: 0.5,
        riskTolerance: 0.6,
        strategicGoals: ['Control central transport chokepoint', 'Exploit neighboring border conflicts', 'Expand aerial strike wings'],
        memories: []
      },
      totalKills: 0,
      totalLosses: 0,
      score: 1180
    },
    oceana: {
      id: 'oceana',
      name: 'Oceana League',
      code: 'OCE',
      color: '#8b5cf6',
      flagColor: '#6d28d9',
      capitalProvinceId: 'p_oceana_capital',
      isPlayer: false,
      isAlive: true,
      resources: {
        money: 6800,
        oil: 2000,
        steel: 2600,
        food: 2800,
        energy: 1700,
        rareMaterials: 1000,
        techPoints: 210,
        manpower: 14000,
        gold: 160
      },
      completedTechs: ['tech_infantry_doctrine'],
      currentResearch: null,
      relations: {},
      aiProfile: {
        personality: 'Balanced',
        difficulty,
        aggressionRate: 0.4,
        economicFocus: 0.65,
        militaryFocus: 0.75,
        techFocus: 0.6,
        riskTolerance: 0.45,
        strategicGoals: ['Maintain unrivaled carrier fleet superiority', 'Secure oceanic archipelago sea routes', 'Enforce freedom of navigation'],
        memories: []
      },
      totalKills: 0,
      totalLosses: 0,
      score: 1220
    }
  };

  // Setup bilateral relations
  const countryIds = Object.keys(countries);
  for (const c1 of countryIds) {
    for (const c2 of countryIds) {
      if (c1 === c2) continue;
      // Default relations: peace with moderate trust
      let trustScore = 20;
      let relationScore = 25;
      let status: any = 'PEACE';
      let tradeAgreementActive = false;

      // Historical nuances
      if ((c1 === 'valyria' && c2 === 'nordic') || (c1 === 'nordic' && c2 === 'valyria')) {
        trustScore = 60;
        relationScore = 65;
        status = 'NON_AGGRESSION';
        tradeAgreementActive = true;
      } else if ((c1 === 'aethelgard' && c2 === 'valyria') || (c1 === 'valyria' && c2 === 'aethelgard')) {
        trustScore = -20;
        relationScore = -25;
        status = 'PEACE'; // Tense cold peace
      } else if ((c1 === 'solaria' && c2 === 'zulqarnain') || (c1 === 'zulqarnain' && c2 === 'solaria')) {
        trustScore = 40;
        relationScore = 45;
        tradeAgreementActive = true;
      }

      countries[c1].relations[c2] = {
        targetCountryId: c2,
        status,
        trustScore,
        relationScore,
        threatPerception: 30,
        militaryAccess: status === 'ALLIANCE',
        tradeAgreementActive,
        memory: {
          warsFought: 0,
          betrayals: 0,
          treatiesKept: 1,
          tradeVolume: tradeAgreementActive ? 500 : 0,
          lastAggressionTurn: -1,
          summary: 'Neutral sovereign relationship maintained.'
        }
      };
    }
  }

  // Initialize generals & strategic weapons
  Object.keys(countries).forEach(cId => {
    countries[cId].generals = createNationGenerals(cId);
    countries[cId].ballisticMissiles = 3;
  });

  // Guarantee symmetric adjacency (a border must be crossable in both directions).
  Object.values(provinces).forEach(prov => {
    prov.neighborIds.forEach(nId => {
      const other = provinces[nId];
      if (other && nId !== prov.id && !other.neighborIds.includes(prov.id)) {
        other.neighborIds.push(prov.id);
      }
    });
  });

  return { countries, provinces };
}
