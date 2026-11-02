import type { Playbook } from '../types.ts';

export const contactPlaybook: Playbook = {
  id: 'kval',
  name: 'Kvalificering',
  objectType: 'contacts',
  description: 'Första samtalet.',
  steps: [
    {
      id: 'behov',
      name: 'Behov',
      goal: 'Förstå behovet.',
      tip: 'Fråga vad som händer om inget görs.',
      questions: [
        { property: 'pb_need', label: 'Vilket behov?', type: 'textarea', required: true },
        { property: 'pb_urgency', label: 'Hur bråttom?', type: 'select', options: ['Nu', 'Senare'] },
      ],
    },
    {
      id: 'beslut',
      name: 'Beslut',
      goal: 'Förstå beslutet.',
      tip: 'Fråga vem mer som är med.',
      questions: [
        { property: 'pb_decider', label: 'Vem beslutar?', type: 'text', required: true },
      ],
    },
  ],
};

export const discoveryPlaybook: Playbook = {
  id: 'discovery',
  name: 'Discovery',
  objectType: 'deals',
  description: 'Tidig fas.',
  dealStages: ['appointmentscheduled'],
  steps: [
    {
      id: 'smarta',
      name: 'Smärta',
      goal: 'Hitta smärtan.',
      tip: 'Kvantifiera.',
      questions: [
        { property: 'pb_pain', label: 'Vad gör ont?', type: 'textarea', required: true },
      ],
    },
    {
      id: 'budget',
      name: 'Budget',
      goal: 'Hitta budget.',
      tip: 'Fråga om ramen.',
      questions: [
        { property: 'pb_budget', label: 'Budget i SEK?', type: 'number', required: true },
      ],
    },
  ],
};

export const negotiationPlaybook: Playbook = {
  id: 'forhandling',
  name: 'Förhandling',
  objectType: 'deals',
  description: 'Sen fas.',
  dealStages: ['contractsent'],
  steps: [
    {
      id: 'villkor',
      name: 'Villkor',
      goal: 'Landa villkoren.',
      tip: 'Byt, ge inte.',
      questions: [
        { property: 'pb_terms', label: 'Vilka villkor?', type: 'text', required: true },
        { property: 'pb_signed', label: 'Signerat?', type: 'yesno' },
      ],
    },
  ],
};

export const allPlaybooks = [contactPlaybook, discoveryPlaybook, negotiationPlaybook];
