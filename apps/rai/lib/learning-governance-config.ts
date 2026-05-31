import type {
  LearningCefrLevel,
  LearningReviewTag,
  LearningRolePathId,
  LearningRolePathRequirement,
  LearningSourceStatus,
  ReviewRubricCriterion,
} from "@digidactics/domain/learning";

export interface LearningSourceReference {
  id: string;
  title: string;
  url: string;
  status: LearningSourceStatus;
  checked_at: string;
  use_for: string;
  note: string;
}

export interface LearningRolePathConfig {
  id: LearningRolePathId;
  title: string;
  requirement: LearningRolePathRequirement;
  audience: string;
  focus: string[];
}

export interface EvidenceDossierField {
  id: string;
  label: string;
  purpose: string;
  dpo_decision_needed?: boolean;
}

export const LEARNING_SOURCE_REFERENCES: LearningSourceReference[] = [
  {
    id: "SRC-EU-AIACT-NL",
    title: "EUR-Lex: Verordening (EU) 2024/1689, NL tekst",
    url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj?locale=nl",
    status: "current_law",
    checked_at: "2026-05-29",
    use_for: "Article 4, provider/deployer, AI-geletterdheid, GPAI, sandbox",
    note: "Gebruik als geldende tekst totdat een Omnibus-wijziging formeel is aangenomen en gepubliceerd.",
  },
  {
    id: "SRC-EC-QA",
    title: "European Commission: AI Literacy Questions & Answers",
    url: "https://digital-strategy.ec.europa.eu/en/faqs/ai-literacy-questions-answers",
    status: "official_guidance",
    checked_at: "2026-05-29",
    use_for: "AI literacy minimuminhoud, other persons, interne records, risicogebaseerde invulling",
    note: "Officiele guidance, geen vervanging van juridisch advies.",
  },
  {
    id: "SRC-EP-OMNIBUS",
    title: "European Parliament: AI Act simplification provisional deal",
    url: "https://www.europarl.europa.eu/news/en/press-room/20260427IPR42011/",
    status: "provisional_agreement",
    checked_at: "2026-05-29",
    use_for: "Voorlopige high-risk deadlines, watermarking, nudifier/CSAM-ban",
    note: "Alleen gebruiken met provisional label tot formele adoptie/publicatie.",
  },
  {
    id: "SRC-COUNCIL-OMNIBUS",
    title: "Council of the EU: AI simplification provisional agreement",
    url: "https://www.consilium.europa.eu/en/press/press-releases/2026/05/07/artificial-intelligence-council-and-parliament-agree-to-simplify-and-streamline-rules/",
    status: "provisional_agreement",
    checked_at: "2026-05-29",
    use_for: "Voorlopige Omnibus-status, high-risk data en volgende stappen",
    note: "Bevestigt dat formele adoptie en juridische revisie nog volgen.",
  },
  {
    id: "SRC-RIJK-TOEZICHT",
    title: "Rijksoverheid: toezicht op Europese AI-regels",
    url: "https://www.rijksoverheid.nl/actueel/nieuws/2026/04/20/kabinet-zet-stap-met-toezicht-op-europese-ai-regels",
    status: "draft_national_law",
    checked_at: "2026-05-29",
    use_for: "Voorgenomen Nederlandse toezichtstructuur, AP/RDI coordinerende rol",
    note: "Formuleer als voorgenomen/concept totdat de Uitvoeringswet definitief is.",
  },
  {
    id: "SRC-UAIV",
    title: "Internetconsultatie: Uitvoeringswet AI-verordening",
    url: "https://www.internetconsultatie.nl/uaiv",
    status: "draft_national_law",
    checked_at: "2026-05-29",
    use_for: "Nederlandse uitvoering, operatorrollen en markttoezicht",
    note: "Monitor opvolgende Kamerstukken na consultatie.",
  },
];

export const COURSE_LANGUAGE_TARGETS: Record<string, { target_cefr: LearningCefrLevel; review_note: string }> = {
  "ai-literacy-foundation": {
    target_cefr: "B1+",
    review_note: "Korte zinnen, concrete voorbeelden, weinig juridische abstractie.",
  },
  "ai-proficiency": {
    target_cefr: "B1+",
    review_note: "B1/B2: praktische vaktaal mag, maar elke methode moet met voorbeeld worden uitgelegd.",
  },
  "ai-mastery": {
    target_cefr: "B2",
    review_note: "B2 toegestaan voor governance, maar definities en artefacten blijven MKB-concreet.",
  },
};

export const AI_PROFICIENCY_ROLE_PATHS: LearningRolePathConfig[] = [
  {
    id: "core",
    title: "Kernpad",
    requirement: "core_required",
    audience: "Iedere Proficiency-cursist",
    focus: ["taakframing", "datagrens", "promptkwaliteit", "outputcontrole", "escalatie"],
  },
  {
    id: "hr",
    title: "HR",
    requirement: "role_required",
    audience: "HR, recruitment, leidinggevenden met personele besluiten",
    focus: ["bias", "sollicitanten", "beoordeling", "menselijke eindbeslissing", "DPO/HR-review"],
  },
  {
    id: "finance",
    title: "Finance",
    requirement: "role_required",
    audience: "Finance, control, administratie met financiele impact",
    focus: ["broncontrole", "cijfers", "aannames", "fout-asymmetrie", "vier-ogencontrole"],
  },
  {
    id: "marketing",
    title: "Marketing en sales",
    requirement: "role_optional",
    audience: "Marketing, sales, communicatie",
    focus: ["claims", "transparantie", "toestemming", "merktoon", "misleiding voorkomen"],
  },
  {
    id: "support",
    title: "Support",
    requirement: "role_optional",
    audience: "Klantcontact en support",
    focus: ["beleid", "klantimpact", "samenvatten", "escalatie", "geen ongewenste toezeggingen"],
  },
  {
    id: "operations",
    title: "Operations",
    requirement: "role_optional",
    audience: "Operations, planning, procesverbetering",
    focus: ["workflow", "fallback", "datagrenzen", "besluitmomenten", "reviewritme"],
  },
];

export const DPO_REVIEW_CHECKLIST: Array<{
  id: string;
  label: string;
  tags: LearningReviewTag[];
  decision_needed: string;
}> = [
  {
    id: "data-minimisation",
    label: "Dataminimalisatie en anonimisering",
    tags: ["privacy", "dpo"],
    decision_needed: "Welke inputcategorieen mogen in goedgekeurde tools en welke nooit?",
  },
  {
    id: "hr-impact",
    label: "HR- en personele impact",
    tags: ["hr", "privacy", "dpo"],
    decision_needed: "Welke HR-use cases zijn verboden, hoog-risico of alleen met specialistische review toegestaan?",
  },
  {
    id: "toolscope",
    label: "Toolscope en publieke AI-tools",
    tags: ["toolscope", "security", "privacy"],
    decision_needed: "Welke tools zijn toegestaan per dataklasse en wie beheert uitzonderingen?",
  },
  {
    id: "evidence-dossier",
    label: "Evidence Dossier",
    tags: ["evidence_dossier", "privacy", "dpo"],
    decision_needed: "Welke velden, bewaartermijnen, inzagerechten en exportrechten gelden?",
  },
];

export const EVIDENCE_DOSSIER_FIELDS: EvidenceDossierField[] = [
  { id: "learner_id", label: "Cursist-ID", purpose: "Koppelt voortgang en certificaat aan de juiste gebruiker.", dpo_decision_needed: true },
  { id: "org_id", label: "Organisatie-ID", purpose: "Scheidt bewijs per organisatie.", dpo_decision_needed: true },
  { id: "course_code", label: "Cursuscode", purpose: "Laat zien welke module is gevolgd." },
  { id: "course_version", label: "Cursusversie", purpose: "Maakt bewijs reproduceerbaar bij contentwijzigingen." },
  { id: "started_at", label: "Startdatum", purpose: "Toont deelnameperiode." },
  { id: "completed_at", label: "Afronddatum", purpose: "Toont voltooiing." },
  { id: "attempts", label: "Attempts", purpose: "Bewijst toets- en oefenpogingen; bewaartermijn door DPO vaststellen.", dpo_decision_needed: true },
  { id: "score_summary", label: "Scoresamenvatting", purpose: "Onderbouwt cesuur zonder alle antwoorden onnodig breed te tonen.", dpo_decision_needed: true },
  { id: "manual_review_status", label: "Reviewstatus", purpose: "Laat zien of open antwoorden/cases zijn beoordeeld." },
  { id: "certificate_status", label: "Certificaatstatus", purpose: "Onderbouwt toegang tot vervolgmogelijkheden." },
  { id: "last_verified_at", label: "Laatst geverifieerd", purpose: "Toont wanneer bronnen/regels voor deze versie zijn gecontroleerd." },
];

export const SWAC_REVIEW_RUBRIC: ReviewRubricCriterion[] = [
  {
    id: "source",
    title: "Source",
    sufficient: "Bronnen, herleidbaarheid en actualiteit zijn benoemd.",
    strong: "De learner onderscheidt interne bronnen, externe bronnen en onzekerheden.",
    hard_fail: "Claims worden zonder broncontrole overgenomen.",
  },
  {
    id: "workflow",
    title: "Workflow",
    sufficient: "Procesmoment, reviewer en stop-/escalatiemoment zijn duidelijk.",
    strong: "Controle is ingebouwd waar de fout impact kan krijgen.",
    hard_fail: "AI-output wordt buiten procescontrole gebruikt.",
  },
  {
    id: "accuracy",
    title: "Accuracy",
    sufficient: "Feiten, cijfers, datums en conclusies worden gecontroleerd.",
    strong: "De learner koppelt controlezwaarte aan foutkans en impact.",
    hard_fail: "Professionele toon wordt als bewijs van juistheid gezien.",
  },
  {
    id: "compliance",
    title: "Compliance",
    sufficient: "Privacy, beleid, bevoegdheid en transparantie zijn meegewogen.",
    strong: "De learner benoemt expliciet wanneer DPO/legal/security nodig is.",
    hard_fail: "Gevoelige data of impactvolle output wordt zonder review gebruikt.",
  },
];

export const ERROR_ASYMMETRY_RUBRIC: ReviewRubricCriterion[] = [
  {
    id: "probability-impact",
    title: "Foutkans x impact",
    sufficient: "Foutkans en impact worden apart benoemd.",
    strong: "De learner kiest reviewzwaarte proportioneel op basis van beide factoren.",
    hard_fail: "Alleen snelheid of gemak bepaalt de keuze.",
  },
  {
    id: "stop-or-review",
    title: "Stoppen of reviewen",
    sufficient: "Bij hoge impact wordt extra review of stop gekozen.",
    strong: "De learner noemt concreet wie reviewt en wat de stopcriteria zijn.",
    hard_fail: "Hoge-impact AI gaat door als losse prompt zonder waarborgen.",
  },
];

export const FRIA_QMS_RUBRIC: ReviewRubricCriterion[] = [
  {
    id: "fria-input",
    title: "FRIA-input",
    sufficient: "Doel, doelgroep, betrokkenenimpact, data en mitigaties zijn verzameld.",
    strong: "De input is bruikbaar voor juridische/compliance-review en niet alleen beschrijvend.",
    hard_fail: "Impact op personen of rechten ontbreekt.",
  },
  {
    id: "qms-controls",
    title: "QMS-controls",
    sufficient: "Owner, change management, testcriteria en incidentproces zijn benoemd.",
    strong: "Controls zijn gekoppeld aan periodieke review en managementbesluit.",
    hard_fail: "Geen beheer na livegang.",
  },
  {
    id: "sandbox-intake",
    title: "Sandbox/intake",
    sufficient: "Onzekerheden en toetsvragen zijn expliciet gemaakt.",
    strong: "De learner beschrijft testopzet, bewijs en vragen aan toezichthouder of expert.",
    hard_fail: "Innovatieve of onzekere toepassing gaat live zonder voorafgaande toetsing.",
  },
];
