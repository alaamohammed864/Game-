import { GameEvent, GameState } from '../types';

export const EVENT_TEMPLATES: Array<Omit<GameEvent, 'id'>> = [
  {
    titleKey: 'event_crude_title',
    descKey: 'event_crude_desc',
    severity: 'BOOM',
    options: [
      {
        label: 'event_crude_drill_label',
        description: 'event_crude_drill_desc',
        cost: { money: 1500 },
        reward: { oil: 2500 },
        stabilityDelta: 5
      },
      {
        label: 'event_crude_sell_label',
        description: 'event_crude_sell_desc',
        reward: { money: 3000, oil: 500 },
        stabilityDelta: -2
      }
    ]
  },
  {
    titleKey: 'event_border_title',
    descKey: 'event_border_desc',
    severity: 'WARNING',
    options: [
      {
        label: 'event_border_deploy_label',
        description: 'event_border_deploy_desc',
        cost: { steel: 500, oil: 300 },
        stabilityDelta: 8
      },
      {
        label: 'event_border_talk_label',
        description: 'event_border_talk_desc',
        stabilityDelta: -5
      }
    ]
  },
  {
    titleKey: 'event_supply_title',
    descKey: 'event_supply_desc',
    severity: 'CRISIS',
    options: [
      {
        label: 'event_supply_subsidize_label',
        description: 'event_supply_subsidize_desc',
        cost: { money: 2000 },
        reward: { rareMaterials: 500 },
        stabilityDelta: 3
      },
      {
        label: 'event_supply_ration_label',
        description: 'event_supply_ration_desc',
        stabilityDelta: -10
      }
    ]
  },
  {
    titleKey: 'event_ai_title',
    descKey: 'event_ai_desc',
    severity: 'BOOM',
    options: [
      {
        label: 'event_ai_deploy_label',
        description: 'event_ai_deploy_desc',
        reward: { techPoints: 250 },
        stabilityDelta: 4
      },
      {
        label: 'event_ai_license_label',
        description: 'event_ai_license_desc',
        reward: { money: 2500 },
        stabilityDelta: 2
      }
    ]
  },
  {
    titleKey: 'event_drought_title',
    descKey: 'event_drought_desc',
    severity: 'CRISIS',
    options: [
      {
        label: 'event_drought_import_label',
        description: 'event_drought_import_desc',
        cost: { money: 1200 },
        reward: { food: 2000 },
        stabilityDelta: 2
      },
      {
        label: 'event_drought_ration_label',
        description: 'event_drought_ration_desc',
        stabilityDelta: -15
      }
    ]
  }
];

const LEGACY_EVENT_TITLES = [
  'Strategic Crude Discovery in Deep Shale',
  'Volatile Border Escalation Incident',
  'Global Supply Chain Shock & Sanctions',
  'Breakthrough in AI Autonomous Guidance',
  'Severe Continental Drought & Crop Failure',
];

/** Upgrade older saves that stored event copy as English text instead of translation keys. */
export function migrateEventTranslationKeys(event: GameEvent): GameEvent {
  const templateIndex = LEGACY_EVENT_TITLES.indexOf(event.titleKey);
  if (templateIndex < 0) return event;
  const template = EVENT_TEMPLATES[templateIndex];
  return {
    ...event,
    titleKey: template.titleKey,
    descKey: template.descKey,
    options: event.options.map((option, index) => ({
      ...option,
      label: template.options[index]?.label ?? option.label,
      description: template.options[index]?.description ?? option.description,
    })),
  };
}

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
