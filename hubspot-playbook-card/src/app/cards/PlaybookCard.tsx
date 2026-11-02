import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Divider,
  EmptyState,
  ErrorState,
  Flex,
  Heading,
  LoadingSpinner,
  ProgressBar,
  Select,
  StepIndicator,
  Tag,
  Text,
  Tile,
  hubspot,
  useExtensionActions,
  useExtensionContext,
} from '@hubspot/ui-extensions';
import { CrmPropertyList, useRecordPropertiesCurrent } from '@hubspot/ui-extensions/crm';
import { playbooks as configuredPlaybooks } from './playbooks.js';
import {
  firstOpenStepIndex,
  objectTypeFromId,
  pickPlaybook,
  playbookProgress,
  playbooksFor,
  stepProperties,
  stepStatus,
  watchedProperties,
} from './logic.ts';
import type { Playbook, PropertyValues } from './types.ts';

hubspot.extend<'crm.record.tab'>(() => <PlaybookCard />);

interface PlaybookCardProps {
  /** Möjlighet att skicka in egna playbooks, används i testerna. */
  playbooks?: Playbook[];
}

export const PlaybookCard = ({
  playbooks = configuredPlaybooks,
}: PlaybookCardProps) => {
  const context = useExtensionContext<'crm.record.tab'>();
  const actions = useExtensionActions<'crm.record.tab'>();

  const objectType = objectTypeFromId(context.crm.objectTypeId);
  const available = useMemo(
    () => playbooksFor(playbooks, objectType),
    [playbooks, objectType],
  );
  const watched = useMemo(
    () => watchedProperties(available, objectType),
    [available, objectType],
  );

  const { properties, isLoading, error, refetch } = useRecordPropertiesCurrent({
    properties: watched,
  });

  // Svar som sparas i kortet (eller någon annanstans på posten) kommer in här
  // direkt, så att framstegen uppdateras utan omladdning.
  const [liveValues, setLiveValues] = useState<PropertyValues>({});
  useEffect(() => {
    if (watched.length === 0) return;
    actions.onCrmPropertiesUpdate(watched, (updated, updateError) => {
      if (!updateError) setLiveValues((prev) => ({ ...prev, ...updated }));
    });
    // Registreras en gång per uppsättning properties.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watched.join(',')]);

  const values: PropertyValues = useMemo(
    () => ({ ...properties, ...liveValues }),
    [properties, liveValues],
  );

  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);

  // Hämtar om värdena när säljaren byter steg, som extra säkerhet om en
  // uppdatering inte nått kortet.
  const sync = useCallback(() => {
    refetch()
      .then(() => setLiveValues({}))
      .catch(() => undefined);
  }, [refetch]);

  if (!objectType || available.length === 0) {
    return (
      <EmptyState title="Ingen playbook här" layout="vertical" imageName="building">
        <Text>
          Det finns ingen playbook för den här typen av post. Lägg till en i
          playbooks.js och ladda upp projektet igen.
        </Text>
      </EmptyState>
    );
  }

  if (isLoading) {
    return <LoadingSpinner label="Hämtar playbook" layout="centered" />;
  }

  if (error) {
    return (
      <ErrorState title="Playbooken kunde inte laddas">
        <Text>
          Kontrollera att playbookens properties finns i HubSpot. Kör
          setup-skriptet om de saknas, eller ladda om sidan.
        </Text>
      </ErrorState>
    );
  }

  const autoPlaybook = pickPlaybook(available, values.dealstage);
  const playbook =
    available.find((p) => p.id === selectedPlaybookId) ?? autoPlaybook ?? available[0];
  const isAutoPicked = !selectedPlaybookId && objectType === 'deals' &&
    Boolean(values.dealstage && playbook.dealStages?.includes(values.dealstage));

  const lastStep = playbook.steps.length - 1;
  const stepIndex = Math.min(
    selectedStep ?? firstOpenStepIndex(playbook, values),
    lastStep,
  );
  const step = playbook.steps[stepIndex];
  const status = stepStatus(step, values);
  const progress = playbookProgress(playbook, values);

  const goToStep = (index: number) => {
    setSelectedStep(Math.max(0, Math.min(index, lastStep)));
    sync();
  };

  const choosePlaybook = (id: string) => {
    setSelectedPlaybookId(id);
    setSelectedStep(null);
  };

  const stepNames = playbook.steps.map((s) =>
    stepStatus(s, values).complete ? `${s.name} ✓` : s.name,
  );

  return (
    <Flex direction="column" gap="md">
      <Flex direction="row" justify="between" align="center" wrap="wrap" gap="sm">
        <Flex direction="column" gap="xs">
          <Heading>{playbook.name}</Heading>
          <Text variant="microcopy">
            {playbook.description}
            {isAutoPicked ? ' Vald utifrån affärens fas.' : ''}
          </Text>
        </Flex>
        {available.length > 1 && (
          <Select
            name="playbook"
            label="Playbook"
            value={playbook.id}
            options={available.map((p) => ({ label: p.name, value: p.id }))}
            onChange={(value) => choosePlaybook(String(value))}
          />
        )}
      </Flex>

      <ProgressBar
        title="Besvarade frågor"
        value={progress.answered}
        maxValue={Math.max(progress.total, 1)}
        valueDescription={`${progress.answered} av ${progress.total} · ${progress.completedSteps} av ${playbook.steps.length} steg klara`}
        variant={progress.complete ? 'success' : undefined}
      />

      <StepIndicator
        stepNames={stepNames}
        currentStep={stepIndex}
        onClick={(index) => goToStep(index)}
      />

      <Tile>
        <Flex direction="column" gap="sm">
          <Flex direction="row" justify="between" align="center" wrap="wrap" gap="sm">
            <Heading>
              Steg {stepIndex + 1} av {playbook.steps.length}: {step.name}
            </Heading>
            {status.complete ? (
              <Tag variant="success">Klart</Tag>
            ) : (
              <Tag variant="default">
                {status.answered} av {status.total} besvarade
              </Tag>
            )}
          </Flex>
          <Text>
            <Text inline format={{ fontWeight: 'demibold' }}>
              Mål:
            </Text>{' '}
            {step.goal}
          </Text>
          <Alert title="Säljtips" variant="tip">
            {step.tip}
          </Alert>
          <Divider />
          <CrmPropertyList properties={stepProperties(step)} direction="column" />
          {status.missingRequired.length > 0 && (
            <Text variant="microcopy">
              Måste besvaras innan steget är klart: {status.missingRequired.join(', ')}.
            </Text>
          )}
        </Flex>
      </Tile>

      <Flex direction="row" justify="between" align="center">
        <Button
          variant="secondary"
          disabled={stepIndex === 0}
          onClick={() => goToStep(stepIndex - 1)}
        >
          Föregående
        </Button>
        {stepIndex < lastStep ? (
          <Button variant="primary" onClick={() => goToStep(stepIndex + 1)}>
            Nästa: {playbook.steps[stepIndex + 1].name}
          </Button>
        ) : progress.complete ? (
          <Tag variant="success">Playbooken är klar</Tag>
        ) : (
          <Text variant="microcopy">Sista steget. Allt sparas automatiskt.</Text>
        )}
      </Flex>
    </Flex>
  );
};
