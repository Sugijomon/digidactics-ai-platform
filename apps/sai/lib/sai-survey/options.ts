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
    code: "customer_data",
    label: "Klantgegevens",
    description: "Smoke-safe optie uit de huidige seed.",
  },
] satisfies SurveyOption[];

export const topConcernOptions = [
  {
    code: "privacy",
    label: "Privacy en persoonsgegevens",
    description: "Smoke-safe optie uit de huidige seed.",
  },
] satisfies SurveyOption[];

export const supportNeedOptions = [
  {
    code: "clear_policy",
    label: "Duidelijk beleid",
    description: "Smoke-safe optie uit de huidige seed.",
  },
] satisfies SurveyOption[];

export const preferenceReasonOptions = [
  {
    code: "ease_of_use",
    label: "Gebruiksgemak",
    description: "Smoke-safe optie uit de huidige seed.",
  },
] satisfies SurveyOption[];
