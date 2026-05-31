import type { AiLiteracyTopicSeed } from "./learning-preview-data";
import { ERROR_ASYMMETRY_RUBRIC, SWAC_REVIEW_RUBRIC } from "./learning-governance-config";

export const aiProficiencyCourseTopicSeeds: AiLiteracyTopicSeed[] = [
  {
    code: "aipro-slim-kiezen",
    title: "Slim kiezen en kaderen",
    summary: "Van losse AI-tool naar bewuste taakselectie, doel, datagrens en succescriteria.",
    pages: [
      {
        code: "van-ai-tool-naar-werktaak",
        title: "Van AI-tool naar werktaak",
        summary: "Positioneer Proficiency: niet meer alleen veilig weten, maar verantwoord toepassen.",
        type: "content",
        minutes: 15,
        blocks: [
          {
            id: "p01-hero",
            type: "hero",
            title: "Waarom AI Proficiency?",
            subtitle: "Je gaat van basisveiligheid naar taakbekwaamheid: AI inzetten waar het past, met controle waar het moet.",
          },
          {
            id: "p01-context",
            type: "paragraph",
            markdown:
              "AI Proficiency is voor medewerkers die AI regelmatig gebruiken in werkprocessen. Je leert niet alleen hoe je een prompt schrijft, maar ook hoe je vooraf bepaalt of AI geschikt is, welke data je mag gebruiken en hoe je output controleert voordat die het werkproces ingaat.",
          },
          {
            id: "p01-selfcheck",
            type: "progress_check",
            question: "Ik gebruik AI al bewust met doel, datagrens en controle.",
            scale: 5,
            label_low: "Nog nauwelijks",
            label_high: "Structureel",
            show_labels: true,
          },
          {
            id: "p01-takeaways",
            type: "key_takeaways",
            title: "Drie gedragsregels",
            items: [
              "Begin met de werktaak, niet met de tool.",
              "Bepaal vooraf welke data, impact en controle nodig zijn.",
              "Gebruik AI-output pas na menselijke beoordeling.",
            ],
          },
        ],
      },
      {
        code: "goede-use-case-slechte-use-case",
        title: "Goede use case, slechte use case",
        summary: "Herken wanneer AI passend is en wanneer je beter begrenst, uitstelt of escaleert.",
        type: "content",
        minutes: 30,
        blocks: [
          {
            id: "p02-heading",
            type: "heading",
            text: "Taakselectie voorkomt veel AI-risico",
            level: 2,
          },
          {
            id: "p02-use-case-framing-slides",
            type: "slide_deck",
            title: "Use-case framing: van idee naar taakbrief",
            show_thumbnails: true,
            slides: [
              {
                id: "s1",
                title: "Wat is een taakbrief?",
                url: "/learning/slide-placeholder.svg",
                alt: "Slide over taakbrief",
                notes:
                  "Voor je AI inzet, beschrijf je eerst de taak. Wat wil je bereiken, voor wie is de output, welke data mag je gebruiken en hoe controleer je succes?",
                interaction: { type: "none" },
              },
              {
                id: "s2",
                title: "Wat ontbreekt hier?",
                url: "/learning/slide-placeholder.svg",
                alt: "Slide met onvolledige use case",
                notes:
                  "Een losse wens als 'laat AI klantmails doen' mist doel, datagrens, impact, controle en eigenaarschap. Zonder framing lijkt AI sneller dan het veilig is.",
                interaction: {
                  type: "multiple_choice",
                  question: "Wat ontbreekt meestal in een slechte use-case beschrijving?",
                  options: [
                    { id: "tool", label: "Alleen de naam van de AI-tool", is_correct: false },
                    { id: "frame", label: "Doel, data, impact en controle", is_correct: true },
                    { id: "color", label: "Een mooi dashboard", is_correct: false },
                  ],
                  feedback_correct: "Precies. Framing maakt de taak controleerbaar.",
                },
              },
              {
                id: "s3",
                title: "Dezelfde taak, met taakbrief",
                url: "/learning/slide-placeholder.svg",
                alt: "Slide met voorbeeld taakbrief",
                notes:
                  "Een goede taakbrief benoemt doel, gebruikers, inputdata, verboden data, gewenste output, controlecriteria, menselijke review en stopcriteria.",
                interaction: { type: "none" },
              },
              {
                id: "s4",
                title: "Check voor je AI inzet",
                url: "/learning/slide-placeholder.svg",
                alt: "Slide met preflight check",
                notes:
                  "De preflight-check: past AI bij deze taak, is de data toegestaan, kan een mens output beoordelen en is de impact beheersbaar?",
                interaction: { type: "none" },
              },
              {
                id: "s5",
                title: "Schrijf jouw eigen taakbrief",
                url: "/learning/slide-placeholder.svg",
                alt: "Slide met eigen oefening",
                notes:
                  "Kies een taak uit je werk en schrijf een compacte taakbrief met doel, data, outputvorm, controle en escalatiepunt.",
                interaction: {
                  type: "reflection",
                  prompt: "Schrijf een taakbrief voor een AI-taak uit jouw werk.",
                  placeholder: "Doel... Data... Output... Controle... Escalatie...",
                },
              },
            ],
          },
          {
            id: "p02-comparison",
            type: "comparison",
            title: "Geschikt versus ongeschikt gebruik",
            left_label: "Meestal geschikt",
            right_label: "Niet zonder extra waarborgen",
            left_items: [
              "Een eerste concepttekst maken",
              "Interne notities samenvatten",
              "Ideeen structureren",
              "Controlelijst of planning opstellen",
            ],
            right_items: [
              "Automatisch selecteren of afwijzen van personen",
              "Klant- of HR-data in een publieke tool invoeren",
              "Besluiten met juridische of financiele impact automatiseren",
              "AI-output zonder broncheck doorsturen",
            ],
            left_color: "#e7f8f5",
            right_color: "#fff1f2",
          },
          {
            id: "p02-error-asymmetry",
            type: "knowledge_cards",
            target_cefr: "B1+",
            review_rubric: ERROR_ASYMMETRY_RUBRIC,
            cards: [
              {
                id: "low-low",
                title: "Lage foutkans, lage impact",
                text: "Gebruik AI als hulpmiddel en controleer licht: toon, feiten en bruikbaarheid.",
              },
              {
                id: "high-low",
                title: "Hogere foutkans, lage impact",
                text: "Verbeter prompt, context en voorbeelden. Gebruik output pas na eigen check.",
              },
              {
                id: "low-high",
                title: "Lage foutkans, hoge impact",
                text: "Ook zeldzame fouten kunnen zwaar wegen. Gebruik vaste review, vier-ogencontrole of expertcheck.",
              },
              {
                id: "high-high",
                title: "Hoge foutkans, hoge impact",
                text: "Stop of herontwerp de use case. Dit hoort niet als losse medewerkerprompt in het proces.",
              },
            ],
          },
          {
            id: "p02-scenario",
            type: "scenario",
            situation:
              "Je team wil AI gebruiken om binnenkomende klantvragen automatisch urgentie te geven. Sommige klanten kunnen hierdoor later geholpen worden.",
            question: "Wat is de beste eerste stap?",
            choices: [
              {
                id: "direct",
                label: "Direct testen met echte klantvragen.",
                consequence: "Je gebruikt impactvolle klantdata zonder duidelijke controle of doelgrens.",
                is_recommended: false,
              },
              {
                id: "frame",
                label: "Eerst doel, impact, datagrens en menselijke review bepalen.",
                consequence: "Je maakt de use case controleerbaar voordat je gaat experimenteren.",
                is_recommended: true,
              },
            ],
          },
          {
            id: "p02-reflection",
            type: "reflection",
            prompt: "Noem een taak uit jouw werk die goed past bij AI en een taak waarbij je AI juist zou begrenzen.",
            placeholder: "AI past goed bij... Ik zou begrenzen bij...",
            min_words: 35,
            save_personal: true,
          },
        ],
      },
    ],
  },
  {
    code: "aipro-prompting-kwaliteit",
    title: "Prompting en kwaliteitscontrole",
    summary: "Betere output door betere context, duidelijke criteria en consequente verificatie.",
    pages: [
      {
        code: "prompten-met-context-grenzen-en-kwaliteitseisen",
        title: "Prompten met context, grenzen en kwaliteitseisen",
        summary: "Bouw prompts met rol, context, outputvorm, bronnenkader en controlecriteria.",
        type: "content",
        minutes: 35,
        blocks: [
          {
            id: "p03-hero",
            type: "hero",
            title: "Beter prompten is beter sturen",
            subtitle: "Een goede prompt maakt zichtbaar wat je wilt, wat niet mag en hoe de output beoordeeld wordt.",
          },
          {
            id: "p03-prompting-slides",
            type: "slide_deck",
            review_required: true,
            review_tags: ["privacy", "dpo", "toolscope"],
            target_cefr: "B1+",
            title: "Prompting met context en criteria",
            show_thumbnails: true,
            slides: [
              {
                id: "s1",
                title: "De anatomie van een goede prompt",
                url: "/learning/slide-placeholder.svg",
                alt: "Slide over promptanatomie",
                notes:
                  "Een effectieve prompt bevat rol, context, taak, outputvorm en controle-instructie. Niet alle vijf zijn altijd even uitgebreid nodig, maar je kiest ze bewust.",
                interaction: { type: "none" },
              },
              {
                id: "s2",
                title: "Zwakke versus sterke prompt",
                url: "/learning/slide-placeholder.svg",
                alt: "Slide met zwakke en sterke prompt",
                notes:
                  "Een zwakke prompt vraagt om 'maak een samenvatting'. Een sterke prompt noemt doelgroep, doel, grenzen, structuur, toon en wat de gebruiker straks controleert.",
                interaction: { type: "none" },
              },
              {
                id: "s3",
                title: "Welke prompt is het sterkst?",
                url: "/learning/slide-placeholder.svg",
                alt: "Slide met meerkeuze promptvraag",
                notes:
                  "Kies de prompt die concreet is, geen persoonsgegevens gebruikt en controleerbare output vraagt.",
                interaction: {
                  type: "multiple_choice",
                  question: "Welke prompt is het sterkst voor een interne samenvatting?",
                  options: [
                    { id: "a", label: "Schrijf een samenvatting van onze vergadering.", is_correct: false },
                    { id: "b", label: "Maak een samenvatting. Het ging over Q3-cijfers en teamuitbreiding.", is_correct: false },
                    {
                      id: "c",
                      label:
                        "Schrijf een zakelijke samenvatting van max. 200 woorden met beslissingen, actiepunten en vervolgstap. Gebruik geen namen.",
                      is_correct: true,
                    },
                  ],
                  feedback_correct: "Goed: doel, vorm, grenzen en privacy zijn zichtbaar.",
                  feedback_incorrect: "Maak de prompt concreter en voeg privacy- en controlegrenzen toe.",
                },
              },
              {
                id: "s4",
                title: "Vier MKB-promptpatronen",
                url: "/learning/slide-placeholder.svg",
                alt: "Slide met promptpatronen",
                notes:
                  "Gebruik patronen voor conceptmail, samenvatting, checklist en analyse. Vul steeds doel, context, datagrens en controlecriteria in.",
                interaction: { type: "none" },
              },
              {
                id: "s5",
                title: "Drie prompts die vaak mislukken",
                url: "/learning/slide-placeholder.svg",
                alt: "Slide met anti-patronen",
                notes:
                  "Te vaag, te veel data of geen controle-instructie. Deze patronen leiden tot onveilige of oncontroleerbare output.",
                interaction: { type: "none" },
              },
              {
                id: "s6",
                title: "Schrijf jouw eigen prompt",
                url: "/learning/slide-placeholder.svg",
                alt: "Slide met eigen promptoefening",
                notes:
                  "Pas de vijf elementen toe op een echte taak uit jouw werk. Gebruik geen persoonsgegevens en formuleer hoe jij de output controleert.",
                interaction: {
                  type: "reflection",
                  prompt: "Schrijf een prompt voor een eigen werktaak met rol, context, taak, outputvorm en controle-instructie.",
                  placeholder: "Rol... Context... Taak... Output... Controle...",
                },
              },
            ],
          },
          {
            id: "p03-conversational-loop",
            type: "knowledge_cards",
            cards: [
              {
                id: "ask",
                title: "1. Vraag gericht",
                text: "Start met doel, context, grenzen, outputvorm en controlecriteria.",
              },
              {
                id: "evaluate",
                title: "2. Beoordeel de output",
                text: "Zoek ontbrekende aannames, onduidelijke claims, privacyrisico's en toonproblemen.",
              },
              {
                id: "refine",
                title: "3. Stuur bij",
                text: "Geef feedback, voeg criteria toe en vraag om alternatieven of beperkingen.",
              },
              {
                id: "verify",
                title: "4. Verifieer en leg vast",
                text: "Controleer feiten, bronbasis en impact. Gebruik belangrijke output pas na menselijke beoordeling.",
              },
            ],
          },
          {
            id: "p03-cards",
            type: "knowledge_cards",
            cards: [
              { id: "rol", title: "Rol", text: "Welke expertise of toon moet de tool aannemen?" },
              { id: "context", title: "Context", text: "Welke achtergrond is nodig, zonder onnodige data te delen?" },
              { id: "output", title: "Outputvorm", text: "Welke lengte, structuur, doelgroep en taal zijn nodig?" },
              { id: "grenzen", title: "Grenzen", text: "Wat mag de tool niet doen, invullen of aannemen?" },
              { id: "criteria", title: "Checkcriteria", text: "Waar toets jij straks de output op?" },
            ],
          },
          {
            id: "p03-short-answer",
            type: "short_answer",
            question:
              "Herschrijf deze zwakke prompt: 'Maak een mail naar de klant'. Voeg doel, context, grens en controlecriterium toe.",
            placeholder: "Maak een klantmail voor...",
            min_words: 35,
            guidance: "Let op: gebruik geen echte klantgegevens. Werk met geanonimiseerde context.",
          },
          {
            id: "p03-download",
            type: "download",
            title: "Promptcanvas v1",
            description: "Gebruik dit canvas om taak, context, datagrens, outputvorm en controlepunten vast te leggen.",
            label: "Template",
            button_label: "Open promptcanvas",
          },
        ],
      },
      {
        code: "output-controleren-voor-gebruik",
        title: "Output controleren voor je iets gebruikt",
        summary: "Verifieer feitelijkheid, bronbasis, toon, impact en privacy voordat output wordt ingezet.",
        type: "question",
        minutes: 35,
        blocks: [
          {
            id: "p04-heading",
            type: "heading",
            text: "Vier controlelagen",
            level: 2,
          },
          {
            id: "p04-verification-timeline",
            type: "timeline",
            title: "Output verifieren en verbeteren",
            items: [
              {
                id: "facts",
                date: "1",
                title: "Feiten checken",
                description: "Controleer cijfers, namen, definities, datums en conclusies.",
                highlight: true,
              },
              {
                id: "sources",
                date: "2",
                title: "Bronnen verifieren",
                description: "Zoek claims terug in betrouwbare bronnen of interne documenten.",
                highlight: true,
              },
              {
                id: "tone",
                date: "3",
                title: "Toon beoordelen",
                description: "Past de tekst bij klant, collega, kanaal, beleid en situatie?",
                highlight: false,
              },
              {
                id: "bias",
                date: "4",
                title: "Bias scannen",
                description: "Let op scheve aannames, stereotypering of onterechte prioritering.",
                highlight: false,
              },
              {
                id: "current",
                date: "5",
                title: "Actualiteit checken",
                description: "Controleer of informatie niet verouderd is en of context ontbreekt.",
                highlight: false,
              },
            ],
          },
          {
            id: "p04-swac",
            type: "knowledge_cards",
            target_cefr: "B1+",
            review_rubric: SWAC_REVIEW_RUBRIC,
            cards: [
              {
                id: "source",
                title: "Source",
                text: "Waar komt de informatie vandaan? Controleer bronnen, herleidbaarheid en actualiteit.",
              },
              {
                id: "workflow",
                title: "Workflow",
                text: "Waar in het proces wordt AI gebruikt, wie controleert en waar kan iemand stoppen of overrulen?",
              },
              {
                id: "accuracy",
                title: "Accuracy",
                text: "Klopt de output feitelijk, inhoudelijk en in toon? Test vooral claims met impact.",
              },
              {
                id: "compliance",
                title: "Compliance",
                text: "Past het gebruik bij beleid, privacyregels, AI-risico, transparantie en bevoegdheden?",
              },
            ],
          },
          {
            id: "p04-accordion",
            type: "accordion",
            title: "Waar controleer je op?",
            allow_multiple_open: true,
            items: [
              { id: "feit", question: "Feitcheck", answer: "Controleer cijfers, namen, datums, definities en conclusies." },
              { id: "bron", question: "Broncheck", answer: "Vraag je af of claims herleidbaar zijn naar betrouwbare bronnen." },
              { id: "toon", question: "Tooncheck", answer: "Past de formulering bij klant, collega, beleid en situatie?" },
              { id: "impact", question: "Impactcheck", answer: "Kan deze output iemand benadelen, misleiden of te veel sturen?" },
            ],
          },
          {
            id: "p04-scenario",
            type: "scenario",
            situation:
              "AI schrijft een overtuigende interne update, maar noemt een fiscale regel die jij niet herkent.",
            question: "Wat doe je?",
            choices: [
              {
                id: "send",
                label: "Doorsturen, want de tekst klinkt professioneel.",
                consequence: "Professionele toon is geen bewijs van juistheid.",
                is_recommended: false,
              },
              {
                id: "verify",
                label: "Controleren bij betrouwbare bron of expert en de claim aanpassen of verwijderen.",
                consequence: "Je voorkomt dat een hallucinatie onderdeel wordt van het werkproces.",
                is_recommended: true,
              },
            ],
          },
          {
            id: "p04-quiz",
            type: "quiz_multiple_choice",
            question: "Wat is een rode vlag voor hallucinatie?",
            options: [
              { id: "summary", label: "De output is een korte samenvatting." },
              { id: "source", label: "De output noemt een bron of wetsartikel dat niet blijkt te bestaan." },
              { id: "bullets", label: "De output gebruikt bullets." },
            ],
            correct_option_id: "source",
            explanation: "Verzonnen bronnen, namen of regels zijn klassieke signalen dat verificatie nodig is.",
          },
        ],
      },
    ],
  },
  {
    code: "aipro-data-tools",
    title: "Veilig met data en tools",
    summary: "Privacy-, vertrouwelijkheids- en toolingkeuzes maken voordat je AI gebruikt.",
    pages: [
      {
        code: "data-veilig-invoeren-of-juist-niet",
        title: "Data veilig invoeren of juist niet",
        summary: "Classificeer data en bepaal wat in een prompt thuishoort.",
        type: "content",
        minutes: 30,
        blocks: [
          {
            id: "p05-hero",
            type: "hero",
            title: "Niet alles hoort in een prompt",
            subtitle: "Dataminimalisatie is een praktische vaardigheid: gebruik alleen wat nodig en toegestaan is.",
          },
          {
            id: "p05-comparison",
            type: "comparison",
            title: "Dataclassificatie voor AI-gebruik",
            left_label: "Lager risico",
            right_label: "Hoger risico",
            left_items: ["Openbare informatie", "Algemene procesbeschrijvingen", "Geanonimiseerde voorbeelden"],
            right_items: ["Klantdossiers", "HR-informatie", "Bijzondere persoonsgegevens", "Contracten of interne strategie"],
            left_color: "#e7f8f5",
            right_color: "#fff1f2",
          },
          {
            id: "p05-data-classification-matrix",
            type: "knowledge_cards",
            review_required: true,
            review_tags: ["privacy", "dpo", "toolscope"],
            target_cefr: "B1+",
            cards: [
              {
                id: "public-no-pii",
                title: "Openbaar + geen persoonsgegevens",
                text: "Meestal geschikt voor publieke of goedgekeurde tools. Controleer nog steeds bron, actualiteit en doel.",
              },
              {
                id: "public-pii",
                title: "Openbaar + persoonsgegevens",
                text: "Eerst beoordelen of de persoon herleidbaar is en of verwerking nodig, rechtmatig en proportioneel is.",
              },
              {
                id: "confidential-no-pii",
                title: "Vertrouwelijk + geen persoonsgegevens",
                text: "Alleen in goedgekeurde zakelijke omgeving binnen beleid. Let op bedrijfsgeheimen, contracten en strategie.",
              },
              {
                id: "confidential-pii",
                title: "Vertrouwelijk + persoonsgegevens",
                text: "Hoogste voorzichtigheid: minimaliseren, scope checken, DPO/privacy/security of proceseigenaar betrekken.",
              },
            ],
          },
          {
            id: "p05-checklist",
            type: "checklist",
            title: "Prompt-sanitatie voor invoer",
            items: [
              { id: "need", label: "Ik heb bepaald welke informatie echt nodig is.", required: true },
              { id: "remove", label: "Ik heb namen, nummers en herleidbare details verwijderd waar mogelijk.", required: true },
              { id: "tool", label: "Ik gebruik een goedgekeurde tool voor interne of gevoelige data.", required: true },
              { id: "doubt", label: "Bij twijfel vraag ik leidinggevende, DPO, privacy of security.", required: true },
            ],
            require_all: true,
          },
          {
            id: "p05-callout",
            type: "callout",
            tone: "warning",
            markdown:
              "Gebruik geen klant-, HR-, medische, financiele of andere gevoelige data in publieke AI-tools zonder expliciete toestemming en passende waarborgen.",
          },
        ],
      },
      {
        code: "werken-met-tools-instellingen-en-grenzen",
        title: "Werken met tools, instellingen en grenzen",
        summary: "Kies tooling op beleid, accounttype, dataretentie, logging en eigenaarschap.",
        type: "content",
        minutes: 30,
        blocks: [
          {
            id: "p06-heading",
            type: "heading",
            text: "Goedgekeurde tools en uitzonderingen",
            level: 2,
          },
          {
            id: "p06-paragraph",
            type: "paragraph",
            markdown:
              "Dezelfde taak kan veilig of onveilig zijn afhankelijk van de tool, workspace, accountinstellingen en dataretentie. Controleer daarom niet alleen wat je prompt, maar ook waar je prompt.",
          },
          {
            id: "p06-toolkeuze-promptsanering-slides",
            type: "slide_deck",
            review_required: true,
            review_tags: ["privacy", "dpo", "toolscope", "security"],
            target_cefr: "B1+",
            title: "Toolkeuze en promptsanering",
            show_thumbnails: true,
            slides: [
              {
                id: "s1",
                title: "Welke tool voor welke data?",
                url: "/learning/slide-placeholder.svg",
                alt: "Slide over toolkeuze",
                notes:
                  "Niet elke AI-tool is geschikt voor elke data. Kijk naar organisatiebeleid, verwerkersafspraken, accounttype, data-opslag, logging en of de tool binnen scope is goedgekeurd.",
                interaction: { type: "none" },
              },
              {
                id: "s2",
                title: "Wat is promptsanering?",
                url: "/learning/slide-placeholder.svg",
                alt: "Slide over promptsanering",
                notes:
                  "Promptsanering is het bewust verwijderen of vervangen van gevoelige informatie voordat je een prompt verstuurt. De taak blijft uitvoerbaar zonder onnodige privacy- of vertrouwelijkheidsrisico's.",
                interaction: { type: "none" },
              },
              {
                id: "s3",
                title: "Gate scenario: klantmail",
                url: "/learning/slide-placeholder.svg",
                alt: "Slide met klantmail scenario",
                notes:
                  "Klantmail met naam, e-mail en bestelnummer: gebruik geen publieke tool, verwijder herleidbare details en werk alleen binnen een goedgekeurde workspace als de scope dat toestaat.",
                interaction: {
                  type: "multiple_choice",
                  question: "Wat is de juiste aanpak bij een klantmail met naam, e-mail en bestelnummer?",
                  options: [
                    { id: "full", label: "Volledig plakken in de goedgekeurde workspace.", is_correct: false },
                    { id: "public", label: "Alleen naam verwijderen en publieke tool gebruiken.", is_correct: false },
                    {
                      id: "sanitize",
                      label: "Herleidbare details verwijderen en goedgekeurde workspace binnen scope gebruiken.",
                      is_correct: true,
                    },
                  ],
                  feedback_correct: "Goed: toolstatus, scope en dataminimalisatie zijn alle drie nodig.",
                  feedback_incorrect: "Controleer niet alleen de tool, maar ook data, scope en herleidbaarheid.",
                },
              },
              {
                id: "s4",
                title: "Gate scenario: HR-tekst",
                url: "/learning/slide-placeholder.svg",
                alt: "Slide met HR scenario",
                notes:
                  "Een goedgekeurde tool is niet automatisch goedgekeurd voor HR-data. Als HR-data buiten scope valt, gebruik je die niet en betrek je HR/privacy of de proceseigenaar.",
                interaction: {
                  type: "reflection",
                  prompt: "Wat moet een leidinggevende doen als HR-data buiten de toolscope valt?",
                  placeholder: "De juiste aanpak is...",
                },
              },
            ],
          },
          {
            id: "p06-accordion",
            type: "accordion",
            title: "Vier vragen voor toolkeuze",
            allow_multiple_open: true,
            items: [
              { id: "approved", question: "Is de tool organisatie-goedgekeurd?", answer: "Gebruik bij voorkeur de omgeving die door je organisatie is beoordeeld." },
              { id: "retention", question: "Wat gebeurt er met data?", answer: "Let op opslag, training op input, logging en toegang door derden." },
              { id: "workspace", question: "Werk ik in het juiste account?", answer: "Een prive-account is iets anders dan een beheerde zakelijke workspace." },
              { id: "exception", question: "Wanneer is uitzondering nodig?", answer: "Escaleren als data gevoelig is of impact op personen ontstaat." },
            ],
          },
          {
            id: "p06-reflection",
            type: "reflection",
            prompt: "Welke AI-tool gebruik jij het meest en weet je of deze voor jouw data en taak is goedgekeurd?",
            placeholder: "Ik gebruik vooral... Ik weet/niet weet...",
            min_words: 25,
            save_personal: true,
          },
        ],
      },
    ],
  },
  {
    code: "aipro-rolgerichte-toepassing",
    title: "Rolgerichte toepassing",
    summary: "Oefen realistische MKB-cases in klantcontact, marketing, administratie, HR, finance en operations.",
    pages: [
      {
        code: "ai-in-klantcontact-sales-en-marketing",
        title: "AI in klantcontact, sales en marketing",
        summary: "Gebruik AI voor externe communicatie zonder beleid, beloftes of klantimpact te vergeten.",
        type: "case",
        minutes: 30,
        blocks: [
          {
            id: "p07-case",
            type: "case_lab",
            title: "Externe communicatie beoordelen",
            markdown:
              "Je krijgt een klachtmail, een campagne-idee en een FAQ-concept. Bepaal waar AI mag helpen, welke data je weglaat en welke output door een mens gecontroleerd moet worden voordat die extern gebruikt wordt.",
            reflection_prompt:
              "Welke controle voorkomt dat AI ongewenste toezeggingen doet of klantcontext verkeerd interpreteert?",
          },
          {
            id: "p07-role-pathways",
            type: "accordion",
            role_path_ids: ["hr", "finance", "marketing", "support", "operations"],
            role_path_requirement: "role_optional",
            review_required: true,
            review_tags: ["privacy", "dpo", "hr", "finance"],
            target_cefr: "B1+",
            title: "Rolspecifieke accenten",
            allow_multiple_open: true,
            items: [
              {
                id: "hr",
                question: "HR",
                answer:
                  "Gebruik AI niet als zelfstandige beoordelaar. Let op sollicitanten, beoordelingen, bias, gevoelige data, transparantie en menselijke eindbeslissing.",
              },
              {
                id: "finance",
                question: "Finance",
                answer:
                  "Controleer cijfers, bronnen, datums, aannames en bevoegdheid. Fout-asymmetrie is vaak hoog bij rapportages, facturen en prognoses.",
              },
              {
                id: "marketing",
                question: "Marketing en sales",
                answer:
                  "Controleer claims, doelgroep, toestemming, merkrichtlijnen, transparantie en ongewenste beloftes.",
              },
              {
                id: "support",
                question: "Support",
                answer:
                  "Laat AI helpen met samenvatten of conceptantwoorden, maar borg beleid, klantimpact, uitzonderingen en escalatie.",
              },
              {
                id: "operations",
                question: "Operations",
                answer:
                  "Gebruik AI voor planning, analyse en werkinstructies met duidelijke datagrenzen, controlepunten en fallback bij twijfel.",
              },
            ],
          },
          {
            id: "p07-callout",
            type: "callout",
            tone: "info",
            markdown:
              "Bij externe communicatie is toon belangrijk, maar juistheid, bevoegdheid en beleid zijn belangrijker.",
          },
          {
            id: "p07-takeaways",
            type: "key_takeaways",
            title: "Voor klantgerichte rollen",
            items: [
              "Laat AI geen toezeggingen doen buiten beleid.",
              "Controleer claims, prijzen, voorwaarden en juridische formuleringen.",
              "Gebruik geanonimiseerde voorbeelden tenzij een goedgekeurde omgeving anders toestaat.",
            ],
          },
        ],
      },
      {
        code: "ai-in-administratie-hr-finance-en-operations",
        title: "AI in administratie, HR, finance en operations",
        summary: "Oefen met interne taken waar menselijke eindverantwoordelijkheid zichtbaar moet blijven.",
        type: "case",
        minutes: 30,
        blocks: [
          {
            id: "p08-case",
            type: "case_lab",
            role_path_ids: ["hr", "finance", "operations"],
            role_path_requirement: "role_required",
            review_required: true,
            review_tags: ["privacy", "dpo", "hr", "finance"],
            target_cefr: "B1+",
            title: "Interne workflow met impact",
            markdown:
              "Je gebruikt AI om notulen samen te vatten, spreadsheetregels uit te leggen en een HR-concepttekst te verbeteren. Bepaal per taak wat AI mag doen, wat jij controleert en waar het besluit bij een mens blijft.",
            reflection_prompt:
              "Waar kan AI ondersteunen zonder dat het feitelijk de beslissing neemt?",
          },
          {
            id: "p08-comparison",
            type: "comparison",
            title: "Ondersteunen versus beslissen",
            left_label: "AI ondersteunt",
            right_label: "Mens beslist",
            left_items: ["Concepten maken", "Informatie ordenen", "Risico's signaleren", "Alternatieven formuleren"],
            right_items: ["Beoordeling vaststellen", "Klant of medewerker informeren", "Uitzondering goedkeuren", "Escalatie afwegen"],
            left_color: "#e7f5ff",
            right_color: "#e7f8f5",
          },
          {
            id: "p08-callout",
            type: "callout",
            tone: "warning",
            markdown:
              "Laat AI nooit zelfstandig beslissen over sollicitanten, beoordelingen, klantrechten of financiele uitzonderingen.",
          },
        ],
      },
    ],
  },
  {
    code: "aipro-oversight-bewijs",
    title: "Oversight, escalatie en bewijs",
    summary: "Menselijke controle, twijfel, logging en escalatie concreet maken in dagelijkse AI-taken.",
    pages: [
      {
        code: "hitl-hotl-hic-en-escaleren-bij-twijfel",
        title: "HITL, HOTL, HIC en escaleren bij twijfel",
        summary: "Kies passende menselijke controle en leg twijfel of afwijking compact vast.",
        type: "content",
        minutes: 25,
        blocks: [
          {
            id: "p09-cards",
            type: "knowledge_cards",
            cards: [
              { id: "hitl", title: "Human in the loop", text: "Een mens keurt output goed voordat die gebruikt wordt." },
              { id: "hotl", title: "Human on the loop", text: "Een mens monitort het proces en grijpt in bij signalen." },
              { id: "hic", title: "Human in command", text: "Een mens bepaalt doel, grenzen, stopcriteria en verantwoordelijkheid." },
            ],
          },
          {
            id: "p09-timeline",
            type: "timeline",
            title: "Escalatiepad",
            items: [
              { id: "signal", date: "1", title: "Signaleren", description: "Je ziet fout, bias, datarisico of impact.", highlight: true },
              { id: "stop", date: "2", title: "Stoppen", description: "Gebruik de output niet automatisch.", highlight: false },
              { id: "ask", date: "3", title: "Escaleren", description: "Betrek leidinggevende, DPO, security of proceseigenaar.", highlight: false },
              { id: "log", date: "4", title: "Vastleggen", description: "Noteer wat gebeurde en welke keuze is gemaakt.", highlight: false },
              { id: "resume", date: "5", title: "Hervatten of afwijzen", description: "Ga alleen door met onderbouwde controle.", highlight: false },
            ],
          },
          {
            id: "p09-scenario",
            type: "scenario",
            situation:
              "AI stelt voor een klant minder coulance te geven op basis van een onduidelijke risicoscore.",
            question: "Welke controle past het best?",
            choices: [
              {
                id: "auto",
                label: "De score volgen, want AI heeft meer data gezien.",
                consequence: "Dit vergroot automation bias en kan klantimpact hebben.",
                is_recommended: false,
              },
              {
                id: "review",
                label: "Menselijke beoordeling vragen, onderliggende data controleren en beslissing vastleggen.",
                consequence: "Je houdt menselijke eindverantwoordelijkheid en traceerbaarheid.",
                is_recommended: true,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    code: "aipro-afronding",
    title: "Afronding en certificering",
    summary: "Toon taakgerichte toepassing met scenario's, praktijkcase, rubric en intern bewijs.",
    pages: [
      {
        code: "proficiency-scenario-assessment",
        title: "Proficiency scenario-assessment",
        summary: "Toets de kernbeslissingen rond taakkeuze, data, controle en escalatie.",
        type: "assessment",
        minutes: 25,
        blocks: [
          {
            id: "p10-mcq",
            type: "quiz_multiple_choice",
            question: "Wat is de beste eerste stap voor een nieuwe AI-taak?",
            options: [
              { id: "prompt", label: "Meteen prompten om te zien wat eruit komt." },
              { id: "frame", label: "Taak, impact, data en controle bepalen." },
              { id: "copy", label: "Een prompt uit een vorige taak kopieren." },
              { id: "share", label: "De output direct delen met het team." },
            ],
            correct_option_id: "frame",
            explanation: "Proficiency start met framing. Tool en prompt komen daarna.",
          },
          {
            id: "p10-ms",
            type: "quiz_multiple_select",
            question: "Welke controlelagen horen bij verantwoord AI-gebruik?",
            options: [
              { id: "fact", label: "Feitcheck" },
              { id: "source", label: "Broncheck" },
              { id: "impact", label: "Impactcheck" },
              { id: "looks", label: "Alleen kijken of het professioneel oogt" },
            ],
            correct_option_ids: ["fact", "source", "impact"],
            explanation: "Professionele toon is geen controlelaag.",
          },
          {
            id: "p10-tf",
            type: "quiz_true_false",
            question: "Bij externe klantcommunicatie blijft menselijke eindverantwoordelijkheid nodig.",
            correct_answer: true,
            explanation: "AI kan ondersteunen, maar de medewerker blijft verantwoordelijk voor gebruik.",
          },
          {
            id: "p10-short",
            type: "short_answer",
            question: "Noem twee redenen waarom een HR-concept extra controle nodig heeft.",
            placeholder: "Bij HR is extra controle nodig omdat...",
            min_words: 25,
            guidance: "Denk aan impact op personen, bias, vertrouwelijkheid en menselijke beslissing.",
          },
        ],
      },
      {
        code: "praktijkcase-proficiency",
        title: "Praktijkcase Proficiency",
        summary: "Werk een complete taakcyclus uit: prompt, controle, datagrens, escalatie en log.",
        type: "case",
        minutes: 30,
        blocks: [
          {
            id: "p11-case",
            type: "case_lab",
            title: "Servicemeldingen naar klantupdate",
            markdown:
              "Een operations-medewerker maakt uit geanonimiseerde servicemeldingen een klantupdate en intern verbeterpunt. Werk de taak uit van doel en prompt tot outputcontrole, escalatiebesluit en kort log.",
            reflection_prompt:
              "Motiveer welke data je gebruikt, welke controles je uitvoert en wanneer je niet zonder review zou doorgaan.",
            reviewer_guidance:
              "Beoordeel of de learner de hele taakcyclus beheerst: doel, datagrens, promptkwaliteit, outputcontrole, oversight en log. Keur af bij onveilige data-invoer of blind vertrouwen op AI-output.",
            evidence_items: [
              "Taakdoel en succescriteria zijn expliciet.",
              "Datagrens en anonimisering zijn concreet benoemd.",
              "Prompt bevat context, outputvorm en kwaliteitscriteria.",
              "Feit-, bron-, toon- en impactcheck zijn zichtbaar.",
              "Escalatie- of vrijgavebesluit is gemotiveerd.",
            ],
            review_rubric: [
              {
                id: "task-framing",
                title: "Taakframing",
                sufficient: "Doel, context en succescriteria zijn begrijpelijk en toepasbaar.",
                strong: "Impactniveau en randvoorwaarden zijn scherp afgebakend.",
                hard_fail: "Geen duidelijk doel of AI wordt ingezet zonder taakbegrenzing.",
              },
              {
                id: "safe-data",
                title: "Veilige datahantering",
                sufficient: "Data is passend geminimaliseerd of geanonimiseerd.",
                strong: "De learner motiveert ook waarom bepaalde data niet wordt gebruikt.",
                hard_fail: "Klant-, HR- of gevoelige data wordt onveilig ingevoerd.",
              },
              {
                id: "output-control",
                title: "Outputcontrole",
                sufficient: "Relevante controles op feiten, bronnen, toon en impact zijn benoemd.",
                strong: "Controle is gekoppeld aan risico en vervolgactie.",
                hard_fail: "AI-output wordt zonder verificatie gebruikt.",
              },
              {
                id: "oversight-log",
                title: "Oversight en log",
                sufficient: "Menselijke review en escalatiebesluit zijn navolgbaar vastgelegd.",
                strong: "Het log is compact, auditbaar en bruikbaar voor overdracht.",
                hard_fail: "Geen menselijke verantwoordelijkheid of escalatie bij twijfel.",
              },
            ],
          },
          {
            id: "p11-checklist",
            type: "checklist",
            title: "Minimale evidence",
            items: [
              "Taakdoel en succescriteria",
              "Datagrens en anonimisering",
              "Prompt met context en kwaliteitscriteria",
              "Feit-, bron-, toon- en impactcheck",
              "Escalatie- of vrijgavebesluit",
            ],
            require_all: true,
          },
          {
            id: "p11-rubric",
            type: "knowledge_cards",
            cards: [
              { id: "framing", title: "Taakframing", text: "Doel, context, criteria en impactniveau zijn helder." },
              { id: "data", title: "Veilige data", text: "Data is passend, geminimaliseerd en zo nodig geanonimiseerd." },
              { id: "control", title: "Outputcontrole", text: "Controle is aantoonbaar en risicogericht." },
              { id: "oversight", title: "Oversight", text: "Menselijke beoordeling en escalatie zijn logisch gemotiveerd." },
            ],
          },
        ],
      },
      {
        code: "resultaat-en-bewijsregistratie",
        title: "Resultaat en bewijsregistratie",
        summary: "Duid de betekenis van het interne Proficiency-bewijs en de vervolgstap.",
        type: "content",
        minutes: 10,
        blocks: [
          {
            id: "p12-hero",
            type: "hero",
            title: "AI Proficiency behaald",
            subtitle: "Je laat zien dat je AI taakgericht, veilig en controleerbaar kunt toepassen.",
          },
          {
            id: "p12-disclaimer",
            type: "callout",
            tone: "info",
            markdown:
              "Dit is een interne bekwaamheidsaanduiding. Het is geen externe licentie, geen wettelijk certificaat en geen bewijs dat een AI-systeem zelf compliant is.",
          },
          {
            id: "p12-takeaways",
            type: "key_takeaways",
            title: "Wat wordt vastgelegd",
            items: [
              "Voltooide pagina's en scenario's.",
              "Assessmentscore en eventuele herkansing.",
              "Praktijkcase, open antwoorden en rubric-evidence.",
              "Versie van cursus, beleid en assessment.",
            ],
          },
          {
            id: "p12-download",
            type: "download",
            title: "Persoonlijk bewijsrapport",
            description:
              "Samenvatting van je Proficiency-evidence voor intern gebruik: poging, score, open antwoorden, praktijkcase en reviewerbesluit.",
            label: "Rapport",
            button_label: "Bekijk bewijsrapport",
          },
        ],
      },
    ],
  },
];
