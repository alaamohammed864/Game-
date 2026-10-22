import { Mission, GameState } from '../types';
import { INITIAL_MISSIONS } from '../game/config';

export class MissionSystem {
  public static getInitialMissions(): Mission[] {
    return JSON.parse(JSON.stringify(INITIAL_MISSIONS));
  }

  public static evaluateMissions(state: GameState): void {
    const player = state.countries[state.playerCountryId];
    if (!player) return;
    const ownedProvinces = Object.values(state.provinces).filter(p => p.countryId === state.playerCountryId);

    state.missions.forEach(m => {
      if (m.isCompleted) return;
      if (m.id === 'mission_strategic_territory') {
        m.progress = ownedProvinces.length;
        if (m.progress >= m.goal) m.isCompleted = true;
      } else if (m.id === 'mission_tech_mastery') {
        m.progress = player.completedTechs.length;
        if (m.progress >= m.goal) m.isCompleted = true;
      }
    });
  }
}
