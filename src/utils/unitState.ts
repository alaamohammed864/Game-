import { BattleReport, Country, Province, UnitType } from '../types';

export interface ProvinceUnitState {
  underFire: boolean;
  lowFuel: boolean;
  lowSupply: boolean;
  entrenched: boolean;
  hasGeneral: boolean;
  generalName?: string;
  statusLabel: string;
  statusColor: string;
}

export function evaluateProvinceUnitState(
  province: Province,
  countries: Record<string, Country>,
  provinces: Record<string, Province>,
  recentBattles: BattleReport[] = [],
  currentTurn: number = 1
): ProvinceUnitState {
  const country = countries[province.countryId];
  const units = province.units;

  // 1. Under Fire check:
  // Active if this province experienced a battle in the current or previous turn,
  // or borders an enemy country at WAR that has combat units present.
  const hadRecentBattle = recentBattles.some(
    b => b.provinceId === province.id && (currentTurn - b.turn <= 2)
  );

  let hostileNeighborAdjacent = false;
  if (country) {
    for (const nId of province.neighborIds) {
      const neighborProv = provinces[nId];
      if (neighborProv && neighborProv.countryId !== province.countryId) {
        const rel = country.relations[neighborProv.countryId];
        if (rel && rel.status === 'WAR' && neighborProv.units.length > 0) {
          hostileNeighborAdjacent = true;
          break;
        }
      }
    }
  }

  const underFire = hadRecentBattle || (hostileNeighborAdjacent && units.length > 0);

  // 2. Low Fuel check:
  // Active if the owner country has depleted crude oil reserves (oil <= 0 or < 150),
  // and has mechanized, armor, air or naval units stationed here.
  const hasFuelConsumingUnits = units.some(u => {
    return [
      'mechanized_infantry', 'armored_units', 'artillery', 'rocket_artillery',
      'fighters', 'bombers', 'transport_aircraft', 'recon_aircraft', 'drones',
      'patrol_ships', 'frigates', 'destroyers', 'submarines', 'aircraft_carriers'
    ].includes(u.type);
  });
  const lowFuel = Boolean(country && country.resources.oil <= 100 && hasFuelConsumingUnits);

  // 3. Low Supply check:
  // Units average supply < 60% or province stability < 40%
  const avgSupply = units.length > 0
    ? units.reduce((acc, u) => acc + u.supply, 0) / units.length
    : 100;
  const lowSupply = units.length > 0 && (avgSupply < 60 || province.stability < 40);

  // 4. Entrenched check:
  // Fortification tier >= 3 or Military base building present
  const hasMilBase = province.buildings.some(b => b.type === 'military_base');
  const entrenched = province.defenseLevel >= 3 || hasMilBase;

  // 5. Assigned General check:
  let hasGeneral = false;
  let generalName: string | undefined;
  if (country && country.generals) {
    const gen = country.generals.find(g => g.assignedProvinceId === province.id);
    if (gen) {
      hasGeneral = true;
      generalName = gen.name;
    }
  }

  // Determine primary display status label & color
  let statusLabel = 'READY';
  let statusColor = '#10b981'; // emerald

  if (underFire) {
    statusLabel = 'UNDER FIRE';
    statusColor = '#ef4444'; // red
  } else if (lowFuel) {
    statusLabel = 'LOW FUEL';
    statusColor = '#f59e0b'; // amber
  } else if (lowSupply) {
    statusLabel = 'LOW SUPPLY';
    statusColor = '#eab308'; // yellow
  } else if (hasGeneral) {
    statusLabel = 'COMMANDED';
    statusColor = '#facc15'; // gold
  } else if (entrenched) {
    statusLabel = 'FORTIFIED';
    statusColor = '#06b6d4'; // cyan
  }

  return {
    underFire,
    lowFuel,
    lowSupply,
    entrenched,
    hasGeneral,
    generalName,
    statusLabel,
    statusColor
  };
}
