import { describe, expect, it } from 'vitest';
import {
  firstOpenStepIndex,
  isAnswered,
  objectTypeFromId,
  pickPlaybook,
  playbookProgress,
  playbooksFor,
  stepStatus,
  watchedProperties,
} from '../logic.ts';
import { allPlaybooks, contactPlaybook, discoveryPlaybook, negotiationPlaybook } from './fixtures.ts';

describe('objectTypeFromId', () => {
  it('känner igen kontakter och affärer', () => {
    expect(objectTypeFromId('0-1')).toBe('contacts');
    expect(objectTypeFromId('0-3')).toBe('deals');
  });
  it('returnerar null för andra objekt', () => {
    expect(objectTypeFromId('0-2')).toBeNull();
  });
});

describe('isAnswered', () => {
  it('räknar tomt som obesvarat', () => {
    expect(isAnswered(null)).toBe(false);
    expect(isAnswered(undefined)).toBe(false);
    expect(isAnswered('')).toBe(false);
    expect(isAnswered('   ')).toBe(false);
  });
  it('räknar Nej (false) och 0 som svar', () => {
    expect(isAnswered('false')).toBe(true);
    expect(isAnswered('0')).toBe(true);
  });
});

describe('stepStatus', () => {
  const step = contactPlaybook.steps[0];
  it('saknar obligatoriskt svar', () => {
    const status = stepStatus(step, { pb_urgency: 'nu' });
    expect(status).toEqual({
      answered: 1,
      total: 2,
      missingRequired: ['Vilket behov?'],
      complete: false,
    });
  });
  it('är klart när obligatoriska frågor är besvarade', () => {
    expect(stepStatus(step, { pb_need: 'Mindre manuellt arbete' }).complete).toBe(true);
  });
  it('steg utan obligatoriska frågor kräver minst ett svar', () => {
    const optional = { ...step, questions: [{ property: 'x', label: 'X', type: 'text' as const }] };
    expect(stepStatus(optional, {}).complete).toBe(false);
    expect(stepStatus(optional, { x: 'ja' }).complete).toBe(true);
  });
});

describe('playbookProgress', () => {
  it('summerar över alla steg', () => {
    expect(playbookProgress(contactPlaybook, { pb_need: 'a', pb_decider: 'VD' })).toEqual({
      answered: 2,
      total: 3,
      completedSteps: 2,
      complete: true,
    });
  });
  it('tom post har inget klart', () => {
    expect(playbookProgress(contactPlaybook, {}).complete).toBe(false);
  });
});

describe('pickPlaybook', () => {
  const deals = playbooksFor(allPlaybooks, 'deals');
  it('väljer efter affärsfas', () => {
    expect(pickPlaybook(deals, 'contractsent')).toBe(negotiationPlaybook);
  });
  it('faller tillbaka på första playbooken', () => {
    expect(pickPlaybook(deals, 'okand_fas')).toBe(discoveryPlaybook);
    expect(pickPlaybook(deals, null)).toBe(discoveryPlaybook);
  });
  it('returnerar null utan playbooks', () => {
    expect(pickPlaybook([], 'contractsent')).toBeNull();
  });
});

describe('firstOpenStepIndex', () => {
  it('börjar på första ofärdiga steget', () => {
    expect(firstOpenStepIndex(contactPlaybook, {})).toBe(0);
    expect(firstOpenStepIndex(contactPlaybook, { pb_need: 'a' })).toBe(1);
  });
  it('stannar på sista steget när allt är klart', () => {
    expect(firstOpenStepIndex(contactPlaybook, { pb_need: 'a', pb_decider: 'b' })).toBe(1);
  });
});

describe('watchedProperties', () => {
  it('tar med dealstage för affärer och tar bort dubbletter', () => {
    const deals = playbooksFor(allPlaybooks, 'deals');
    const props = watchedProperties([...deals, discoveryPlaybook], 'deals');
    expect(props).toEqual(['pb_pain', 'pb_budget', 'pb_terms', 'pb_signed', 'dealstage']);
  });
  it('tar inte med dealstage för kontakter', () => {
    expect(watchedProperties([contactPlaybook], 'contacts')).toEqual([
      'pb_need',
      'pb_urgency',
      'pb_decider',
    ]);
  });
});
