// Översätter playbook-frågor till HubSpots Properties API (crm/v3/properties).
// Ren logik utan nätverk, så att den kan testas.

/** Gör ett stabilt internt värde av en svarsetikett: "Ja, inom 3 mån" -> "ja_inom_3_man". */
export function optionValue(label) {
  return label
    .toLowerCase()
    .replace(/[åä]/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/é/g, 'e')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

function enumOptions(labels) {
  return labels.map((label, displayOrder) => ({
    label,
    value: optionValue(label),
    displayOrder,
    hidden: false,
  }));
}

/** Frågetyp -> HubSpot type/fieldType. */
const TYPE_MAP = {
  text: { type: 'string', fieldType: 'text' },
  textarea: { type: 'string', fieldType: 'textarea' },
  number: { type: 'number', fieldType: 'number' },
  date: { type: 'date', fieldType: 'date' },
  select: { type: 'enumeration', fieldType: 'select' },
  multiselect: { type: 'enumeration', fieldType: 'checkbox' },
  yesno: { type: 'bool', fieldType: 'booleancheckbox' },
};

/** Bygger request-bodyn för att skapa en property. */
export function toHubSpotProperty(question, groupName) {
  const mapped = TYPE_MAP[question.type];
  if (!mapped) {
    throw new Error(`Okänd frågetyp "${question.type}" för ${question.property}`);
  }
  const body = {
    name: question.property,
    label: question.label,
    description: question.description ?? '',
    groupName,
    type: mapped.type,
    fieldType: mapped.fieldType,
    formField: false,
  };
  if (question.type === 'select' || question.type === 'multiselect') {
    body.options = enumOptions(question.options ?? []);
  }
  if (question.type === 'yesno') {
    body.options = [
      { label: 'Ja', value: 'true', displayOrder: 0, hidden: false },
      { label: 'Nej', value: 'false', displayOrder: 1, hidden: false },
    ];
  }
  return body;
}

/** Alla properties som ska finnas, grupperade per objekttyp. */
export function plannedProperties(playbooks, propertyGroups) {
  const plan = new Map();
  for (const playbook of playbooks) {
    const group = propertyGroups.find((g) => g.objectType === playbook.objectType);
    if (!group) {
      throw new Error(`Ingen property-grupp för objekttypen ${playbook.objectType}`);
    }
    const list = plan.get(playbook.objectType) ?? [];
    for (const step of playbook.steps) {
      for (const question of step.questions) {
        list.push(toHubSpotProperty(question, group.name));
      }
    }
    plan.set(playbook.objectType, list);
  }
  return plan;
}

const NAME_PATTERN = /^[a-z][a-z0-9_]{0,49}$/;
const MAX_QUESTIONS_PER_STEP = 24;

/** Hittar fel i konfigurationen innan något skickas till HubSpot. Returnerar en lista med fel. */
export function validateConfig(playbooks, propertyGroups) {
  const errors = [];
  const seenPlaybooks = new Set();
  const seenProperties = new Map(); // objectType -> Map(name -> fingerprint)

  for (const playbook of playbooks) {
    const where = `Playbook "${playbook.id}"`;
    if (seenPlaybooks.has(playbook.id)) errors.push(`${where}: id används redan`);
    seenPlaybooks.add(playbook.id);
    if (!['contacts', 'deals'].includes(playbook.objectType)) {
      errors.push(`${where}: objectType måste vara contacts eller deals`);
    }
    if (!propertyGroups.some((g) => g.objectType === playbook.objectType)) {
      errors.push(`${where}: property-grupp saknas för ${playbook.objectType}`);
    }
    if (playbook.dealStages?.length && playbook.objectType !== 'deals') {
      errors.push(`${where}: dealStages fungerar bara för deals`);
    }
    if (!playbook.steps?.length) errors.push(`${where}: har inga steg`);

    const seenSteps = new Set();
    for (const step of playbook.steps ?? []) {
      const stepWhere = `${where}, steg "${step.id}"`;
      if (seenSteps.has(step.id)) errors.push(`${stepWhere}: id används redan`);
      seenSteps.add(step.id);
      if (!step.questions?.length) errors.push(`${stepWhere}: har inga frågor`);
      if ((step.questions?.length ?? 0) > MAX_QUESTIONS_PER_STEP) {
        errors.push(`${stepWhere}: max ${MAX_QUESTIONS_PER_STEP} frågor per steg`);
      }
      const seenInStep = new Set();
      for (const q of step.questions ?? []) {
        const qWhere = `${stepWhere}, fråga "${q.property}"`;
        if (!NAME_PATTERN.test(q.property ?? '')) {
          errors.push(`${qWhere}: internt namn måste vara a-z, 0-9 och _ (max 50 tecken)`);
        }
        if (!TYPE_MAP[q.type]) errors.push(`${qWhere}: okänd typ "${q.type}"`);
        if (!q.label?.trim()) errors.push(`${qWhere}: label saknas`);
        if (seenInStep.has(q.property)) errors.push(`${qWhere}: dubblett i samma steg`);
        seenInStep.add(q.property);
        const needsOptions = q.type === 'select' || q.type === 'multiselect';
        if (needsOptions && !(q.options?.length >= 2)) {
          errors.push(`${qWhere}: behöver minst två svarsalternativ`);
        }
        if (needsOptions) {
          const values = (q.options ?? []).map(optionValue);
          if (new Set(values).size !== values.length) {
            errors.push(`${qWhere}: två svarsalternativ blir samma interna värde`);
          }
          if (values.some((v) => v === '')) {
            errors.push(`${qWhere}: ett svarsalternativ saknar bokstäver eller siffror`);
          }
        }
        if (!needsOptions && q.options?.length) {
          errors.push(`${qWhere}: options används bara för select och multiselect`);
        }
        // Samma property får återanvändas i flera playbooks, men då med identisk definition.
        const byObject = seenProperties.get(playbook.objectType) ?? new Map();
        const fingerprint = JSON.stringify([q.label, q.type, q.options ?? []]);
        if (byObject.has(q.property) && byObject.get(q.property) !== fingerprint) {
          errors.push(`${qWhere}: samma property definieras olika på två ställen`);
        }
        byObject.set(q.property, fingerprint);
        seenProperties.set(playbook.objectType, byObject);
      }
    }
  }
  return errors;
}
