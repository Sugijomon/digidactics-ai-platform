export type SurveyOption = {
  code: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

const DEV_REF_DATA_MISSING = "Dev: ref-data nog niet in de live smoke seed.";
const DEV_DISABLED_SUFFIX = " (dev: ref-data ontbreekt)";

function disabledProfileOption(code: string, label: string): SurveyOption {
  return {
    code,
    label: `${label}${DEV_DISABLED_SUFFIX}`,
    description: DEV_REF_DATA_MISSING,
    disabled: true,
  };
}

export const departmentOptions = [
  {
    code: "it_data_development",
    label: "IT, data of development",
    description: "Smoke-safe optie uit de huidige seed.",
  },
  disabledProfileOption("marketing_communicatie", "Marketing of communicatie"),
  disabledProfileOption("hr_recruitment", "HR of recruitment"),
  disabledProfileOption("finance_legal", "Finance of legal"),
  disabledProfileOption("sales_account", "Sales of accountmanagement"),
  disabledProfileOption("operations", "Operations"),
  disabledProfileOption("directie_management", "Directie of management"),
  disabledProfileOption("anders", "Anders"),
] satisfies SurveyOption[];

export const aiFrequencyOptions = [
  {
    code: "weekly",
    label: "Wekelijks",
    description: "Smoke-safe optie uit de huidige seed.",
  },
  disabledProfileOption("daily", "Dagelijks"),
  disabledProfileOption("monthly", "Maandelijks"),
  disabledProfileOption("never", "Ik gebruik momenteel geen AI-tools"),
] satisfies SurveyOption[];

export const noAiReasonOptions = [
  disabledProfileOption(
    "geen_waarde",
    "Ik zie de toegevoegde waarde nog niet",
  ),
  disabledProfileOption(
    "verboden",
    "Het is expliciet verboden binnen mijn vakgebied",
  ),
  disabledProfileOption("weet_niet_hoe", "Ik weet niet hoe ik moet beginnen"),
] satisfies SurveyOption[];

export const dataAwarenessOptions = [
  disabledProfileOption(
    "ja_controle",
    "Ja, ik controleer voorwaarden over privacy en data-opslag",
  ),
  disabledProfileOption(
    "gedeeltelijk",
    "Gedeeltelijk, ik weet dat data opgeslagen kan worden",
  ),
  disabledProfileOption(
    "nee_prive",
    "Nee, ik ga ervan uit dat mijn gegevens prive blijven",
  ),
  disabledProfileOption(
    "nee_niet_verdiept",
    "Nee, ik heb me hier nog niet in verdiept",
  ),
] satisfies SurveyOption[];

export const anonymizationBehaviorOptions = [
  disabledProfileOption("altijd", "Ja, altijd"),
  disabledProfileOption("soms", "Soms, als de informatie gevoelig is"),
  disabledProfileOption("nooit", "Nee, ik voer de informatie direct in"),
  disabledProfileOption(
    "wist_niet",
    "Ik wist niet dat dit nodig of mogelijk was",
  ),
] satisfies SurveyOption[];

export const browserExtensionUsageOptions = [
  disabledProfileOption("ja_bewust", "Ja, ik gebruik deze bewust"),
  disabledProfileOption(
    "ja_onzeker",
    "Ik heb ze geinstalleerd, maar weet niet zeker of ze meekijken",
  ),
  disabledProfileOption("nee", "Nee, ik gebruik geen AI-extensies"),
  disabledProfileOption("weet_niet", "Ik weet niet precies wat dit zijn"),
] satisfies SurveyOption[];

export const automationUsageOptions = [
  disabledProfileOption(
    "alleen_chatbot",
    "Nee, ik gebruik AI alleen als chatbot",
  ),
  disabledProfileOption(
    "agents_reeks_taken",
    "Ja, ik experimenteer met agents die taken uitvoeren",
  ),
  disabledProfileOption(
    "gekoppeld_apps",
    "Ja, ik heb AI gekoppeld aan andere apps",
  ),
  disabledProfileOption(
    "weet_niet_zeker",
    "Ik weet niet zeker of mijn tools zelfstandig werken",
  ),
] satisfies SurveyOption[];

export const aiPolicyAwarenessOptions = [
  disabledProfileOption("ja_goed", "Ja, ik weet goed wat er wel en niet mag"),
  disabledProfileOption("vaag", "Vaag bekend, ik heb er iets over gehoord"),
  disabledProfileOption("nee", "Nee, ik weet niet of er afspraken zijn"),
  disabledProfileOption(
    "geen_beleid",
    "Voor zover ik weet is er nog geen beleid",
  ),
] satisfies SurveyOption[];

export const aiSkillLevelOptions = [
  disabledProfileOption("beginner", "Beginner"),
  disabledProfileOption("gemiddeld", "Gemiddeld"),
  disabledProfileOption("gevorderd", "Gevorderd"),
  disabledProfileOption("expert", "Expert"),
] satisfies SurveyOption[];

export const processingOutputOptions = [
  disabledProfileOption(
    "direct_overnemen",
    "Ik neem de resultaten meestal direct over",
  ),
  disabledProfileOption(
    "controle_handmatig",
    "Ik controleer feiten en informatie handmatig",
  ),
  disabledProfileOption(
    "ruwe_opzet",
    "Ik gebruik output als ruwe opzet of inspiratie",
  ),
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
