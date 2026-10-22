import { TechNode } from '../types';
import { TECH_TREE } from '../game/config';

export class ResearchTreeSystem {
  public static getAllTechs(): TechNode[] {
    return TECH_TREE;
  }

  public static getTechById(id: string): TechNode | undefined {
    return TECH_TREE.find(t => t.id === id);
  }

  public static getTechsByCategory(category: TechNode['category']): TechNode[] {
    return TECH_TREE.filter(t => t.category === category);
  }

  public static canResearchTech(techId: string, completedTechs: string[]): boolean {
    const tech = this.getTechById(techId);
    if (!tech) return false;
    if (completedTechs.includes(techId)) return false;
    return tech.prerequisites.every(p => completedTechs.includes(p));
  }
}
