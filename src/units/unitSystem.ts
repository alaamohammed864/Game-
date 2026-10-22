import { UnitBranch, UnitDefinition, UnitType, TerrainType } from '../types';
import { UNIT_DEFINITIONS } from '../game/config';

export class UnitSystem {
  public static getUnit(type: UnitType): UnitDefinition | undefined {
    return UNIT_DEFINITIONS[type];
  }

  public static getUnitsByBranch(branch: UnitBranch): UnitDefinition[] {
    return Object.values(UNIT_DEFINITIONS).filter(u => u.branch === branch);
  }

  public static calculateTerrainCombatPower(
    unitType: UnitType,
    count: number,
    terrain: TerrainType,
    isAttacking: boolean = true
  ): number {
    const def = UNIT_DEFINITIONS[unitType];
    if (!def) return 0;
    const base = isAttacking ? def.attack : def.defense;
    const terrainMod = def.terrainModifiers[terrain] ?? 1.0;
    return Math.round(base * count * terrainMod);
  }

  public static getAllUnits(): UnitDefinition[] {
    return Object.values(UNIT_DEFINITIONS);
  }
}
