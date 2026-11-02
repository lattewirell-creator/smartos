import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completionProperty, optionValue, plannedProperties, toHubSpotProperty, validateConfig } from './mapping.mjs';
import { playbooks, propertyGroups } from '../src/app/cards/playbooks.js';

test('levererade playbooks är giltiga', () => {
  assert.deepEqual(validateConfig(playbooks, propertyGroups), []);
});

test('optionValue ger stabila ASCII-värden', () => {
  assert.equal(optionValue('Ja, budget finns'), 'ja_budget_finns');
  assert.equal(optionValue('Säkerhet och GDPR'), 'sakerhet_och_gdpr');
  assert.equal(optionValue('Över 12 månader'), 'over_12_manader');
  assert.equal(optionValue('Café'), 'cafe');
});

test('frågetyper mappas till rätt HubSpot-typer', () => {
  const cases = {
    text: ['string', 'text'],
    textarea: ['string', 'textarea'],
    number: ['number', 'number'],
    date: ['date', 'date'],
    select: ['enumeration', 'select'],
    multiselect: ['enumeration', 'checkbox'],
    yesno: ['bool', 'booleancheckbox'],
  };
  for (const [type, [hsType, fieldType]] of Object.entries(cases)) {
    const options = type.includes('select') ? ['A', 'B'] : undefined;
    const p = toHubSpotProperty({ property: 'pb_x', label: 'X?', type, options }, 'pb_playbook');
    assert.equal(p.type, hsType, type);
    assert.equal(p.fieldType, fieldType, type);
    assert.equal(p.groupName, 'pb_playbook');
  }
});

test('ja/nej får alternativen true och false', () => {
  const p = toHubSpotProperty({ property: 'pb_x', label: 'X?', type: 'yesno' }, 'g');
  assert.deepEqual(p.options.map((o) => o.value), ['true', 'false']);
});

test('select får alternativ i rätt ordning', () => {
  const p = toHubSpotProperty({ property: 'pb_x', label: 'X?', type: 'select', options: ['Nej', 'Ja'] }, 'g');
  assert.deepEqual(p.options.map((o) => [o.label, o.value, o.displayOrder]), [['Nej', 'nej', 0], ['Ja', 'ja', 1]]);
});

test('plannedProperties grupperar per objekttyp', () => {
  const plan = plannedProperties(playbooks, propertyGroups);
  assert.deepEqual([...plan.keys()].sort(), ['contacts', 'deals']);
  assert.ok(plan.get('deals').every((p) => p.groupName === 'pb_playbook'));
});

test('validateConfig hittar vanliga misstag', () => {
  const bad = [{
    id: 'x', name: 'X', objectType: 'contacts', description: '', dealStages: ['contractsent'],
    steps: [{ id: 's', name: 'S', goal: '', tip: '', questions: [
      { property: 'Fel-Namn', label: 'A?', type: 'text' },
      { property: 'pb_a', label: 'B?', type: 'select', options: ['Bara en'] },
      { property: 'pb_b', label: 'C?', type: 'select', options: ['Ja!', 'ja'] },
      { property: 'pb_c', label: '', type: 'okand' },
    ] }],
  }];
  const errors = validateConfig(bad, propertyGroups).join('\n');
  assert.match(errors, /dealStages fungerar bara för deals/);
  assert.match(errors, /internt namn/);
  assert.match(errors, /minst två svarsalternativ/);
  assert.match(errors, /samma interna värde/);
  assert.match(errors, /okänd typ/);
  assert.match(errors, /label saknas/);
});

test('validateConfig stoppar fler än 24 frågor i ett steg', () => {
  const questions = Array.from({ length: 25 }, (_, i) => ({ property: `pb_q${i}`, label: `Q${i}?`, type: 'text' }));
  const errors = validateConfig([{ id: 'x', name: 'X', objectType: 'deals', description: '', steps: [{ id: 's', name: 'S', goal: '', tip: '', questions }] }], propertyGroups);
  assert.ok(errors.some((e) => e.includes('max 24')));
});

test('varje playbook får en klar-datum-property', () => {
  const plan = plannedProperties(playbooks, propertyGroups);
  const names = [...plan.values()].flat().map((p) => p.name);
  for (const playbook of playbooks) {
    const done = completionProperty(playbook, 'pb_playbook');
    assert.ok(names.includes(done.name), done.name);
    assert.equal(done.type, 'date');
  }
  assert.equal(completionProperty({ id: 'demo-forslag', name: 'Demo' }, 'g').name, 'pb_done_demo_forslag');
  assert.equal(new Set(names).size, names.length, 'inga dubbletter');
});

test('validateConfig stoppar frågor som krockar med klar-datum', () => {
  const pb = { id: 'x', name: 'X', objectType: 'deals', description: '', steps: [{ id: 's', name: 'S', goal: '', tip: '', questions: [{ property: 'pb_done_x', label: 'X?', type: 'date' }] }] };
  assert.ok(validateConfig([pb], propertyGroups).some((e) => e.includes('reserverade')));
});
