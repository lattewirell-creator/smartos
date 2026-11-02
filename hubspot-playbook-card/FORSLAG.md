# Förslag: Playbooks på Sales Hub Professional, enklare än hacket i inlägget

## Kort version

Jen Lombardis idé är rätt. Playbooks på Pro-nivå sparar svaren i en anteckning och där dör de. Men hennes lösning bygger på en serverless-funktion som skriver svaren via API:t och en HubDB-tabell som håller frågorna. Båda delarna kostar mer än de ser ut att göra.

Vi bygger samma upplevelse för säljaren, men låter frågan **vara** propertyn. Kortet visar playbookens steg, säljtips och framsteg, och fälten ritas av HubSpots egen komponent `CrmPropertyList`. Den sparar direkt i propertyn när säljaren lämnar fältet. Ingen funktion som skriver, ingen token i drift, ingen tabell att synka, ingen skicka-knapp som kan glömmas.

Det är byggt, testat och klart att laddas upp. Det som återstår är cirka 30 minuter i portalen och kräver inloggning i HubSpot (se planen längst ner).

## Där originalet skaver

**Serverless-funktionen kan kräva just den Enterprise-licens man ville slippa.** HubSpots dokumentation för plattform 2026.03, som är den aktuella, säger att en app med serverless-funktioner kräver en Enterprise-prenumeration för att installeras. Den äldre plattformen 2025.1 är markerad som utfasad i HubSpots egna verktyg, så att bygga nytt på den är ingen väg runt kravet. Steg 5 i inlägget riskerar alltså att flytta Enterprise-kravet från Sales Hub till appen.

**HubDB är inte gratis.** HubDB ingår inte i Sales Hub. Det kräver ytterligare ett betalt paket, till exempel Content Hub Professional. Har kunden inte det blir steg 7 en ny licensfråga.

**Egen skrivkod är eget ansvar.** Någon ska hantera token, fälttyper, datumformat, flervalsfält, valideringsfel och behörigheter. Allt det finns redan i HubSpots property-editor.

**Skicka-knappen tappar data.** Svarar säljaren på halva playbooken och klickar vidare är svaren borta. Hos oss sparas varje fält för sig.

## Vår lösning

| | Inlägget | Vårt kort |
|---|---|---|
| Hur svaret sparas | Serverless-funktion skriver via API vid skicka | HubSpots egen fältkomponent sparar direkt per fält |
| Licens utöver Sales Pro | Enterprise för appen (serverless), Content Hub för HubDB | Ingen känd, verifieras på Pro-portal |
| Var frågorna bor | HubDB-tabell plus properties | Bara properties. Frågan är propertyn |
| Ändra en frågas formulering | Uppdatera tabellen och propertyn | Ändra propertyn i HubSpot, kortet visar den direkt |
| Fälttyper och validering | Byggs själv | HubSpots egna, samma som på posten |
| Behörigheter och historik | Byggs själv | HubSpots egna, inklusive ändringshistorik per property |
| Rapporter och workflows | Ja | Ja, direkt, plus ett klar-datum per playbook |
| Rätt playbook i rätt läge | Säljaren väljer | Förväljs efter affärens fas |
| Kod att underhålla | Kort, funktion, tabellintegration | Ett kort och en konfigurationsfil |

Utöver originalet får säljaren ett mål och ett konkret säljtips per steg, en stegindikator som visar vad som är klart, och en tydlig markering när obligatoriska frågor saknas. Kortet hoppar automatiskt till första steget som inte är klart, så säljaren börjar där hen slutade senast.

Varje playbook får dessutom en datum-property, till exempel **Playbook klar: Discovery**, som ett enkelt workflow sätter när de obligatoriska frågorna är besvarade. Det ger en tidslinje i stil med anteckningen i Pro-playbooks, men som går att rapportera på: andel affärer med genomförd discovery per säljare, och vinstfrekvens med och utan playbook.

Innehållet är skrivet för nordisk B2B: fyra playbooks (Kvalificering på kontakter, Discovery, Demo & förslag och Förhandling & avslut på affärer), 13 steg och 45 frågor. Frågorna är valda så att det som ska rapporteras blir rullgardiner, datum, nummer och ja/nej. Fritext finns bara där fritext behövs.

## Den ärliga avvägningen

Formulering, hjälptext och svarsalternativ ändras i HubSpot utan utvecklare. Att lägga till en helt ny fråga eller flytta den mellan steg görs i `playbooks.js` och tar fem minuter för någon med HubSpot CLI. Originalet låter en admin göra det i HubDB, men även där måste propertyn skapas för hand. I praktiken är skillnaden liten, och vi slipper en licens och en synk som kan glida isär.

Två saker bör vi känna till innan vi säljer in det brett:

1. Redigerbara property-listor får bara ligga i postens mittenkolumn, inte i högerspalten.
2. HubSpot har ännu inte publicerat ett entydigt svar på vilken nivå som krävs för app-kort utan serverless-funktioner. Allt pekar på att en betald prenumeration räcker, men vi verifierar på en ren Pro-portal innan vi lovar det till kund.

## Nästa version

**Inställningssida utan kod.** HubSpots SDK har ett experimentellt API-anrop direkt från kortet (`fetchHubSpotApi`). När det blir stabilt kan admin välja frågor per steg i ett gränssnitt, utan uppladdning.

**Spärr i pipelinen.** Klar-datumet finns redan i första versionen. Nästa steg är att använda det: kräva genomförd discovery innan affären får flyttas förbi en viss fas, eller larma säljchefen när en affär i sen fas saknar det.

**Dashboard.** Andel affärer med genomförd discovery per säljare och fas, och vinstfrekvens med och utan playbook. Det är siffran som säljer in verktyget internt, och den går att bygga direkt på klar-datumen.

## Plan till kl 07:00

| När | Vad | Status |
|---|---|---|
| I kväll | Analys, arkitektur, verifiering mot HubSpots SDK och mallar | Klart |
| I kväll | Kort, logik, setup-skript, 45 frågor i fyra playbooks | Klart |
| I kväll | 45 automatiska tester och typkontroll | Klart, alla gröna |
| I kväll | Förslag och installationsguide | Klart |
| I kväll | Oberoende kvalitetsgranskning, åtgärder och omgranskning | Klart |
| I morgon, cirka 30 min | `hs account auth`, `npm run upload`, installera appen, `npm run setup:apply`, lägg kortet på posterna, workflows för klar-datum | Kräver inloggning i HubSpot |
| I morgon, 15 min | Testa med en riktig affär i varje fas, justera affärsfaserna i `playbooks.js` om ni har egen pipeline | Kräver portal |

Uppladdningen kan inte göras härifrån, eftersom den kräver en personlig inloggning i HubSpot CLI. Allt annat är klart.
