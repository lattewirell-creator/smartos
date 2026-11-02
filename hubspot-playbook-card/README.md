# Playbook-kort för HubSpot

Guidade säljplaybooks direkt på kontakt- och affärsposten. Varje fråga är en riktig HubSpot-property, så svaret sparas i samma ögonblick som säljaren lämnar fältet och kan användas i rapporter, listor och workflows som vilken property som helst. Ingen Sales Hub Enterprise, ingen serverless-funktion, ingen egen server.

Bakgrund, avvägningar och plan finns i [FORSLAG.md](FORSLAG.md).

## Så fungerar det

```
playbooks.js ──► setup-skriptet ──► properties i HubSpot (en gång)
     │
     └────────► kortet på posten ──► CrmPropertyList ──► sparar direkt i propertyn
```

Kortet läser playbooks, steg och säljtips från `src/app/cards/playbooks.js`. Själva fälten ritas av HubSpots egen komponent `CrmPropertyList`, som redigerar och sparar propertyn på posten med HubSpots vanliga validering, fälttyper och behörigheter.

På affärer förväljs playbooken utifrån affärens fas. Säljaren kan alltid byta i listan uppe till höger.

## Installation, cirka 30 minuter

Du behöver Node 20 eller senare, HubSpot CLI och rättigheten att skapa appar och properties i portalen (Super Admin eller motsvarande).

1. **Installera verktygen**

   ```bash
   npm install -g @hubspot/cli
   cd hubspot-playbook-card
   npm install
   hs account auth
   ```

2. **Ladda upp projektet**

   ```bash
   npm run upload
   ```

   Kommandot kontrollerar `playbooks.js` först och laddar sedan upp. Godkänn att projektet skapas. Appen blir en privat app (static auth) som bara finns i er portal.

3. **Installera appen och hämta token**

   I HubSpot: **Utveckling > Projekt > playbook-card > Playbook-kort**. Installera appen i portalen och kopiera appens access token under fliken **Auth**.

4. **Skapa properties**

   ```bash
   HUBSPOT_TOKEN=din-token npm run setup:dry     # visar vad som skapas
   HUBSPOT_TOKEN=din-token npm run setup:apply   # skapar det som saknas
   ```

   Skriptet skapar gruppen **Playbook** och en property per fråga på kontakter och affärer. Det som redan finns lämnas orört, så du kan köra det igen när du lagt till frågor.

5. **Lägg kortet på posten**

   Öppna en affär, klicka **Anpassa** (Customize), välj fliken där kortet ska ligga, klicka **+**, filtrera på **App** och välj **Playbook**. Spara. Gör samma sak på kontakter. Kortet hamnar i mittenkolumnen, där HubSpot tillåter redigerbara property-listor.

## Ändra playbooks

| Vad du vill ändra | Var | Behövs utvecklare? |
|---|---|---|
| Frågans formulering, hjälptext, svarsalternativ | HubSpot, Inställningar > Properties | Nej |
| Säljtips, mål och namn på steg | `playbooks.js`, sedan `npm run upload` | Nej, men någon med CLI |
| Lägga till eller flytta en fråga | `playbooks.js`, `npm run setup:apply`, `npm run upload` | Nej, men någon med CLI |
| Ny playbook eller annan affärsfas | `playbooks.js`, samma som ovan | Nej, men någon med CLI |

Vill du använda en befintlig property, till exempel `closedate` eller `amount`, skriver du dess interna namn som `property` i `playbooks.js`. Skriptet hoppar över properties som redan finns.

**Affärsfaser:** `dealStages` använder HubSpots standard-pipeline (`appointmentscheduled`, `contractsent` och så vidare). Har ni en egen pipeline har faserna numeriska ID:n. Du hittar dem under Inställningar > Objekt > Affärer > Pipelines, eller genom att exportera en affär med fasen.

## Utveckling och test

```bash
npm test            # 38 tester: logik, kortet renderat med HubSpots testverktyg, setup-skriptet mot en låtsas-API, typkontroll
npm run validate    # kontrollerar playbooks.js
hs project dev      # kör kortet lokalt mot portalen med live-omladdning
```

## Filer

```
hsproject.json                        Projektet, plattform 2026.03
src/app/app-hsmeta.json               Appen: privat, static auth, scopes
src/app/cards/playbook-card-hsmeta.json   Kortet: mittenkolumnen på kontakter och affärer
src/app/cards/PlaybookCard.tsx        Kortet
src/app/cards/playbooks.js            Playbooks, steg, frågor och säljtips
src/app/cards/logic.ts                Framsteg, val av playbook och steg
src/app/cards/test/                   Tester för kortet och logiken
setup/create-properties.mjs           Skapar property-grupp och properties
setup/mapping.mjs                     Frågetyp till HubSpot-propertytyp, validering
```

## Frågetyper

| Typ i playbooks.js | Blir i HubSpot |
|---|---|
| `text` | Enradig text |
| `textarea` | Flerradig text |
| `number` | Nummer |
| `date` | Datumväljare |
| `select` | Rullgardin, ett val |
| `multiselect` | Kryssrutor, flera val |
| `yesno` | Ja/nej |
