export type SurveyOption = {
  code: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type ToolOption = {
  id: string;
  name: string;
  category: string;
  description?: string;
  toolCode?: string;
};

export const departmentOptions = [
  { code: "it_data_development", label: "IT, data of development" },
  { code: "marketing_communicatie", label: "Marketing of communicatie" },
  { code: "hr_recruitment", label: "HR of recruitment" },
  { code: "finance_legal", label: "Finance of legal" },
  { code: "sales_account", label: "Sales of accountmanagement" },
  { code: "operations", label: "Operations" },
  { code: "directie_management", label: "Directie of management" },
  { code: "anders", label: "Anders" },
] satisfies SurveyOption[];

export const aiFrequencyOptions = [
  { code: "daily", label: "Dagelijks" },
  { code: "weekly", label: "Wekelijks" },
  { code: "monthly", label: "Maandelijks" },
  { code: "never", label: "Ik gebruik momenteel geen AI-tools" },
] satisfies SurveyOption[];

export const noAiReasonOptions = [
  { code: "geen_waarde", label: "Ik zie de toegevoegde waarde nog niet" },
  { code: "verboden", label: "Het is expliciet verboden binnen mijn vakgebied" },
  { code: "weet_niet_hoe", label: "Ik weet niet hoe ik moet beginnen" },
] satisfies SurveyOption[];

export const motivationOptions = [
  {
    code: "tijdswinst",
    label: "Tijdswinst",
    description: "Ik krijg mijn taken sneller af.",
  },
  {
    code: "kwaliteitsverbetering",
    label: "Kwaliteitsverbetering",
    description: "De output is beter, creatiever of foutlozer.",
  },
  {
    code: "complexe_taken",
    label: "Complexe taken",
    description: "Het helpt bij zaken die ik vrijwel niet zelf kan.",
  },
  {
    code: "inspiratie_brainstormen",
    label: "Inspiratie en brainstormen",
    description: "Het helpt om over een leeg vel heen te komen.",
  },
  {
    code: "experimenteren",
    label: "Experimenteren",
    description: "Ik wil ontdekken wat AI voor mijn rol kan betekenen.",
  },
  {
    code: "anders",
    label: "Anders",
    description: "Vul kort in wat jouw belangrijkste motivatie is.",
  },
] satisfies SurveyOption[];

export const dataAwarenessOptions = [
  {
    code: "ja_controle",
    label: "Ja, ik controleer voorwaarden over privacy en data-opslag",
  },
  {
    code: "gedeeltelijk",
    label: "Gedeeltelijk, ik weet dat data opgeslagen kan worden",
  },
  {
    code: "nee_prive",
    label: "Nee, ik ga ervan uit dat mijn gegevens prive blijven",
  },
  {
    code: "nee_niet_verdiept",
    label: "Nee, ik heb me hier nog niet in verdiept",
  },
] satisfies SurveyOption[];

export const anonymizationBehaviorOptions = [
  { code: "altijd", label: "Ja, altijd" },
  { code: "soms", label: "Soms, als de informatie gevoelig is" },
  { code: "nooit", label: "Nee, ik voer de informatie direct in" },
  { code: "wist_niet", label: "Ik wist niet dat dit nodig of mogelijk was" },
] satisfies SurveyOption[];

export const browserExtensionUsageOptions = [
  { code: "ja_bewust", label: "Ja, ik gebruik deze bewust" },
  {
    code: "ja_onzeker",
    label: "Ik heb ze geinstalleerd, maar weet niet zeker of ze meekijken",
  },
  { code: "nee", label: "Nee, ik gebruik geen AI-extensies" },
  { code: "weet_niet", label: "Ik weet niet precies wat dit zijn" },
] satisfies SurveyOption[];

export const automationUsageOptions = [
  { code: "alleen_chatbot", label: "Nee, ik gebruik AI alleen als chatbot" },
  {
    code: "agents_reeks_taken",
    label: "Ja, ik experimenteer met agents die zelfstandig taken uitvoeren",
  },
  { code: "gekoppeld_apps", label: "Ja, ik heb AI gekoppeld aan andere apps" },
  {
    code: "weet_niet_zeker",
    label: "Ik weet niet zeker of mijn tools zelfstandig werken",
  },
] satisfies SurveyOption[];

export const aiPolicyAwarenessOptions = [
  { code: "ja_goed", label: "Ja, ik weet goed wat er wel en niet mag" },
  { code: "vaag", label: "Vaag bekend, ik heb er iets over gehoord" },
  { code: "nee", label: "Nee, ik weet niet of er afspraken zijn" },
  { code: "geen_beleid", label: "Voor zover ik weet is er nog geen beleid" },
] satisfies SurveyOption[];

export const aiSkillLevelOptions = [
  { code: "beginner", label: "Beginner" },
  { code: "gemiddeld", label: "Gemiddeld" },
  { code: "gevorderd", label: "Gevorderd" },
  { code: "expert", label: "Expert" },
] satisfies SurveyOption[];

export const processingOutputOptions = [
  { code: "direct_overnemen", label: "Ik neem de resultaten meestal direct over" },
  {
    code: "controle_handmatig",
    label: "Ik controleer feiten en informatie handmatig",
  },
  {
    code: "ruwe_opzet",
    label: "Ik gebruik output als ruwe opzet of inspiratie",
  },
] satisfies SurveyOption[];

export const dataTypeOptions = [
  {
    code: "public_information",
    label: "Publieke informatie",
    description: "Informatie die al openbaar beschikbaar is.",
  },
  {
    code: "publiek",
    label: "Publieke informatie",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "names",
    label: "Namen van personen",
    description: "Herleidbare namen zonder verdere bijzondere categorie.",
  },
  {
    code: "namen",
    label: "Namen van personen",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "internal_emails",
    label: "Interne e-mails",
    description: "E-mailinhoud of conversaties uit de organisatie.",
  },
  {
    code: "interne_email",
    label: "Interne e-mails",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "internal_documents",
    label: "Interne documenten",
    description: "Beleidsstukken, memo's, werkinstructies of interne concepten.",
  },
  {
    code: "interne_documenten",
    label: "Interne documenten",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "meeting_notes",
    label: "Notulen van vergaderingen",
    description: "Verslagen, transcripties of actielijsten uit meetings.",
  },
  {
    code: "notulen",
    label: "Notulen of verslagen",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "source_code_logic",
    label: "Broncode en logica",
    description: "Code, scripts, prompts, beslisregels of bedrijfslogica.",
  },
  {
    code: "broncode_logica",
    label: "Broncode of bedrijfslogica",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "customer_data",
    label: "Klantgegevens",
    description: "Gegevens over klanten, leads, inwoners, clienten of partners.",
  },
  {
    code: "klantdata",
    label: "Klantgegevens",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "financial_data",
    label: "Financiele data",
    description: "Omzet, budgetten, prijzen, salaris- of betaalinformatie.",
  },
  {
    code: "financiele_data",
    label: "Financiele gegevens",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "special_personal_data",
    label: "Gevoelige persoonsgegevens",
    description: "Bijzondere categorieen of extra gevoelige persoonsgegevens.",
  },
  {
    code: "gevoelig_persoonsgegeven",
    label: "Bijzondere persoonsgegevens",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "excel_sheets",
    label: "Excel sheets",
    description: "Spreadsheets met operationele, klant- of organisatiedata.",
  },
  {
    code: "legal_documents",
    label: "Juridische documenten",
    description: "Contracten, claims, adviezen of juridische analyses.",
  },
  {
    code: "juridische_documenten",
    label: "Juridische documenten",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "none",
    label: "Ik voer dit niet in",
    description: "Gebruik dit alleen als je geen werkdata in AI-tools invoert.",
  },
  {
    code: "niets",
    label: "Geen persoonsgegevens of vertrouwelijke data",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "unsure",
    label: "Weet ik niet zeker",
    description: "Kies dit als je niet zeker weet welke data wordt verwerkt.",
  },
  {
    code: "onzeker",
    label: "Weet ik niet zeker",
    description: "Alias uit de V8.1 ref-seed.",
  },
] satisfies SurveyOption[];

export const topConcernOptions = [
  {
    code: "learning_curve",
    label: "Leercurve",
    description: "Het kost te veel tijd om het goed te leren.",
  },
  {
    code: "accuracy",
    label: "Accuratesse",
    description: "Ik vertrouw de uitkomsten niet altijd.",
  },
  {
    code: "costs",
    label: "Kosten",
    description: "Ik wil geen privegeld uitgeven aan zakelijke tools.",
  },
  {
    code: "privacy",
    label: "Privacy en persoonsgegevens",
    description: "Ik maak me zorgen over persoonsgegevens en privacy.",
  },
  {
    code: "privacy_security",
    label: "Privacy en security",
    description: "Ik weet niet of mijn data veilig is.",
  },
  {
    code: "no_major_concerns",
    label: "Geen bijzondere zorgen",
    description: "Gebruik dit als er geen duidelijke zorg speelt.",
  },
  {
    code: "other",
    label: "Anders",
    description: "Andere zorg; toelichting volgt later in de volledige flow.",
  },
] satisfies SurveyOption[];

export const supportNeedOptions = [
  {
    code: "clear_policy",
    label: "Duidelijk beleid",
    description: "Heldere richtlijnen over wat wel en niet mag.",
  },
  {
    code: "inspiration_examples",
    label: "Inspiratie en voorbeelden",
    description: "Concrete use cases van collega's of andere organisaties.",
  },
  {
    code: "training",
    label: "Opleiding en training",
    description: "Praktische workshops om beter te prompten of tools te begrijpen.",
  },
  {
    code: "practice_together",
    label: "Samen oefenen",
    description: "Een klankbordgroep of AI-cafe om ervaringen uit te wisselen.",
  },
  {
    code: "official_licenses",
    label: "Officiele licenties",
    description: "Toegang tot betaalde of zakelijke versies van tools.",
  },
  {
    code: "technical_advice",
    label: "Technisch advies",
    description: "Hulp bij het veilig inrichten van AI-workflows.",
  },
] satisfies SurveyOption[];

export const preferenceReasonOptions = [
  {
    code: "speed",
    label: "Snelheid",
    description: "Het werkt sneller dan de huidige officiele alternatieven.",
  },
  {
    code: "functionality",
    label: "Functionaliteit",
    description: "De tool kan dingen die andere software niet kan.",
  },
  {
    code: "quality",
    label: "Kwaliteit",
    description: "Ik vind de resultaten beter.",
  },
  {
    code: "ease_of_use",
    label: "Gebruiksgemak",
    description: "De tool is laagdrempelig of ik ben eraan gewend.",
  },
  {
    code: "collaboration",
    label: "Samenwerking",
    description: "Collega's of partners gebruiken deze tool ook.",
  },
] satisfies SurveyOption[];

export const toolOptions = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    category: "Algemene AI",
    description: "Als library tool beschikbaar in de huidige smoke/V8.1 seed.",
    toolCode: "chatgpt",
  },
  {
    id: "claude",
    name: "Claude",
    category: "Algemene AI",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "gemini",
    name: "Gemini",
    category: "Algemene AI",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "notebooklm",
    name: "NotebookLM",
    category: "Algemene AI",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "perplexity",
    name: "Perplexity",
    category: "Algemene AI",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    category: "Algemene AI",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "mistral_le_chat",
    name: "Mistral Le Chat",
    category: "Algemene AI",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "perplexity_computer",
    name: "Perplexity Computer",
    category: "Agentic AI",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "claude_cowork",
    name: "Claude Cowork",
    category: "Agentic AI",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "microsoft_copilot",
    name: "Microsoft Copilot",
    category: "Werkplek",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "m365_copilot",
    name: "M365 Copilot",
    category: "Werkplek",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "teams_copilot",
    name: "Copilot in Teams",
    category: "Werkplek",
    description: "Ingebouwde AI-functie in Microsoft Teams.",
  },
  {
    id: "copilot_for_excel",
    name: "Copilot in Excel",
    category: "Werkplek",
    description: "Ingebouwde AI-functie in Microsoft Excel.",
  },
  {
    id: "google_workspace_ai",
    name: "Google Workspace AI",
    category: "Werkplek",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "grammarly",
    name: "Grammarly",
    category: "Schrijven",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "jasper",
    name: "Jasper",
    category: "Schrijven",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "copy_ai",
    name: "Copy.ai",
    category: "Schrijven",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "notion_ai",
    name: "Notion AI",
    category: "Schrijven",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "gamma",
    name: "Gamma",
    category: "Presentaties/design",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "canva_ai",
    name: "Canva AI",
    category: "Presentaties/design",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "google_stitch",
    name: "Google Stitch",
    category: "Presentaties/design",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "adobe_firefly",
    name: "Adobe Firefly",
    category: "Presentaties/design",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "midjourney",
    name: "Midjourney",
    category: "Beeld/video",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "dall_e",
    name: "DALL-E",
    category: "Beeld/video",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "runway",
    name: "Runway",
    category: "Beeld/video",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "synthesia",
    name: "Synthesia",
    category: "Beeld/video",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    category: "Audio/spraak",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "murf_ai",
    name: "Murf AI",
    category: "Audio/spraak",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "otter_ai",
    name: "Otter.ai",
    category: "Notulen",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "fireflies_ai",
    name: "Fireflies.ai",
    category: "Notulen",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "tl_dv",
    name: "tl;dv",
    category: "Notulen",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "fathom",
    name: "Fathom",
    category: "Notulen",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "tactiq",
    name: "Tactiq",
    category: "Notulen",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "github_copilot",
    name: "GitHub Copilot",
    category: "Code",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "cursor",
    name: "Cursor",
    category: "Code",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "claude_code",
    name: "Claude Code",
    category: "Code",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "tabnine",
    name: "Tabnine",
    category: "Code",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "julius_ai",
    name: "Julius AI",
    category: "Data en automatisering",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "akkio",
    name: "Akkio",
    category: "Data en automatisering",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "n8n",
    name: "n8n",
    category: "Data en automatisering",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "make",
    name: "Make",
    category: "Data en automatisering",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "zapier_ai",
    name: "Zapier AI",
    category: "Data en automatisering",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "salesforce_einstein",
    name: "Salesforce Einstein",
    category: "CRM en klant",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "hubspot_ai",
    name: "HubSpot AI",
    category: "CRM en klant",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "pipedrive_ai",
    name: "Pipedrive AI",
    category: "CRM en klant",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "monday_ai",
    name: "monday.com AI",
    category: "CRM en klant",
    description: "Wordt voorlopig als nieuw ontdekte tool opgeslagen.",
  },
  {
    id: "workday_ai",
    name: "Workday AI",
    category: "HR en recruitment",
    description: "Ingebouwde AI-functies in Workday.",
  },
  {
    id: "linkedin_recruiter_ai",
    name: "LinkedIn Recruiter AI",
    category: "HR en recruitment",
    description: "Ingebouwde AI-functies in recruitment tooling.",
  },
  {
    id: "ats_ai",
    name: "AI in ATS of recruitmentsoftware",
    category: "HR en recruitment",
    description: "Gebruik dit als de AI-functie in een ATS zit.",
  },
  {
    id: "custom",
    name: "Andere tool",
    category: "Zelf invullen",
    description: "Gebruik dit als jouw tool niet in de lijst staat.",
  },
] satisfies ToolOption[];

export const useCaseOptions = [
  { code: "drafting", label: "Teksten schrijven" },
  { code: "teksten_schrijven", label: "Teksten schrijven of bewerken" },
  { code: "samenvatten_redigeren", label: "Samenvatten en redigeren" },
  { code: "brainstormen", label: "Brainstormen" },
  { code: "informatie_opzoeken", label: "Informatie opzoeken" },
  { code: "vertalen", label: "Vertalen" },
  { code: "klantenservice", label: "Klantenservice" },
  { code: "data_analyseren", label: "Data analyseren" },
  { code: "code_schrijven", label: "Code schrijven" },
  { code: "afbeeldingen_genereren", label: "Afbeeldingen genereren" },
  { code: "presentaties_design", label: "Presentaties en design" },
  { code: "automatisering", label: "Automatisering" },
  { code: "audio_genereren", label: "Audio genereren" },
  { code: "video_genereren", label: "Video genereren" },
  { code: "vergaderingen_notuleren", label: "Vergaderingen notuleren" },
  { code: "workflow_uitvoeren", label: "Workflows uitvoeren" },
  { code: "systemen_aansturen", label: "Systemen aansturen" },
  { code: "taken_automatisch_afhandelen", label: "Taken automatisch afhandelen" },
] satisfies SurveyOption[];

export const contextOptions = [
  { code: "internal_work", label: "Intern werk" },
  {
    code: "intern_gebruik",
    label: "Intern gebruik",
    description: "Voor interne dashboards, scripts, automatisering of developer-tooling.",
  },
  {
    code: "klantgerichte_toepassing",
    label: "Klantgerichte toepassing",
    description:
      "Voor software waar externe gebruikers direct mee werken, zoals portalen, apps of websites.",
  },
  {
    code: "beslisondersteuning",
    label: "Beslisondersteuning",
    description:
      "Voor code die helpt bij planning, voorspellingen of analyses als input voor een menselijke afweging.",
  },
  {
    code: "besluiten_over_personen",
    label: "Besluiten over personen",
    description:
      "Voor recruitment, personeelsbeheer of software die profielen opstelt voor individuele trajecten.",
  },
  {
    code: "financieel_juridisch",
    label: "Financieel en juridisch",
    description:
      "Voor contractverwerking, premieberekeningen, risico-inschattingen of financiele validatie.",
  },
  { code: "hr_evaluatie", label: "HR en evaluatie" },
  {
    code: "kritieke_systemen",
    label: "Kritieke systemen",
    description:
      "Voor software in zorg, logistiek, energie of primaire veiligheidsprocessen.",
  },
  {
    code: "nog_niet_duidelijk",
    label: "Nog niet duidelijk",
    description:
      "Voor experimenten of projecten waarvan de uiteindelijke bestemming nog in verkenning is.",
  },
] satisfies SurveyOption[];

export const accountTypeOptions = [
  { code: "business_license", label: "Zakelijke licentie" },
  { code: "zakelijke_licentie", label: "Zakelijke licentie" },
  { code: "personal_free", label: "Persoonlijk gratis account" },
  { code: "prive_gratis", label: "Priveaccount - gratis" },
  { code: "personal_paid", label: "Persoonlijk betaald account" },
  { code: "prive_betaald", label: "Priveaccount - betaald" },
  { code: "both", label: "Beide" },
  { code: "beide", label: "Beide" },
] satisfies SurveyOption[];

export const applicationFrequencyOptions = [
  { code: "daily", label: "Dagelijks" },
  { code: "weekly", label: "Wekelijks" },
  { code: "monthly", label: "Maandelijks" },
  { code: "rarely", label: "Incidenteel of enkele keren geprobeerd" },
  { code: "unknown", label: "Weet ik niet zeker" },
] satisfies SurveyOption[];

export const applicationAccountEnvironmentOptions = [
  { code: "business_license", label: "Zakelijke licentie of beheeromgeving" },
  {
    code: "embedded_business_system",
    label: "Ingebouwde AI-functie in een bedrijfssysteem",
  },
  { code: "personal_free", label: "Persoonlijk gratis account" },
  { code: "personal_paid", label: "Persoonlijk betaald account" },
  { code: "multiple", label: "Meerdere omgevingen" },
  { code: "unknown", label: "Weet ik niet zeker" },
] satisfies SurveyOption[];

export const outputDestinationOptions = [
  { code: "personal_inspiration", label: "Alleen inspiratie of ruwe opzet" },
  { code: "internal_document", label: "Intern werkdocument" },
  { code: "colleague_communication", label: "Communicatie met collega's" },
  {
    code: "customer_public_communication",
    label: "Klant- of publiekscommunicatie",
  },
  { code: "other_system_input", label: "Invoer in een ander systeem" },
  { code: "advice_decision_support", label: "Advies of beslisondersteuning" },
  { code: "person_decision", label: "Besluit of advies over een persoon" },
  { code: "unknown", label: "Weet ik niet zeker" },
] satisfies SurveyOption[];

export const outputControlOptions = [
  { code: "full_manual_check", label: "Ik controleer inhoud en bronnen volledig" },
  {
    code: "important_parts_check",
    label: "Ik controleer alleen belangrijke onderdelen",
  },
  {
    code: "colleague_or_expert_check",
    label: "Een collega of deskundige controleert",
  },
  {
    code: "automatic_processing",
    label: "Het systeem verwerkt de output automatisch verder",
  },
  { code: "usually_no_check", label: "Meestal geen afzonderlijke controle" },
  { code: "varies", label: "Dat verschilt sterk" },
  { code: "unknown", label: "Weet ik niet zeker" },
] satisfies SurveyOption[];

export const deviationAuthorityOptions = [
  { code: "always", label: "Ja, altijd" },
  { code: "usually", label: "Meestal" },
  { code: "sometimes", label: "Soms" },
  { code: "hardly", label: "Vrijwel niet" },
  { code: "not_applicable", label: "Niet van toepassing" },
  { code: "unknown", label: "Weet ik niet zeker" },
] satisfies SurveyOption[];

export const peopleImpactOptions = [
  { code: "none_visible", label: "Geen directe invloed op personen zichtbaar" },
  {
    code: "customers_or_clients",
    label: "Kan klanten, clienten of inwoners raken",
  },
  {
    code: "employees_or_candidates",
    label: "Kan medewerkers of kandidaten raken",
  },
  {
    code: "important_decision",
    label: "Kan een belangrijk advies of besluit beinvloeden",
  },
  { code: "unknown", label: "Weet ik niet zeker" },
] satisfies SurveyOption[];

export const aiTransparencyOptions = [
  { code: "yes", label: "Ja" },
  { code: "sometimes", label: "Soms" },
  { code: "no", label: "Nee" },
  { code: "not_relevant", label: "Niet relevant" },
  { code: "unknown_relevance", label: "Ik weet niet wanneer dat relevant is" },
] satisfies SurveyOption[];

export const valueTypeOptions = [
  { code: "time_saving", label: "Tijdwinst" },
  { code: "first_quality", label: "Betere eerste opzet" },
  { code: "final_quality", label: "Betere eindkwaliteit" },
  { code: "workload_reduction", label: "Lagere werkdruk" },
  { code: "faster_service", label: "Snellere interne of klantdienstverlening" },
  { code: "new_capability", label: "Nieuwe mogelijkheid" },
  { code: "no_clear_value", label: "Geen duidelijke waarde zichtbaar" },
  { code: "negative_effect", label: "Levert juist extra werk of risico op" },
  { code: "unknown", label: "Weet ik niet zeker" },
] satisfies SurveyOption[];

export const valueBeneficiaryOptions = [
  { code: "respondent", label: "Voor mijzelf in mijn werk" },
  { code: "team", label: "Voor het team" },
  { code: "customers_or_clients", label: "Voor klanten, clienten of inwoners" },
  { code: "organization", label: "Voor de organisatie als geheel" },
  {
    code: "unclear_or_shifted_work",
    label: "Onduidelijk of werk verschuift vooral naar anderen",
  },
  { code: "unknown", label: "Weet ik niet zeker" },
] satisfies SurveyOption[];

export const netEffectOptions = [
  { code: "clearly_positive", label: "Duidelijk positief" },
  { code: "somewhat_positive", label: "Enigszins positief" },
  { code: "neutral", label: "Ongeveer gelijk" },
  { code: "mixed", label: "Gemengd: winst maar ook extra controle" },
  { code: "negative", label: "Eerder negatief" },
  { code: "unknown", label: "Weet ik niet zeker" },
] satisfies SurveyOption[];

export const controlReworkOptions = [
  { code: "little", label: "Weinig extra controle of herstelwerk" },
  { code: "normal", label: "Normale controle zoals bij ander werk" },
  { code: "substantial", label: "Aanzienlijke controle of correctie nodig" },
  { code: "often_rework", label: "Regelmatig herstelwerk nodig" },
  { code: "unknown", label: "Weet ik niet zeker" },
] satisfies SurveyOption[];

export const shareabilityOptions = [
  { code: "yes_same_task", label: "Ja, voor collega's met dezelfde taak" },
  { code: "maybe_with_conditions", label: "Misschien, met voorwaarden" },
  { code: "no_context_specific", label: "Nee, te context- of persoonsgebonden" },
  { code: "unknown", label: "Weet ik niet zeker" },
] satisfies SurveyOption[];

export const valueEvidenceOptions = [
  { code: "feeling_estimate", label: "Vooral gevoel of inschatting" },
  { code: "concrete_example", label: "Concreet voorbeeld uit mijn werk" },
  { code: "measurable", label: "Dit is meetbaar of gemeten" },
  { code: "unknown", label: "Weet ik niet zeker" },
] satisfies SurveyOption[];

export const aiVisibilityOptions = [
  {
    code: "visible_to_recipient",
    label: "Ontvanger of collega ziet dat AI is gebruikt",
  },
  {
    code: "visible_if_asked",
    label: "Alleen zichtbaar als iemand ernaar vraagt",
  },
  { code: "not_visible", label: "Meestal niet zichtbaar" },
  { code: "not_relevant", label: "Niet relevant voor deze toepassing" },
  { code: "unknown", label: "Weet ik niet zeker" },
] satisfies SurveyOption[];

export const conditionNeedOptions = [
  { code: "clear_data_rules", label: "Duidelijkere gegevensregels" },
  { code: "business_tooling", label: "Zakelijke tooling of licentie" },
  { code: "better_output_control", label: "Betere outputcontrole" },
  { code: "clear_ownership", label: "Duidelijk eigenaarschap" },
  { code: "supplier_information", label: "Leveranciersinformatie" },
  { code: "transparency_agreements", label: "Transparantieafspraken" },
  { code: "training_support", label: "Training of ondersteuning" },
  { code: "specialist_review", label: "Specialistische beoordeling" },
  { code: "nothing_visible", label: "Niets aanvullends zichtbaar" },
  { code: "unknown", label: "Weet ik niet zeker" },
] satisfies SurveyOption[];

export const nearMissSignalOptions = [
  { code: "none", label: "Nee" },
  { code: "incorrect_or_invented", label: "Onjuiste of verzonnen informatie" },
  { code: "biased_or_unwanted", label: "Ongewenste of bevooroordeelde output" },
  { code: "sensitive_data_entered", label: "Gevoelige informatie ingevoerd" },
  { code: "wrong_account_environment", label: "Verkeerd account of omgeving" },
  { code: "output_almost_used_wrongly", label: "Output bijna onjuist gebruikt" },
  { code: "other", label: "Anders" },
  { code: "prefer_not_to_answer", label: "Wil ik niet beantwoorden" },
] satisfies SurveyOption[];

export const escalationRouteAwarenessOptions = [
  { code: "clear", label: "Ja, dat is duidelijk" },
  { code: "partial", label: "Gedeeltelijk" },
  { code: "not_clear", label: "Nee" },
  { code: "no_owner_visible", label: "Er is geen aangewezen eigenaar zichtbaar" },
  { code: "unknown", label: "Weet ik niet zeker" },
] satisfies SurveyOption[];

export const skillDomainOptions = [
  { code: "data_use", label: "Veilig gegevensgebruik" },
  { code: "output_check", label: "Outputcontrole" },
  { code: "hallucination_bias", label: "Hallucinaties en bias herkennen" },
  { code: "transparency", label: "Transparantie over AI-gebruik" },
] satisfies SurveyOption[];

export const skillResponseOptions = [
  { code: "preferred_action", label: "Ik weet wat de veilige aanpak is" },
  { code: "partial_action", label: "Ik weet het deels" },
  { code: "risky_action", label: "Ik kies soms risicovol of op gevoel" },
  { code: "does_not_know", label: "Ik weet niet wat ik moet doen" },
  { code: "not_applicable", label: "Niet van toepassing" },
] satisfies SurveyOption[];

export const aiFotoDoubtScenarioOptions = [
  {
    code: "check_sources",
    label: "Ik controleer bronnen of feiten voordat ik het gebruik",
  },
  {
    code: "ask_colleague",
    label: "Ik vraag een collega of deskundige mee te kijken",
  },
  {
    code: "use_as_draft_only",
    label: "Ik gebruik het alleen als ruwe opzet of inspiratie",
  },
  {
    code: "use_anyway",
    label: "Ik gebruik het meestal toch als het plausibel klinkt",
  },
  {
    code: "stop_or_report",
    label: "Ik stop en meld of bespreek het via de juiste route",
  },
  { code: "unknown", label: "Ik weet niet goed wat ik dan moet doen" },
] satisfies SurveyOption[];
