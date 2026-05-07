export type SurveyOption = {
  code: string;
  label: string;
  description?: string;
  disabled?: boolean;
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
