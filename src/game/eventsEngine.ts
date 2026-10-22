import { GameEvent, GameState } from '../types';

export const EVENT_TEMPLATES: Array<Omit<GameEvent, 'id'>> = [
  {
    titleKey: 'Strategic Crude Discovery in Deep Shale',
    descKey: 'National geological survey teams have tapped an immense subterranean crude reservoir, promising energy autarky if extracted properly.',
    severity: 'BOOM',
    options: [
      {
        label: 'Rapidly Expand Drilling Rigs',
        description: 'Spend $1,500 to immediately secure +2,500 barrels of oil reserve.',
        cost: { money: 1500 },
        reward: { oil: 2500 },
        stabilityDelta: 5
      },
      {
        label: 'Sell Extraction Concessions Overseas',
        description: 'Sell drilling rights to international syndicates for +$3,000 cash and +500 oil.',
        reward: { money: 3000, oil: 500 },
        stabilityDelta: -2
      }
    ]
  },
  {
    titleKey: 'Volatile Border Escalation Incident',
    descKey: 'Rogue paramilitary skirmishes have broken out across the disputed territorial demarcation line. Casualties are mounting and regional media demands retaliation.',
    severity: 'WARNING',
    options: [
      {
        label: 'Deploy Armored Vanguard to Fortify Border',
        description: 'Mobilize heavy forces to deter invasion (+10 Province Stability, costs 500 Steel & 300 Oil).',
        cost: { steel: 500, oil: 300 },
        stabilityDelta: 8
      },
      {
        label: 'Pursue De-escalation via UN Mediation',
        description: 'Offer diplomatic compromise to avert war. Avoids resource expenditure (-5 Stability).',
        stabilityDelta: -5
      }
    ]
  },
  {
    titleKey: 'Global Supply Chain Shock & Sanctions',
    descKey: 'A maritime blockade in the outer straits has disrupted international container shipping, spiking the cost of industrial rare materials.',
    severity: 'CRISIS',
    options: [
      {
        label: 'Subsidize Domestic Strategic Stockpiles',
        description: 'Spend $2,000 Treasury to safeguard domestic industry and stave off shortages (+500 Rare Materials).',
        cost: { money: 2000 },
        reward: { rareMaterials: 500 },
        stabilityDelta: 3
      },
      {
        label: 'Ration National Factory Quotas',
        description: 'Conserve fiscal reserves while accepting civilian manufacturing disruption.',
        stabilityDelta: -10
      }
    ]
  },
  {
    titleKey: 'Breakthrough in AI Autonomous Guidance',
    descKey: 'Defence research laboratories have perfected neural flight control algorithms for precision loitering drone swarms.',
    severity: 'BOOM',
    options: [
      {
        label: 'Weaponize and Deploy Immediately',
        description: 'Gain +250 Tech Points and upgrade frontline strike coordination.',
        reward: { techPoints: 250 },
        stabilityDelta: 4
      },
      {
        label: 'Commercialize Dual-Use Avionics',
        description: 'License the patents to civilian aerospace firms for +$2,500 revenue.',
        reward: { money: 2500 },
        stabilityDelta: 2
      }
    ]
  },
  {
    titleKey: 'Severe Continental Drought & Crop Failure',
    descKey: 'Unprecedented arid weather has scorched prime agricultural plains, threatening regional grain stores and civil unrest.',
    severity: 'CRISIS',
    options: [
      {
        label: 'Emergency Grain Imports from Allied States',
        description: 'Spend $1,200 to purchase 2,000 tons of emergency rations and stabilize population.',
        cost: { money: 1200 },
        reward: { food: 2000 },
        stabilityDelta: 2
      },
      {
        label: 'Enforce Military Food Rationing',
        description: 'Mandate strict rationing (-15 Province Stability, 0 financial cost).',
        stabilityDelta: -15
      }
    ]
  }
];

export function maybeTriggerRandomEvent(state: GameState): GameEvent | null {
  // Trigger event roughly once every 6-10 turns if none active
  if (state.activeEvents.length > 0) return null;
  if (Math.random() > 0.22) return null; // 22% chance per turn

  const randomIndex = Math.floor(Math.random() * EVENT_TEMPLATES.length);
  const template = EVENT_TEMPLATES[randomIndex];

  const event: GameEvent = {
    ...template,
    id: `event_${state.currentTurn}_${Date.now()}`
  };

  return event;
}
