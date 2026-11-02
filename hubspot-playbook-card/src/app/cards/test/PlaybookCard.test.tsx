import { describe, expect, it } from 'vitest';
import {
  Button,
  EmptyState,
  ErrorState,
  Heading,
  LoadingSpinner,
  ProgressBar,
  Select,
  StepIndicator,
  Tag,
  Text,
} from '@hubspot/ui-extensions';
import { CrmPropertyList } from '@hubspot/ui-extensions/crm';
import { createRenderer } from '@hubspot/ui-extensions/testing';
import { PlaybookCard } from '../PlaybookCard.tsx';
import { allPlaybooks } from './fixtures.ts';
import type { PropertyValues } from '../types.ts';

const CONTACT = '0-1';
const flush = () => new Promise((resolve) => setTimeout(resolve, 20));
const DEAL = '0-3';

function setup(
  objectTypeId: string,
  values: PropertyValues = {},
  refetch: () => Promise<void> = async () => {},
) {
  const renderer = createRenderer('crm.record.tab');
  renderer.mocks.context.crm.objectTypeId = objectTypeId;
  renderer.mocks.useRecordPropertiesCurrent.willCall((options) => ({
    properties: Object.fromEntries(
      options.properties.map((name) => [name, values[name] ?? null]),
    ),
    error: null,
    isLoading: false,
    isRefetching: false,
    refetch,
  }));
  renderer.render(<PlaybookCard playbooks={allPlaybooks} />);
  return renderer;
}

describe('PlaybookCard', () => {
  it('visar första steget med frågorna som riktiga properties', () => {
    const { find } = setup(CONTACT);
    expect(find(Heading).text).toBe('Kvalificering');
    expect(find(CrmPropertyList).props.properties).toEqual(['pb_need', 'pb_urgency']);
    expect(find(StepIndicator).props.currentStep).toBe(0);
  });

  it('läser bara playbookens properties, inget annat', () => {
    const renderer = setup(CONTACT);
    const call = renderer.mocks.useRecordPropertiesCurrent.calls[0][0];
    expect(call.properties).toEqual(['pb_need', 'pb_urgency', 'pb_decider']);
  });

  it('hoppar till första ofärdiga steget', () => {
    const { find } = setup(CONTACT, { pb_need: 'Snabbare onboarding' });
    expect(find(StepIndicator).props.currentStep).toBe(1);
    expect(find(CrmPropertyList).props.properties).toEqual(['pb_decider']);
  });

  it('visar framsteg över hela playbooken', () => {
    const { find } = setup(CONTACT, { pb_need: 'a' });
    const bar = find(ProgressBar);
    expect(bar.props.value).toBe(1);
    expect(bar.props.maxValue).toBe(3);
    expect(bar.props.valueDescription).toBe('1 av 3 · 1 av 2 steg klara');
  });

  it('går framåt och bakåt med knapparna', async () => {
    const renderer = setup(CONTACT);
    renderer.find(Button, { variant: 'primary' }).trigger('onClick');
    await renderer.waitFor(() =>
      expect(renderer.find(StepIndicator).props.currentStep).toBe(1),
    );
    renderer.find(Button, { variant: 'secondary' }).trigger('onClick');
    await renderer.waitFor(() =>
      expect(renderer.find(StepIndicator).props.currentStep).toBe(0),
    );
  });

  it('kan hoppa direkt till ett steg i stegindikatorn', async () => {
    const renderer = setup(CONTACT);
    renderer.find(StepIndicator).trigger('onClick', 1 as never);
    await renderer.waitFor(() =>
      expect(renderer.find(CrmPropertyList).props.properties).toEqual(['pb_decider']),
    );
  });

  it('förväljer playbook utifrån affärens fas', () => {
    const { find } = setup(DEAL, { dealstage: 'contractsent' });
    expect(find(Heading).text).toBe('Förhandling');
    expect(find(Select).props.value).toBe('forhandling');
  });

  it('låter säljaren byta playbook', async () => {
    const renderer = setup(DEAL, { dealstage: 'contractsent' });
    renderer.find(Select).trigger('onChange', 'discovery' as never);
    await renderer.waitFor(() => expect(renderer.find(Heading).text).toBe('Discovery'));
    expect(renderer.find(CrmPropertyList).props.properties).toEqual(['pb_pain']);
  });

  it('markerar playbooken som klar när allt obligatoriskt är besvarat', () => {
    const { findAll } = setup(CONTACT, { pb_need: 'a', pb_decider: 'VD' });
    const tags = findAll(Tag).map((t) => t.text);
    expect(tags).toContain('Playbooken är klar');
  });

  it('uppdaterar framstegen direkt när ett svar sparas', async () => {
    const renderer = setup(CONTACT);
    const spy = renderer.mocks.actions.onCrmPropertiesUpdate;
    // useEffect körs asynkront. I testverktyget (ui-extensions 1.0.0) körs
    // effekter inte medan waitFor pollar, så vi släpper event-loopen själva.
    await flush();
    expect(spy.callCount).toBe(1);
    const [watched, callback] = spy.calls[0];
    expect(watched).toEqual(['pb_need', 'pb_urgency', 'pb_decider']);
    expect(renderer.find(ProgressBar).props.value).toBe(0);
    callback({ pb_need: 'Nytt svar' });
    await flush();
    expect(renderer.find(ProgressBar).props.value).toBe(1);
  });

  it('visar tomt läge för objekt utan playbook', () => {
    const { find } = setup('0-2');
    expect(find(EmptyState).props.title).toBe('Ingen playbook här');
  });

  it('visar laddning och fel', () => {
    const loading = createRenderer('crm.record.tab');
    loading.mocks.useRecordPropertiesCurrent.nextResult({
      properties: {}, error: null, isLoading: true, isRefetching: false, refetch: async () => {},
    });
    loading.render(<PlaybookCard playbooks={allPlaybooks} />);
    expect(loading.maybeFind(LoadingSpinner)).not.toBeNull();

    const failing = createRenderer('crm.record.tab');
    failing.mocks.useRecordPropertiesCurrent.nextResult({
      properties: {}, error: new Error('x'), isLoading: false, isRefetching: false, refetch: async () => {},
    });
    failing.render(<PlaybookCard playbooks={allPlaybooks} />);
    expect(failing.find(ErrorState).props.title).toBe('Playbooken kunde inte laddas');
  });

  it('säger hur många obligatoriska frågor som återstår', () => {
    const { findAll } = setup(CONTACT, { pb_urgency: 'nu' });
    const texts = findAll(Text).map((t) => t.text);
    expect(texts).toContain('1 obligatorisk fråga kvar innan steget är klart.');
  });

  it('hämtar om värdena när säljaren byter steg', async () => {
    let refetches = 0;
    const renderer = setup(CONTACT, {}, async () => {
      refetches++;
    });
    renderer.find(Button, { variant: 'primary' }).trigger('onClick');
    await flush();
    expect(refetches).toBe(1);
  });

  it('byter playbook och börjar om på första öppna steget när affärens fas ändras', async () => {
    const renderer = setup(DEAL, { dealstage: 'appointmentscheduled' });
    expect(renderer.find(Heading).text).toBe('Discovery');
    renderer.find(Button, { variant: 'primary' }).trigger('onClick');
    await flush();
    expect(renderer.find(StepIndicator).props.currentStep).toBe(1);

    await flush();
    const [, callback] = renderer.mocks.actions.onCrmPropertiesUpdate.calls[0];
    callback({ dealstage: 'contractsent' });
    await flush();
    expect(renderer.find(Heading).text).toBe('Förhandling');
    expect(renderer.find(StepIndicator).props.currentStep).toBe(0);
  });

  it('kraschar inte på en playbook utan steg', () => {
    const renderer = createRenderer('crm.record.tab');
    renderer.render(
      <PlaybookCard playbooks={[{ ...allPlaybooks[0], steps: [] }]} />,
    );
    expect(renderer.find(EmptyState).props.title).toBe('Playbooken saknar steg');
  });

  it('registrerar bara en lyssnare även efter flera omritningar', async () => {
    const renderer = setup(CONTACT);
    renderer.find(Button, { variant: 'primary' }).trigger('onClick');
    await flush();
    renderer.find(Button, { variant: 'secondary' }).trigger('onClick');
    await flush();
    expect(renderer.mocks.actions.onCrmPropertiesUpdate.callCount).toBe(1);
  });
});
