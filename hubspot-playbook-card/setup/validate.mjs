#!/usr/bin/env node
// Kontrollerar playbooks.js utan att prata med HubSpot. Körs före upload.
import { playbooks, propertyGroups } from '../src/app/cards/playbooks.js';
import { validateConfig } from './mapping.mjs';

const errors = validateConfig(playbooks, propertyGroups);
if (errors.length) {
  console.error('Konfigurationen har fel:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
const questions = playbooks.reduce(
  (sum, p) => sum + p.steps.reduce((s, step) => s + step.questions.length, 0),
  0,
);
console.log(`OK: ${playbooks.length} playbooks, ${questions} frågor.`);
