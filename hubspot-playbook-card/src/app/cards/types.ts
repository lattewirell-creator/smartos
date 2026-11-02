/** Objekttyper som kortet stöder. */
export type ObjectType = 'contacts' | 'deals';

/** Frågetyper. Varje typ motsvarar en HubSpot-propertytyp (se setup/mapping.mjs). */
export type QuestionType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'yesno';

export interface Question {
  /** Internt namn på HubSpot-propertyn. Svaret sparas här. */
  property: string;
  /** Frågan, blir propertyns label i HubSpot. */
  label: string;
  /** Hjälptext, blir propertyns description i HubSpot. */
  description?: string;
  type: QuestionType;
  /** Svarsalternativ för select och multiselect. */
  options?: string[];
  /** Måste vara besvarad för att steget ska räknas som klart. */
  required?: boolean;
}

export interface Step {
  id: string;
  /** Kort namn som visas i stegindikatorn. */
  name: string;
  /** Vad säljaren ska ha med sig efter steget. */
  goal: string;
  /** Konkret säljtips för steget. */
  tip: string;
  questions: Question[];
}

export interface Playbook {
  id: string;
  name: string;
  objectType: ObjectType;
  description: string;
  /** Affärsfaser (dealstage-ID) där playbooken förväljs. Bara för deals. */
  dealStages?: string[];
  steps: Step[];
}

export interface PropertyGroup {
  objectType: ObjectType;
  name: string;
  label: string;
}

export type PropertyValues = Record<string, string | null | undefined>;
