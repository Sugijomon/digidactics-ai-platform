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
    label: "Ja, ik experimenteer met agents die taken uitvoeren",
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
    label: "Publieke informatie (V8 alias)",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "names",
    label: "Namen van personen",
    description: "Herleidbare namen zonder verdere bijzondere categorie.",
  },
  {
    code: "namen",
    label: "Namen van personen (V8 alias)",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "internal_emails",
    label: "Interne e-mails",
    description: "E-mailinhoud of conversaties uit de organisatie.",
  },
  {
    code: "interne_email",
    label: "Interne e-mails (V8 alias)",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "internal_documents",
    label: "Interne documenten",
    description: "Beleidsstukken, memo's, werkinstructies of interne concepten.",
  },
  {
    code: "interne_documenten",
    label: "Interne documenten (V8 alias)",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "meeting_notes",
    label: "Notulen van vergaderingen",
    description: "Verslagen, transcripties of actielijsten uit meetings.",
  },
  {
    code: "notulen",
    label: "Notulen of verslagen (V8 alias)",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "source_code_logic",
    label: "Broncode en logica",
    description: "Code, scripts, prompts, beslisregels of bedrijfslogica.",
  },
  {
    code: "broncode_logica",
    label: "Broncode of bedrijfslogica (V8 alias)",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "customer_data",
    label: "Klantgegevens",
    description: "Gegevens over klanten, leads, inwoners, clienten of partners.",
  },
  {
    code: "klantdata",
    label: "Klantgegevens (V8 alias)",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "financial_data",
    label: "Financiele data",
    description: "Omzet, budgetten, prijzen, salaris- of betaalinformatie.",
  },
  {
    code: "financiele_data",
    label: "Financiele gegevens (V8 alias)",
    description: "Alias uit de V8.1 ref-seed.",
  },
  {
    code: "special_personal_data",
    label: "Gevoelige persoonsgegevens",
    description: "Bijzondere categorieen of extra gevoelige persoonsgegevens.",
  },
  {
    code: "gevoelig_persoonsgegeven",
    label: "Bijzondere persoonsgegevens (V8 alias)",
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
    label: "Juridische documenten (V8 alias)",
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
    label: "Weet ik niet zeker (V8 alias)",
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
  { code: "intern_gebruik", label: "Intern gebruik" },
  { code: "klantgerichte_toepassing", label: "Klantgerichte toepassing" },
  { code: "beslisondersteuning", label: "Beslisondersteuning" },
  { code: "besluiten_over_personen", label: "Besluiten over personen" },
  { code: "hr_evaluatie", label: "HR en evaluatie" },
  { code: "kritieke_systemen", label: "Kritieke systemen" },
  { code: "nog_niet_duidelijk", label: "Nog niet duidelijk" },
] satisfies SurveyOption[];

export const accountTypeOptions = [
  { code: "business_license", label: "Zakelijke licentie" },
  { code: "zakelijke_licentie", label: "Zakelijke licentie (V8 alias)" },
  { code: "personal_free", label: "Persoonlijk gratis account" },
  { code: "prive_gratis", label: "Priveaccount - gratis" },
  { code: "personal_paid", label: "Persoonlijk betaald account" },
  { code: "prive_betaald", label: "Priveaccount - betaald" },
  { code: "both", label: "Beide" },
  { code: "beide", label: "Beide (V8 alias)" },
] satisfies SurveyOption[];
