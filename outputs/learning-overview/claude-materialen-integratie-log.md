# Claude-materialen integratie-log

De 12 aangeleverde Claude-materialen zijn geintegreerd als native learning blocks, niet als losse iframe/HTML. Daardoor blijven mobiele styling, voortgang, evidence en toegankelijkheid binnen het learning system.

## AI Literacy

| Materiaal | Module/pagina | Integratie |
|---|---|---|
| 01 Risicopiramide | P4 `transparantie` | Bestaande risicopiramide-afbeelding aangevuld met accordion `p4-risk-pyramid-layers`. |
| 02 HITL/HOTL/HIC | P12 `human-in-the-loop` | Bestaande vergelijking aangevuld met scenario `p12-oversight-scenario`. |
| 03 Controlelus tijdlijn | P10 `output-controleren` | Was al aanwezig als 6-stappen timeline `p10-timeline`. |
| 04 Veilig prompten slides | P7 `prompting-basics-veilig-gebruik` | Slide deck `p7-slides` inhoudelijk aangescherpt met zichtbare notes, MCQ en reflecties. |
| 05 Wel/geen AI schema | P2 `wat-telt-als-ai` | Toegevoegd als classificatie-scenario `p2-ai-classifier`. |
| 06 Privacy data-matrix | P6 `privacy-klantdata` | Toegevoegd als knowledge cards `p6-data-matrix`. |
| 07 Verboden/hoog-risico/transparantie | P5 `verboden-vs-toegestaan` | Toegevoegd als accordion `p5-risk-columns`. |

## AI Proficiency

| Materiaal | Module/pagina | Integratie |
|---|---|---|
| 08 Prompting slides | P03 `prompten-met-context-grenzen-en-kwaliteitseisen` | Toegevoegd als slide deck `p03-prompting-slides`. |
| 09 Verificatietijdlijn | P04 `output-controleren-voor-gebruik` | Toegevoegd als timeline `p04-verification-timeline`. |
| 10 Dataclassificatie matrix | P05 `data-veilig-invoeren-of-juist-niet` | Toegevoegd als 2x2 knowledge cards `p05-data-classification-matrix`. |
| 11 Use-case framing slides | P02 `goede-use-case-slechte-use-case` | Toegevoegd als slide deck `p02-use-case-framing-slides`. |
| 12 Toolkeuze & promptsanering | P06 `werken-met-tools-instellingen-en-grenzen` | Toegevoegd als slide deck `p06-toolkeuze-promptsanering-slides` met toolkeuze, promptsanering en twee gate-scenario's. |

## Player-aanpassing

`SlideDeckPlayer` toont nu ook `slide.notes`. Daardoor zijn tekstuele slides bruikbaar met de bestaande placeholdervisuals en hoeven de Claude HTML-slides niet als aparte iframes te worden meegesleept.

## Verificatie

- `npm --workspaces --if-present run typecheck`: geslaagd.
- Lokale render `http://127.0.0.1:3012/learning/ai-literacy-foundation/prompting-basics-veilig-gebruik`: 200, slide notes zichtbaar.
- Lokale render `http://127.0.0.1:3012/learning/ai-proficiency/goede-use-case-slechte-use-case`: 200, use-case deck zichtbaar.
- Mobiele Playwright-check op 390px voor beide routes: geen horizontale overflow, geen console/page errors.
