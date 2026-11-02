#!/usr/bin/env node
// Skapar property-grupp och properties i HubSpot utifrån playbooks.js.
//
//   npm run setup:dry     # visar vad som skulle hända
//   npm run setup:apply   # skapar det som saknas
//
// Token läses från HUBSPOT_TOKEN, eller från filen .env i projektroten
// (HUBSPOT_TOKEN=...), så att den inte hamnar i terminalens historik.
// Befintliga properties lämnas orörda, så skriptet går att köra flera gånger.
// Kräver Node 20.12 eller senare.

import { playbooks, propertyGroups } from '../src/app/cards/playbooks.js';
import { plannedProperties, validateConfig } from './mapping.mjs';

// HUBSPOT_API_BASE används bara för att testa skriptet mot en lokal server.
const API = process.env.HUBSPOT_API_BASE ?? 'https://api.hubapi.com';
const apply = process.argv.includes('--apply');

if (!process.env.HUBSPOT_TOKEN) {
  try {
    process.loadEnvFile(new URL('../.env', import.meta.url));
  } catch {
    // Ingen .env-fil, felet nedan förklarar vad som saknas.
  }
}
const token = process.env.HUBSPOT_TOKEN;

const errors = validateConfig(playbooks, propertyGroups);
if (errors.length) {
  console.error('Konfigurationen har fel:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}

if (!token) {
  console.error('Lägg appens access token i .env som HUBSPOT_TOKEN=... (se README, steg 4).');
  process.exit(1);
}

async function hubspot(method, path, body) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { message: text.slice(0, 200) };
  }
  return { status: response.status, body: parsed };
}

async function exists(path) {
  const { status, body } = await hubspot('GET', path);
  if (status === 200) return true;
  if (status === 404) return false;
  throw new Error(`GET ${path} gav ${status}: ${body?.message ?? 'okänt fel'}`);
}

async function create(path, payload, label) {
  if (!apply) {
    console.log(`  [skulle skapa] ${label}`);
    return;
  }
  const { status, body } = await hubspot('POST', path, payload);
  if (status === 201 || status === 200) {
    console.log(`  [skapad] ${label}`);
  } else if (status === 409) {
    console.log(`  [finns redan] ${label}`);
  } else {
    throw new Error(`Kunde inte skapa ${label} (${status}): ${body?.message ?? 'okänt fel'}`);
  }
}

async function main() {
  const plan = plannedProperties(playbooks, propertyGroups);
  let missing = 0;

  for (const [objectType, properties] of plan) {
    const group = propertyGroups.find((g) => g.objectType === objectType);
    console.log(`\n${objectType}`);

    if (await exists(`/crm/v3/properties/${objectType}/groups/${group.name}`)) {
      console.log(`  [finns] grupp ${group.name}`);
    } else {
      missing++;
      await create(
        `/crm/v3/properties/${objectType}/groups`,
        { name: group.name, label: group.label },
        `grupp ${group.name}`,
      );
    }

    const unique = [...new Map(properties.map((p) => [p.name, p])).values()];
    for (const property of unique) {
      if (await exists(`/crm/v3/properties/${objectType}/${property.name}`)) {
        console.log(`  [finns] ${property.name}`);
        continue;
      }
      missing++;
      await create(
        `/crm/v3/properties/${objectType}`,
        property,
        `${property.name} (${property.label})`,
      );
    }
  }

  if (!apply && missing > 0) {
    console.log(`\n${missing} saker saknas. Kör igen med --apply för att skapa dem.`);
  } else if (missing === 0) {
    console.log('\nAllt finns redan på plats.');
  } else {
    console.log('\nKlart.');
  }
}

main().catch((error) => {
  console.error(`\nAvbrutet: ${error.message}`);
  process.exit(1);
});
