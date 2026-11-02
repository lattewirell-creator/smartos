// Säljplaybooks för HubSpot-kortet.
//
// Varje fråga är en riktig HubSpot-property och svaret sparas direkt i den.
// Ändra frågans formulering, hjälptext och svarsalternativ i HubSpot
// (Inställningar > Properties), det kräver ingen utvecklare.
// Lägga till, ta bort eller flytta frågor mellan steg görs här, följt av
// `npm run validate` och `hs project upload`. Se README.
//
// Vill du använda en befintlig HubSpot-property, till exempel closedate eller
// amount, skriver du bara dess interna namn som property. Setup-skriptet
// hoppar över properties som redan finns.

/** @type {import('./types.ts').PropertyGroup[]} */
export const propertyGroups = [
  { objectType: 'contacts', name: 'pb_playbook', label: 'Playbook' },
  { objectType: 'deals', name: 'pb_playbook', label: 'Playbook' },
];

/** @type {import('./types.ts').Playbook[]} */
export const playbooks = [
  // ---------------------------------------------------------------------------
  // 1. KONTAKTER: KVALIFICERING
  // ---------------------------------------------------------------------------
  {
    id: 'kvalificering',
    name: 'Kvalificering',
    objectType: 'contacts',
    description: 'Används i första samtalet för att avgöra om kontakten ska bli en affär eller vårdas vidare.',
    dealStages: [],
    steps: [
      {
        id: 'behov',
        name: 'Behov',
        goal: 'Du vet hur de jobbar i dag, vad som skaver och varför det är aktuellt just nu.',
        tip: 'Låt kunden prata först och fråga: ”Om du fick ändra en sak i hur ni jobbar med det här redan i morgon, vad skulle det vara?”',
        questions: [
          {
            property: 'pb_ql_current_solution',
            label: 'Hur löser de det här i dag?',
            description: 'Välj det som bäst beskriver deras nuvarande sätt att arbeta.',
            type: 'select',
            options: ['Ingen lösning', 'Excel eller manuellt', 'Konkurrerande system', 'Egenutvecklat', 'Annat'],
            required: true,
          },
          {
            property: 'pb_ql_main_challenge',
            label: 'Vilket är deras största problem just nu?',
            description: 'Skriv med kundens egna ord, så kort som möjligt.',
            type: 'textarea',
            required: true,
          },
          {
            property: 'pb_ql_why_now',
            label: 'Varför är det aktuellt just nu?',
            description: 'Det som gör att frågan står på agendan i år och inte nästa år.',
            type: 'select',
            options: ['Tillväxt eller nya mål', 'Problem med nuvarande lösning', 'Ny chef eller omorganisation', 'Avtal som löper ut', 'Krav från ledning eller kunder', 'Inget särskilt'],
            required: false,
          },
        ],
      },
      {
        id: 'paverkan',
        name: 'Påverkan',
        goal: 'Du förstår vad problemet kostar och hur högt det står på kundens lista.',
        tip: 'Fråga: ”Vad händer om ni inte gör något åt det här det kommande året?” Vänta ut svaret, det första är sällan det viktigaste.',
        questions: [
          {
            property: 'pb_ql_impact_area',
            label: 'Var märks problemet mest?',
            description: 'Välj de områden där kunden själv säger att det gör ont.',
            type: 'multiselect',
            options: ['Intäkter', 'Kostnader', 'Tid och effektivitet', 'Kundupplevelse', 'Risk och regelefterlevnad'],
            required: false,
          },
          {
            property: 'pb_ql_cost_of_inaction',
            label: 'Vad händer om de inte gör något?',
            description: 'Konsekvensen för verksamheten, gärna med en siffra om kunden nämner en.',
            type: 'textarea',
            required: false,
          },
          {
            property: 'pb_ql_priority',
            label: 'Hur högt prioriterat är det här för dem?',
            description: 'Din bedömning efter samtalet, inte vad kunden säger av artighet.',
            type: 'select',
            options: ['Topp tre i år', 'Viktigt men inte akut', 'Bra att ha', 'Oklart'],
            required: true,
          },
        ],
      },
      {
        id: 'beslut',
        name: 'Beslut',
        goal: 'Du vet vem som bestämmer, om pengar finns och när de vill vara i mål.',
        tip: 'Fråga rakt: ”Hur brukar ni gå till väga när ni köper in något i den här storleken?” Boka nästa möte innan ni lägger på.',
        questions: [
          {
            property: 'pb_ql_contact_role',
            label: 'Vilken roll har kontakten i beslutet?',
            description: 'Avgör om du pratar med rätt person eller behöver komma vidare i organisationen.',
            type: 'select',
            options: ['Fattar beslutet', 'Påverkar beslutet', 'Användare utan mandat', 'Vet inte'],
            required: true,
          },
          {
            property: 'pb_ql_other_stakeholders',
            label: 'Vilka fler behöver vara med i beslutet?',
            description: 'Namn eller roller, till exempel ekonomichef, IT eller vd.',
            type: 'text',
            required: false,
          },
          {
            property: 'pb_ql_budget_status',
            label: 'Finns det budget för det här?',
            description: 'Det räcker att veta om pengar finns, beloppet tas i discovery.',
            type: 'select',
            options: ['Ja, budget finns', 'Kan tas fram med rätt underlag', 'Nej', 'Vet inte'],
            required: true,
          },
          {
            property: 'pb_ql_timeframe',
            label: 'När vill de ha en lösning på plats?',
            description: 'Kundens egen tidsram, inte din förhoppning.',
            type: 'select',
            options: ['Inom 3 månader', '3 till 6 månader', '6 till 12 månader', 'Om mer än 12 månader', 'Ingen tidsplan'],
            required: true,
          },
          {
            property: 'pb_ql_next_meeting_booked',
            label: 'Är nästa möte bokat i kalendern?',
            description: 'Ja betyder en skickad och accepterad kalenderinbjudan.',
            type: 'yesno',
            required: true,
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. AFFÄRER: DISCOVERY
  // ---------------------------------------------------------------------------
  {
    id: 'discovery',
    name: 'Discovery',
    objectType: 'deals',
    description: 'Används i affärens första möten för att förstå problemet, pengarna och hur kunden fattar beslut.',
    dealStages: ['appointmentscheduled', 'qualifiedtobuy'],
    steps: [
      {
        id: 'smarta-mal',
        name: 'Smärta & mål',
        goal: 'Du kan beskriva kundens problem och mål med kundens egna ord och siffror.',
        tip: 'Gräv ett lager till: ”Vad betyder det för dig och ditt team?” Ett mål utan siffra är en önskan, så be om ett nummer.',
        questions: [
          {
            property: 'pb_disc_core_problem',
            label: 'Vilket problem ska affären lösa?',
            description: 'Kärnproblemet i en eller två meningar, så som kunden själv beskriver det.',
            type: 'textarea',
            required: true,
          },
          {
            property: 'pb_disc_success_metric',
            label: 'Hur mäter kunden att projektet har lyckats?',
            description: 'Ett mätbart mål, till exempel halverad ledtid eller 20 procent fler möten.',
            type: 'text',
            required: true,
          },
          {
            property: 'pb_disc_problem_cost_sek',
            label: 'Vad kostar problemet kunden per år, i SEK?',
            description: 'Kundens egen uppskattning eller en siffra ni räknat fram tillsammans.',
            type: 'number',
            required: false,
          },
        ],
      },
      {
        id: 'ekonomi',
        name: 'Ekonomi',
        goal: 'Du vet om det finns pengar, hur mycket och vem som kan släppa dem.',
        tip: 'Fråga: ”Vilken investeringsnivå har ni tänkt er för att lösa det här?” Tvekar de, nämn ett spann själv och se hur de reagerar.',
        questions: [
          {
            property: 'pb_disc_budget_sek',
            label: 'Hur stor budget har kunden för det här, i SEK?',
            description: 'Totalt belopp för första året, eller kundens bästa uppskattning.',
            type: 'number',
            required: true,
          },
          {
            property: 'pb_disc_budget_status',
            label: 'Hur långt har budgeten kommit?',
            description: 'Visar hur säker affären är ekonomiskt.',
            type: 'select',
            options: ['Godkänd', 'Avsatt men inte godkänd', 'Måste tas fram', 'Ingen budget', 'Vet inte'],
            required: true,
          },
          {
            property: 'pb_disc_budget_owner',
            label: 'Vem äger budgeten?',
            description: 'Namn och roll på den som kan säga ja till pengarna.',
            type: 'text',
            required: false,
          },
        ],
      },
      {
        id: 'beslutsprocess',
        name: 'Beslutsprocess',
        goal: 'Du vet vem som fattar beslutet, vem som driver det internt och vad vi jämförs med.',
        tip: 'Fråga: ”Om ni väljer oss, vad behöver hända från ja till signerat avtal?” Rita upp stegen tillsammans med kunden.',
        questions: [
          {
            property: 'pb_disc_decision_maker',
            label: 'Vem fattar det slutliga beslutet?',
            description: 'Namn och roll, inte avdelning.',
            type: 'text',
            required: true,
          },
          {
            property: 'pb_disc_met_decision_maker',
            label: 'Har du träffat beslutsfattaren?',
            description: 'Ja betyder att ni har haft ett eget möte eller samtal.',
            type: 'yesno',
            required: true,
          },
          {
            property: 'pb_disc_champion',
            label: 'Vem driver frågan internt hos kunden?',
            description: 'Personen som vill att det här blir av och säljer internt när du inte är där.',
            type: 'text',
            required: false,
          },
          {
            property: 'pb_disc_decision_criteria',
            label: 'Vad väger tyngst när de väljer leverantör?',
            description: 'Välj det kunden faktiskt har sagt, max tre.',
            type: 'multiselect',
            options: ['Pris', 'Funktioner', 'Integrationer', 'Support och service', 'Säkerhet och GDPR', 'Referenser i branschen'],
            required: false,
          },
          {
            property: 'pb_disc_main_alternative',
            label: 'Vilket är kundens främsta alternativ till oss?',
            description: 'Att inte göra något är också ett alternativ och ofta det vanligaste.',
            type: 'select',
            options: ['Behålla nuvarande lösning', 'Konkurrent', 'Bygga själva', 'Inget alternativ', 'Vet inte'],
            required: false,
          },
        ],
      },
      {
        id: 'nasta-steg',
        name: 'Nästa steg',
        goal: 'Affären har ett beslutsdatum med ett skäl bakom och ett bokat nästa möte.',
        tip: 'Avsluta aldrig mötet utan bokad tid. Säg: ”Ska vi sätta nästa steg innan vi lägger på? Jag kan tisdag eller torsdag.”',
        questions: [
          {
            property: 'pb_disc_decision_date',
            label: 'När vill kunden fatta beslut?',
            description: 'Datumet kunden själv har sagt, inte ditt önskedatum.',
            type: 'date',
            required: true,
          },
          {
            property: 'pb_disc_deadline_reason',
            label: 'Vad gör att beslutsdatumet håller?',
            description: 'Ett konkret skäl, till exempel avtal som löper ut, nytt budgetår eller lansering.',
            type: 'text',
            required: false,
          },
          {
            property: 'pb_disc_next_step',
            label: 'Vad är nästa steg i affären?',
            description: 'Det som är överenskommet med kunden, inte det du planerar.',
            type: 'select',
            options: ['Demo', 'Workshop', 'Möte med beslutsfattare', 'Teknisk genomgång', 'Offert'],
            required: true,
          },
          {
            property: 'pb_disc_next_meeting_date',
            label: 'Vilket datum är nästa möte?',
            description: 'Lämna tomt om inget möte är bokat, då syns det i rapporterna.',
            type: 'date',
            required: false,
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. AFFÄRER: DEMO & FÖRSLAG
  // ---------------------------------------------------------------------------
  {
    id: 'demo-forslag',
    name: 'Demo & förslag',
    objectType: 'deals',
    description: 'Används när demo och offert ska visa att vi löser just det kunden berättade om i discovery.',
    dealStages: ['presentationscheduled', 'decisionmakerboughtin'],
    steps: [
      {
        id: 'forberedelse',
        name: 'Förberedelse',
        goal: 'Demon bygger på kundens egna problem och rätt personer är inbjudna.',
        tip: 'Skicka agendan i förväg och fråga: ”Är det här det viktigaste för er, eller missar vi något?” Visa aldrig allt produkten kan.',
        questions: [
          {
            property: 'pb_demo_use_cases',
            label: 'Vilka scenarier ska demon visa?',
            description: 'Högst tre, hämtade direkt från kundens problem i discovery.',
            type: 'textarea',
            required: true,
          },
          {
            property: 'pb_demo_attendees',
            label: 'Vilka roller deltar i demon?',
            description: 'Visar om beslutsfattaren och de som påverkar faktiskt är med.',
            type: 'multiselect',
            options: ['Beslutsfattare', 'Avdelningschef', 'Slutanvändare', 'IT', 'Inköp', 'Ekonomi'],
            required: false,
          },
        ],
      },
      {
        id: 'demo',
        name: 'Demo',
        goal: 'Du vet hur demon landade, vilka invändningar som kom upp och om något saknas.',
        tip: 'Stanna efter varje scenario och fråga: ”Hur skulle det här fungera hos er?” Ett nej under demon är bättre än ett tyst nej efteråt.',
        questions: [
          {
            property: 'pb_demo_date',
            label: 'När genomfördes demon?',
            description: 'Datum för huvuddemon med kunden.',
            type: 'date',
            required: false,
          },
          {
            property: 'pb_demo_reception',
            label: 'Hur togs demon emot?',
            description: 'Din ärliga bedömning av rummet, inte av hur artiga de var.',
            type: 'select',
            options: ['Mycket positivt', 'Positivt', 'Neutralt', 'Skeptiskt'],
            required: true,
          },
          {
            property: 'pb_demo_objections',
            label: 'Vilka invändningar kom upp och hur bemötte du dem?',
            description: 'Kort per invändning, så att nästa möte kan börja där.',
            type: 'textarea',
            required: false,
          },
          {
            property: 'pb_demo_requirement_gap',
            label: 'Saknas något som kunden kräver?',
            description: 'Ja om kunden har ett skallkrav som vi inte uppfyller i dag.',
            type: 'yesno',
            required: false,
          },
        ],
      },
      {
        id: 'forslag',
        name: 'Förslag',
        goal: 'Kunden har ett förslag som knyter priset till värdet och ni har gått igenom det tillsammans.',
        tip: 'Mejla aldrig bara offerten. Boka 30 minuter och säg: ”Jag går igenom förslaget med dig så att du kan svara på frågorna internt.”',
        questions: [
          {
            property: 'pb_demo_proposal_value_sek',
            label: 'Vad är det offererade värdet i SEK?',
            description: 'Totalt värde för första avtalsåret enligt skickat förslag.',
            type: 'number',
            required: true,
          },
          {
            property: 'pb_demo_proposal_sent_date',
            label: 'När skickades förslaget?',
            description: 'Används för att mäta tiden från förslag till beslut.',
            type: 'date',
            required: true,
          },
          {
            property: 'pb_demo_proposal_walkthrough',
            label: 'Har du gått igenom förslaget med kunden i möte?',
            description: 'Ja betyder ett möte eller samtal, inte bara ett mejl.',
            type: 'yesno',
            required: true,
          },
          {
            property: 'pb_demo_roi_presented',
            label: 'Har kunden sett en kalkyl på vad investeringen ger tillbaka?',
            description: 'Gärna byggd på kundens egna siffror från discovery.',
            type: 'yesno',
            required: false,
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. AFFÄRER: FÖRHANDLING & AVSLUT
  // ---------------------------------------------------------------------------
  {
    id: 'forhandling-avslut',
    name: 'Förhandling & avslut',
    objectType: 'deals',
    description: 'Används från att avtalet skickats tills det är signerat, för att ha koll på villkor, godkännanden och datum.',
    dealStages: ['contractsent'],
    steps: [
      {
        id: 'villkor',
        name: 'Villkor',
        goal: 'Du vet exakt vilka punkter som är öppna och vad du får tillbaka för varje eftergift.',
        tip: 'Ge aldrig något utan att få något. Säg: ”Det kan jag titta på om vi landar ett treårsavtal. Fungerar det för er?”',
        questions: [
          {
            property: 'pb_neg_open_terms',
            label: 'Vilka villkor är fortfarande öppna?',
            description: 'Välj allt som återstår att komma överens om.',
            type: 'multiselect',
            options: ['Pris', 'Avtalslängd', 'Betalningsvillkor', 'Juridik och ansvar', 'Omfattning', 'Startdatum'],
            required: true,
          },
          {
            property: 'pb_neg_discount_requested_pct',
            label: 'Hur stor rabatt begär kunden, i procent?',
            description: 'Ange 0 om kunden inte har bett om rabatt.',
            type: 'number',
            required: false,
          },
          {
            property: 'pb_neg_concession_trade',
            label: 'Vad får vi tillbaka om vi ger på priset?',
            description: 'Till exempel längre avtal, förskottsbetalning eller att de ställer upp som referens.',
            type: 'text',
            required: false,
          },
        ],
      },
      {
        id: 'godkannande',
        name: 'Godkännande',
        goal: 'Du känner till varje steg och varje person mellan muntligt ja och underskrift.',
        tip: 'Fråga: ”Vem mer behöver godkänna innan du kan skriva under, och hur lång tid brukar det ta?” Inköp och jurist är den vanligaste orsaken till att datum glider.',
        questions: [
          {
            property: 'pb_neg_signatory',
            label: 'Vem skriver under avtalet?',
            description: 'Namn och roll på den som har firmateckningsrätt eller mandat.',
            type: 'text',
            required: true,
          },
          {
            property: 'pb_neg_legal_review',
            label: 'Ska avtalet granskas av kundens jurist eller inköp?',
            description: 'Ja betyder att du behöver planera in deras tid i tidslinjen.',
            type: 'yesno',
            required: true,
          },
          {
            property: 'pb_neg_remaining_steps',
            label: 'Vilka steg återstår innan underskrift?',
            description: 'Lista stegen i ordning med ansvarig och datum.',
            type: 'textarea',
            required: false,
          },
        ],
      },
      {
        id: 'avslut',
        name: 'Avslut',
        goal: 'Det finns ett bekräftat signeringsdatum och kunden vet vad som händer dagen efter.',
        tip: 'Prata uppstart innan underskrift: ”Om vi signerar den 15:e, kan vi boka uppstartsmötet veckan efter?” Då blir avtalet ett steg i en plan.',
        questions: [
          {
            property: 'pb_neg_signing_date',
            label: 'Vilket datum har kunden bekräftat för underskrift?',
            description: 'Datumet kunden har sagt ja till, inte bara ett förslag från dig.',
            type: 'date',
            required: true,
          },
          {
            property: 'pb_neg_close_confidence',
            label: 'Hur säker är du på att affären signeras det datumet?',
            description: 'Används i prognosen, så var hellre försiktig än optimistisk.',
            type: 'select',
            options: ['Signeras enligt plan', 'Troligt, små frågor kvar', 'Osäkert', 'Risk att vi förlorar'],
            required: true,
          },
          {
            property: 'pb_neg_kickoff_booked',
            label: 'Är uppstartsmötet med kunden bokat?',
            description: 'Ja betyder att datum och deltagare för överlämningen är klara.',
            type: 'yesno',
            required: false,
          },
        ],
      },
    ],
  },
];
