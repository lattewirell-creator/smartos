# Playbook-kort för HubSpot

Guidade säljplaybooks direkt på kontakt- och affärsposten. Varje fråga är en riktig HubSpot-property, så svaret sparas i samma ögonblick som säljaren lämnar fältet och kan användas i rapporter, listor och workflows som vilken property som helst.

Kortet kräver ingen serverless-funktion och ingen egen server, och därmed inte Sales Hub Enterprise för att spara svaren i properties. Vilken prenumerationsnivå HubSpot kräver för app-kort i sig bekräftar vi på er portal vid installationen, se [FORSLAG.md](FORSLAG.md).

Bakgrund, avvägningar och plan finns i förslaget.

## Så fungerar det

```
playbooks.js ──► setup-skriptet ──► properties i HubSpot (en gång)
     │
     └────────► kortet på posten ──► CrmPropertyList ──► sparar direkt i propertyn
```

Kortet läser playbooks, steg och säljtips från `src/app/cards/playbooks.js`. Själva fälten ritas av HubSpots egen komponent `CrmPropertyList`, som redigerar och sparar propertyn på posten med HubSpots vanliga validering, fälttyper och behörigheter.

På affärer förväljs playbooken utifrån affärens fas. Säljaren kan alltid byta i listan uppe till höger.

## Installation, cirka 30 minuter

Du behöver Node 20.12 eller senare, HubSpot CLI och rättigheten att skapa appar och properties i portalen (Super Admin eller motsvarande).

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

   I HubSpot: **Development > Projects > playbook-card**, öppna appen **Playbook-kort** och installera den i portalen. Kopiera appens access token under fliken **Auth**. Menynamnen kan skilja något mellan HubSpot-versioner och språk.

4. **Skapa properties**

   Lägg token i en fil som heter `.env` i projektroten, så hamnar den inte i terminalens historik. Filen är undantagen från git.

   ```bash
   echo "HUBSPOT_TOKEN=din-token" > .env
   npm run setup:dry     # visar vad som skapas
   npm run setup:apply   # skapar det som saknas
   ```

   Skriptet skapar gruppen **Playbook**, en property per fråga och en datum-property per playbook (**Playbook klar: Discovery** och så vidare) på kontakter och affärer. Det som redan finns lämnas orört, så du kan köra det igen när du lagt till frågor.

5. **Lägg kortet på posten**

   Öppna en affär, klicka **Anpassa** (Customize), välj fliken där kortet ska ligga, klicka **+**, filtrera på **App** och välj **Playbook**. Spara. Gör samma sak på kontakter. Kortet hamnar i mittenkolumnen, där HubSpot tillåter redigerbara property-listor.

6. **Markera genomförda playbooks (valfritt, rekommenderas)**

   Skapa ett workflow per playbook: kontaktbaserat för Kvalificering och affärsbaserat för de tre övriga. Till exempel för Discovery:
   - Registrering: alla obligatoriska Discovery-frågor *är kända* och **Playbook klar: Discovery** *är okänd*.
   - Åtgärd: sätt **Playbook klar: Discovery** till datumet då åtgärden körs.

   Då kan du rapportera andel affärer med genomförd discovery per säljare och fas, och jämföra vinstfrekvens med och utan playbook. Vilka frågor som är obligatoriska står i `playbooks.js` (`required: true`).

## Ändra playbooks

| Vad du vill ändra | Var | Behövs utvecklare? |
|---|---|---|
| Frågans formulering, hjälptext, svarsalternativ | HubSpot, Inställningar > Properties. Kortet visar alltid HubSpots version | Nej |
| Säljtips, mål och namn på steg | `playbooks.js`, sedan `npm run upload` | Nej, men någon med CLI |
| Lägga till eller flytta en fråga | `playbooks.js`, `npm run setup:apply`, `npm run upload` | Nej, men någon med CLI |
| Ny playbook eller annan affärsfas | `playbooks.js`, samma som ovan | Nej, men någon med CLI |

Texterna `label`, `description` och `options` i `playbooks.js` används bara när setup-skriptet skapar propertyn. Efter det är HubSpot facit. Uppdatera gärna filen också, så att en ny portal får samma formulering.

Vill du använda en befintlig property, till exempel `closedate` eller `amount`, skriver du dess interna namn som `property` i `playbooks.js`. Skriptet hoppar över properties som redan finns.

**Affärsfaser:** `dealStages` använder HubSpots standard-pipeline (`appointmentscheduled`, `contractsent` och så vidare). Har ni en egen pipeline har faserna numeriska ID:n. Du hittar dem under Inställningar > Objekt > Affärer > Pipelines, eller genom att exportera en affär med fasen.

## Utveckling och test

```bash
npm test            # 45 tester: logik, kortet renderat med HubSpots testverktyg, setup-skriptet mot en lokal testserver, typkontroll
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
src/app/cards/types.ts                Typer för playbooks, steg och frågor
src/app/cards/test/                   Tester för kortet och logiken
setup/create-properties.mjs           Skapar property-grupp och properties
setup/validate.mjs                    Kontrollerar playbooks.js (körs av npm run upload)
setup/mapping.mjs                     Frågetyp till HubSpot-propertytyp, validering
setup/*.test.mjs                      Tester för mappning och setup-skriptet
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
