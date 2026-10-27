import { 
  Country, 
  DiplomaticRelation, 
  DiplomaticStatus 
} from '../types';
import { ensureBilateralRelation } from './diplomacyUtils';

export interface ProposalEvaluationResult {
  accepted: boolean;
  message: string;
  reason?: string;
  counterOffer?: {
    goldDemanded?: number;
    resourceDemanded?: { key: string; amount: number };
  };
}

export function evaluateDiplomaticProposal(
  proposingCountry: Country | undefined | null,
  targetCountry: Country | undefined | null,
  proposalType: DiplomaticStatus | 'PEACE_TREATY' | 'TRADE_DEAL' | 'MILITARY_ACCESS'
): ProposalEvaluationResult {
  if (!proposingCountry || !targetCountry) {
    const msg = 'Invalid nation specified for diplomatic negotiations.';
    return {
      accepted: false,
      message: msg,
      reason: msg
    };
  }
  if (proposingCountry.id === targetCountry.id) {
    const msg = 'Cannot send diplomatic overtures to yourself.';
    return {
      accepted: false,
      message: msg,
      reason: msg
    };
  }

  const rels = ensureBilateralRelation(targetCountry, proposingCountry);
  const relation = rels?.relAtoB;
  const trust = relation ? relation.trustScore : 0;
  const personality = targetCountry.aiProfile?.personality || 'Balanced';
  const targetAggression = targetCountry.aiProfile?.aggressionRate ?? 0.5;

  const atWar = Boolean(relation && relation.status === 'WAR');
  const isPeaceRequest = proposalType === 'PEACE_TREATY' || proposalType === 'PEACE';

  // Peace can only be requested during a war; every other treaty requires peace first.
  if (isPeaceRequest && !atWar) {
    const msg = `No state of war exists with ${targetCountry.name}; there is nothing to negotiate.`;
    return { accepted: false, message: msg, reason: msg };
  }
  if (atWar && !isPeaceRequest) {
    const msg = `${targetCountry.name} will not discuss treaties while at war. Request a ceasefire first.`;
    return { accepted: false, message: msg, reason: msg };
  }

  // If in active war and requesting peace
  if (isPeaceRequest) {
    if (relation && relation.memory.warsFought > 2 && personality === 'Aggressive') {
      const msg = `${targetCountry.name} military high command rejects your ceasefire: "We will only accept unconditional submission."`;
      return {
        accepted: false,
        message: msg,
        reason: msg
      };
    }
    const targetLosses = targetCountry.totalLosses ?? 0;
    const proposingLosses = proposingCountry.totalLosses ?? 0;
    const isOutmatched = (proposingCountry.score ?? 0) >= (targetCountry.score ?? 0) * 1.5;

    // If target has suffered heavy losses, proposing country is far stronger, trust is acceptable, or personality is Diplomatic/Defensive when outmatched
    if (targetLosses > proposingLosses || trust >= -20 || personality === 'Diplomatic' || (personality === 'Defensive' && isOutmatched)) {
      const msg = `${targetCountry.name} has accepted the armistice and signed a mutual ceasefire.`;
      return {
        accepted: true,
        message: msg,
        reason: msg
      };
    } else {
      const msg = `${targetCountry.name} refuses the peace overture: "Your terms offer no strategic reparations."`;
      return {
        accepted: false,
        message: msg,
        reason: msg,
        counterOffer: { goldDemanded: 50 }
      };
    }
  }

  // ALLIANCE
  if (proposalType === 'ALLIANCE') {
    if (trust < 40) {
      return {
        accepted: false,
        message: `${targetCountry.name} rejects formal alliance: "Our diplomatic trust index (${trust}/100) is insufficient for joint sovereign military entanglement."`
      };
    }
    if (personality === 'Expansionist' && targetAggression > 0.6) {
      return {
        accepted: false,
        message: `${targetCountry.name} values total unilateral autonomy over foreign alliances.`
      };
    }
    return {
      accepted: true,
      message: `${targetCountry.name} has ratified the Comprehensive Strategic Alliance treaty!`
    };
  }

  // DEFENSIVE PACT
  if (proposalType === 'DEFENSIVE_PACT') {
    if (trust < 20) {
      return {
        accepted: false,
        message: `${targetCountry.name} rejects defensive pact: "Mutual security guarantees require deeper trust."`
      };
    }
    return {
      accepted: true,
      message: `${targetCountry.name} has signed the Mutual Defense Covenant.`
    };
  }

  // NON-AGGRESSION PACT
  if (proposalType === 'NON_AGGRESSION') {
    if (trust < -15 && personality === 'Aggressive') {
      return {
        accepted: false,
        message: `${targetCountry.name} dismisses your treaty: "A sovereign power does not bind its arms with ink."`
      };
    }
    return {
      accepted: true,
      message: `${targetCountry.name} has signed the Bilateral Non-Aggression Accord.`
    };
  }

  // TRADE DEAL
  if (proposalType === 'TRADE_DEAL' || proposalType === 'TRADE_AGREEMENT') {
    if (relation && relation.status === 'WAR') {
      return {
        accepted: false,
        message: `Cannot establish trade agreements during an active state of war.`
      };
    }
    return {
      accepted: true,
      message: `${targetCountry.name} welcomes the bilateral commerce agreement, opening mutual tariff-free shipping.`
    };
  }

  // MILITARY TRANSIT ACCESS
  if (proposalType === 'MILITARY_ACCESS') {
    if (trust < 30) {
      return {
        accepted: false,
        message: `${targetCountry.name} refuses military transit corridors through its territory.`
      };
    }
    return {
      accepted: true,
      message: `${targetCountry.name} has granted sovereign military access and border transit rights.`
    };
  }

  return {
    accepted: false,
    message: 'Proposal could not be negotiated at this time.'
  };
}
