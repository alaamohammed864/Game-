import { 
  Country, 
  DiplomaticRelation, 
  DiplomaticStatus 
} from '../types';

export interface ProposalEvaluationResult {
  accepted: boolean;
  message: string;
  counterOffer?: {
    goldDemanded?: number;
    resourceDemanded?: { key: string; amount: number };
  };
}

export function evaluateDiplomaticProposal(
  proposingCountry: Country,
  targetCountry: Country,
  proposalType: DiplomaticStatus | 'PEACE_TREATY' | 'TRADE_DEAL' | 'MILITARY_ACCESS'
): ProposalEvaluationResult {
  const relation = targetCountry.relations[proposingCountry.id];
  const trust = relation ? relation.trustScore : 0;
  const personality = targetCountry.aiProfile.personality;
  const targetAggression = targetCountry.aiProfile.aggressionRate;

  // If in active war and requesting peace
  if (proposalType === 'PEACE_TREATY' || (relation && relation.status === 'WAR' && proposalType === 'PEACE')) {
    if (relation.memory.warsFought > 2 && personality === 'Aggressive') {
      return {
        accepted: false,
        message: `${targetCountry.name} military high command rejects your ceasefire: "We will only accept unconditional submission."`
      };
    }
    // If target has suffered heavy losses or proposing country is stronger
    if (targetCountry.totalLosses > proposingCountry.totalLosses || trust > -20 || personality === 'Diplomatic') {
      return {
        accepted: true,
        message: `${targetCountry.name} has accepted the armistice and signed a mutual ceasefire.`
      };
    } else {
      return {
        accepted: false,
        message: `${targetCountry.name} refuses the peace overture: "Your terms offer no strategic reparations."`,
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
