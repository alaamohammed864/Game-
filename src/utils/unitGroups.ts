import { UnitGroup } from '../types';

/**
 * Merges groups of the same unit type into one (weighted average of experience / morale / supply).
 * Prevents unit-group fragmentation after repeated splits and retreats.
 */
export function mergeUnitGroups(groups: UnitGroup[]): UnitGroup[] {
  const byType = new Map<string, UnitGroup>();
  for (const g of groups) {
    if (g.count <= 0) continue;
    const existing = byType.get(g.type);
    if (!existing) {
      byType.set(g.type, { ...g });
      continue;
    }
    const total = existing.count + g.count;
    existing.experience = Math.round((existing.experience * existing.count + g.experience * g.count) / total);
    existing.morale = Math.round((existing.morale * existing.count + g.morale * g.count) / total);
    existing.supply = Math.round((existing.supply * existing.count + g.supply * g.count) / total);
    existing.count = total;
  }
  return Array.from(byType.values());
}
