import type { ObjectType, Playbook, PropertyValues, Step } from './types.ts';

/** HubSpots objekttyp-ID för standardobjekten som kortet stöder. */
const OBJECT_TYPE_IDS: Record<string, ObjectType> = {
  '0-1': 'contacts',
  '0-3': 'deals',
};

/** HubSpot tillåter max 24 properties i en CrmPropertyList. */
export const MAX_QUESTIONS_PER_STEP = 24;

export function objectTypeFromId(objectTypeId: string): ObjectType | null {
  return OBJECT_TYPE_IDS[objectTypeId] ?? null;
}

export function playbooksFor(
  playbooks: Playbook[],
  objectType: ObjectType | null,
): Playbook[] {
  if (!objectType) return [];
  return playbooks.filter((p) => p.objectType === objectType);
}

/** Ett svar räknas som givet när värdet inte är tomt. "false" (Nej) är ett svar. */
export function isAnswered(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

export function stepProperties(step: Step): string[] {
  return step.questions.map((q) => q.property);
}

export function playbookProperties(playbook: Playbook): string[] {
  return playbook.steps.flatMap(stepProperties);
}

export interface StepStatus {
  answered: number;
  total: number;
  /** Labels på obligatoriska frågor som saknar svar. */
  missingRequired: string[];
  /** Alla obligatoriska frågor besvarade och minst en fråga besvarad. */
  complete: boolean;
}

export function stepStatus(step: Step, values: PropertyValues): StepStatus {
  const answered = step.questions.filter((q) =>
    isAnswered(values[q.property]),
  ).length;
  const missingRequired = step.questions
    .filter((q) => q.required && !isAnswered(values[q.property]))
    .map((q) => q.label);
  return {
    answered,
    total: step.questions.length,
    missingRequired,
    complete: missingRequired.length === 0 && answered > 0,
  };
}

export interface PlaybookProgress {
  answered: number;
  total: number;
  completedSteps: number;
  /** Alla steg klara. */
  complete: boolean;
}

export function playbookProgress(
  playbook: Playbook,
  values: PropertyValues,
): PlaybookProgress {
  const statuses = playbook.steps.map((s) => stepStatus(s, values));
  const completedSteps = statuses.filter((s) => s.complete).length;
  return {
    answered: statuses.reduce((sum, s) => sum + s.answered, 0),
    total: statuses.reduce((sum, s) => sum + s.total, 0),
    completedSteps,
    complete: playbook.steps.length > 0 && completedSteps === playbook.steps.length,
  };
}

/**
 * Väljer playbook för posten: den vars dealStages matchar affärens fas,
 * annars den första i listan.
 */
export function pickPlaybook(
  playbooks: Playbook[],
  dealStage?: string | null,
): Playbook | null {
  if (playbooks.length === 0) return null;
  if (dealStage) {
    const match = playbooks.find((p) => p.dealStages?.includes(dealStage));
    if (match) return match;
  }
  return playbooks[0];
}

/** Första steget som inte är klart. Är alla klara landar vi på sista steget. */
export function firstOpenStepIndex(
  playbook: Playbook,
  values: PropertyValues,
): number {
  const index = playbook.steps.findIndex((s) => !stepStatus(s, values).complete);
  return index === -1 ? Math.max(playbook.steps.length - 1, 0) : index;
}

/** Alla properties kortet behöver läsa för posten, utan dubbletter. */
export function watchedProperties(
  playbooks: Playbook[],
  objectType: ObjectType | null,
): string[] {
  const names = playbooks.flatMap(playbookProperties);
  if (objectType === 'deals') names.push('dealstage');
  return [...new Set(names)];
}
