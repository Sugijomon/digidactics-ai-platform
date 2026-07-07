# Review Claude-materialen AI Literacy en Proficiency

Beoordeling op basis van de 12 aangeleverde HTML-prototypes in `C:\Users\Gebruiker\Desktop\Downloads\Edu contents AIL`.

## Samenvatting

De materialen zijn inhoudelijk bruikbaar en sluiten goed aan bij de beoogde leerroute. De beste set voor AI Literacy is 01 t/m 07. Materiaal 08 t/m 12 hoort vooral in AI Proficiency, met enkele onderdelen die optioneel of als remediatie in Literacy kunnen terugkomen.

Mijn advies: niet als losse HTML/iframe in productie hangen, maar omzetten naar native learning blocks (`image`, `comparison`, `timeline`, `slide_deck`, `scenario`, `case_lab`, `checklist`). Dan kunnen voortgang, evidence, toetsen en mobiele styling netjes meelopen met de learning player.

Belangrijkste technische bevindingen:

- Desktop: alle 12 laden zonder console errors.
- Mobiel: overflow bij 01, 05, 10 en interne card/table overflow bij 04, 08, 11, 12.
- Toegankelijkheid: alle prototypes gebruiken inline `onclick`; veel klikbare elementen zijn `div` in plaats van `button`.
- ARIA/keyboard: vrijwel afwezig. Voor productie tabs/steppers als semantische buttons of tablist bouwen.
- Fonts: alle prototypes laden Google Fonts extern. In de app liever bestaande fonts/design tokens gebruiken.

## Beoordeling per materiaal

| Nr | Materiaal | Plaats | Oordeel | Advies |
|---|---|---|---|---|
| 01 | Risicopiramide | Literacy P4 | Zeer bruikbaar | Overnemen als interactieve risicopiramide, maar mobiel ombouwen naar accordion/cards. |
| 02 | HITL/HOTL/HIC | Literacy P12 | Zeer bruikbaar | Overnemen als tabs + vergelijkingstabel; voeg beslisvraag toe. |
| 03 | Controlelus tijdlijn | Literacy P10 | Zeer bruikbaar | Overnemen als 6-stappen timeline/checkflow. |
| 04 | Veilig prompten slides | Literacy P7 | Bruikbaar | Overnemen, maar overlap met 08/12 bewaken en mobiel grid fixen. |
| 05 | Wel/geen AI schema | Literacy P2 | Bruikbaar | Sterke basis; omzetten naar sorteeropdracht of kaartvergelijking. |
| 06 | Privacy data-matrix | Literacy P6 | Zeer bruikbaar | Overnemen na DPO/privacy review; dit is kernmateriaal voor C4. |
| 07 | Verboden/hoog-risico/transparantie | Literacy P5 | Bruikbaar | Inhoudelijk goed, maar juridisch laten valideren en mobiel als tabs tonen. |
| 08 | Prompting slides | Proficiency P03 | Bruikbaar voor Proficiency | Niet in foundation als verplicht; eventueel als verdieping na P7. |
| 09 | Verificatietijdlijn | Proficiency P04 | Bruikbaar | Goed, maar overlapt met P10; positioneer als verdieping voor outputkwaliteit. |
| 10 | Dataclassificatie matrix | Proficiency P05 | Bruikbaar na herbouw | Concept goed, mobiele matrix moet anders. DPO-review nodig. |
| 11 | Use-case framing slides | Proficiency P02 | Zeer bruikbaar | Goed als brug naar RouteAI/use-case check; niet verplicht in Literacy. |
| 12 | Toolkeuze & promptsanering | Proficiency P06 gate | Zeer waardevol, maar gevoelig | Inhoud sterk; maak organisatie-instelbaar en laat DPO/juridisch reviewen. |

## Detailfeedback

### 01 - Risicopiramide

Bestemming: Literacy P4, `image`/`comparison`/interactief schema.

Bruikbaarheid: hoog. Dit helpt cursisten de EU AI Act-risicolagen sneller begrijpen dan platte tekst.

Sterk:

- Heldere vierlaagse structuur.
- Goede klikinteractie voor detailinformatie.
- Past goed bij P4 "De EU AI Act in gewone taal".

Aanpassen:

- Mobiel heeft horizontale overflow. Zet de piramide op mobiel om naar verticale cards of accordion.
- Klikbare lagen zijn `div` met `onclick`; maak er `button`-achtige controls van.
- Voeg korte MKB-voorbeelden toe per laag.
- Laat de juridische labels valideren, vooral "hoog risico" en verplichtingen.

Productieadvies: overnemen in AI Literacy.

### 02 - HITL/HOTL/HIC

Bestemming: Literacy P12, `comparison` + tabs.

Bruikbaarheid: hoog. Dit is precies de visualisatie die C6 nodig heeft.

Sterk:

- Goede keuze voor tabs; begrippen zijn compact vergelijkbaar.
- Desktop en mobiel laden zonder overflow.
- Past direct bij human oversight.

Aanpassen:

- Tabs semantisch maken met buttons/ARIA.
- Voeg een korte beslisvraag toe: "Welke oversight-vorm hoort bij deze situatie?"
- Geef concrete MKB-contexten: klantmail, offertecontrole, HR-signaal, voorraadadvies.

Productieadvies: overnemen en uitbreiden met 1 scenario-check.

### 03 - Controlelus tijdlijn

Bestemming: Literacy P10, `timeline`.

Bruikbaarheid: hoog. Goede routinevorming voor outputcontrole.

Sterk:

- 6 stappen passen goed bij een controleprotocol.
- Navigatie met vorige/volgende is duidelijk.
- Mobiel geen horizontale overflow.

Aanpassen:

- Maak elke stap afsluitbaar als checklist-item.
- Voeg "bewijs" toe: cursist kiest welke stap hij/zij in eigen werk vaak overslaat.
- Semantische step-buttons gebruiken.

Productieadvies: overnemen als native `timeline` + `checklist`.

### 04 - Veilig prompten slides

Bestemming: Literacy P7, `slide_deck`.

Bruikbaarheid: goed. Past bij veilig prompten en C4/C5/C8.

Sterk:

- 6 slides is een goede lengte.
- Bevat MCQ en reflectie.
- Goede combinatie van privacy, kwaliteit en escalatie.

Aanpassen:

- Er ontbreekt een echte `h1`; toevoegen voor toegankelijkheid.
- Mobiele cards hebben interne overflow. Cards op mobiel onder elkaar zetten.
- Maak duidelijker verschil tussen "publieke tool", "goedgekeurde zakelijke tool" en "organisatiebeleid".
- Niet te veel overlap met materiaal 08 en 12; P7 moet foundation blijven.

Productieadvies: overnemen, maar kort houden en vooral op veilige promptgrenzen richten.

### 05 - Wel/geen AI schema

Bestemming: Literacy P2, `comparison` of interactieve sorteeropdracht.

Bruikbaarheid: goed. Didactisch relevant voor C1/C2.

Sterk:

- Helpt herkennen wat AI wel/niet is in dagelijkse tools.
- Goede basis voor werkcontext.

Aanpassen:

- Mobiele tabel heeft overflow door naast-elkaar cellen.
- Beter maken als kaartspel: "AI", "niet AI", "twijfel/afhankelijk van werking".
- Voeg feedback toe waarom iets wel/niet AI is.
- Vermijd te harde uitspraken als werking afhangt van vendorconfiguratie.

Productieadvies: overnemen als interactieve classificatie-oefening, niet als statische tabel.

### 06 - Privacy data-matrix

Bestemming: Literacy P6, `comparison`, `checklist`, eventueel `knowledge_cards`.

Bruikbaarheid: zeer hoog. Dit is kernmateriaal voor C4.

Sterk:

- Concreet en herkenbaar voor MKB.
- Do/don't werkt goed.
- AVG-principes geven noodzakelijke achtergrond.

Aanpassen:

- DPO/privacy review nodig op formuleringen als "dit mag wel".
- Mobiele twee-koloms layout is krap; op mobiel onder elkaar tonen.
- Maak "mits goedgekeurde tool" expliciet zichtbaar bij alle groene voorbeelden.
- Vermijd de indruk dat anonimisering altijd makkelijk of voldoende is.

Productieadvies: zeker overnemen, maar juridisch/privacy laten valideren.

### 07 - Verboden, hoog-risico en transparantie

Bestemming: Literacy P5, `knowledge_cards`/`comparison`.

Bruikbaarheid: goed. Sluit aan bij C3 en C8.

Sterk:

- De drie kolommen maken categorieen scanbaar.
- Goede basis voor rode-vlag herkennen.

Aanpassen:

- Mobiel worden drie kolommen te smal. Zet om naar tabs of accordion.
- Juridische eindredactie nodig; EU AI Act-categorieen zijn gevoelig voor nuance.
- Voeg scenario-vragen toe: "Wat doe je als medewerker/deployer?"

Productieadvies: overnemen na juridische review en mobiele herbouw.

### 08 - Prompting slides

Bestemming: Proficiency P03.

Bruikbaarheid: goed voor vervolgopleiding. Voor Foundation is dit te veel als verplicht onderdeel.

Sterk:

- Goede anatomie van prompts.
- MCQ en eigen oefening zijn didactisch sterk.
- Nuttig voor medewerkers die actief met generatieve AI werken.

Aanpassen:

- Mobiele card-grid overflow. Cards responsive maken.
- Focus minder op "goede prompt" en meer op "veilige, controleerbare prompt" als het naar Literacy zou gaan.
- Kan als optionele verdieping na Literacy P7.

Productieadvies: behouden voor Proficiency; niet verplicht maken in AI Literacy.

### 09 - Verificatietijdlijn

Bestemming: Proficiency P04, eventueel remediatie bij Literacy P10.

Bruikbaarheid: goed, maar overlap met 03/P10.

Sterk:

- Compacte 5-stappen controle.
- Mobiel stabiel.
- Goed voor outputkwaliteit en verbetering.

Aanpassen:

- Positioneer als verdieping na de 6-stappen controlelus.
- Maak verschil met Literacy P10 helder: P10 = basiscontrole, P04 = verbeteren/verifiëren op niveau.
- Voeg bronbetrouwbaarheid en actualiteit sterker toe.

Productieadvies: in Proficiency houden; eventueel als remediatie-link bij lage C5-score.

### 10 - Dataclassificatie matrix

Bestemming: Proficiency P05, optionele verdieping bij Literacy P6.

Bruikbaarheid: goed concept, technisch nog niet productieklaar.

Sterk:

- 2x2 matrix is een goede manier om persoonsgegevens en vertrouwelijkheid te combineren.
- Sterk voor medewerkers die vaker AI gebruiken met bedrijfsinformatie.

Aanpassen:

- Mobiel heeft horizontale overflow.
- Matrix vraagt voorkennis; voor foundation liever data-kaarten gebruiken.
- DPO-review nodig, vooral bij "mag in publieke AI" en "eerst anonimiseren".
- Voeg organisatiestatus toe: publiek, intern, vertrouwelijk, bijzonder/HR.

Productieadvies: Proficiency-materiaal. Voor Literacy alleen vereenvoudigde versie.

### 11 - Use-case framing slides

Bestemming: Proficiency P02, eventueel voorbereiding op RouteAI use-case check.

Bruikbaarheid: zeer goed.

Sterk:

- Taakbrief is een helder mentaal model.
- Past goed bij AI use-case intake.
- Eigen taakbrief als oefening is praktisch.

Aanpassen:

- Mobiele kaartgrid heeft overflow; responsive maken.
- Voeg voorbeeld van slechte en goede taakbrief uit MKB-context toe.
- Koppel aan RouteAI: doel, data, risico, menselijk toezicht, outputcontrole.

Productieadvies: overnemen in Proficiency en later koppelen aan `routeai_usecase_check`.

### 12 - Toolkeuze & promptsanering

Bestemming: Proficiency P06 gate, eventueel remediatie voor Literacy P7/P8.

Bruikbaarheid: zeer waardevol, maar gevoelig.

Sterk:

- Combineert toolkeuze, data-scope en promptsanering.
- Gate-scenario's zijn didactisch sterk.
- HR-scenario is goed om te laten zien dat "goedgekeurde tool" niet betekent "alle data mag".

Aanpassen:

- Mobiele tabel is te breed; maak cards per tooltype.
- Organisatie-instelbaar maken: Microsoft/Google/ChatGPT/Claude niet hard coderen zonder beleid.
- DPO/juridische review nodig.
- Scenario A: nuanceer dat een goedgekeurde workspace soms klantdata mag verwerken binnen scope, maar dat dataminimalisatie nog steeds verplicht is.
- Scenario B: sterk, houden.

Productieadvies: Proficiency gate. Voor Literacy alleen een vereenvoudigd fragment in P7/P8.

## Aanbevolen plaatsing in huidige cursus

AI Literacy:

- P2: 05 als classificatie-oefening.
- P4: 01 als risicopiramide.
- P5: 07 als categorie-tabs + mini-scenario.
- P6: 06 als privacy/data cards.
- P7: 04 als veilig prompten slide deck.
- P10: 03 als controlelus timeline.
- P12: 02 als HITL/HOTL/HIC tabs.

AI Proficiency:

- P02: 11 use-case framing.
- P03: 08 prompting met context en criteria.
- P04: 09 verificatietijdlijn.
- P05: 10 dataclassificatie.
- P06: 12 toolkeuze en promptsanering gate.

## Implementatieadvies

Fase 1 - direct bruikbaar in AI Literacy:

1. 02 HITL/HOTL/HIC omzetten naar native tabs.
2. 03 Controlelus omzetten naar native timeline.
3. 06 Privacy data-matrix omzetten naar responsive cards.
4. 01 Risicopiramide omzetten naar mobile-first accordion/piramide.

Fase 2 - didactische verrijking:

1. 05 Wel/geen AI als sorteeropdracht.
2. 07 Verboden/hoog-risico/transparantie als tabs + scenario.
3. 04 Veilig prompten als kort slide deck met MCQ.

Fase 3 - Proficiency:

1. 11 Use-case framing.
2. 08 Prompting slides.
3. 09 Verificatietijdlijn.
4. 10 Dataclassificatie.
5. 12 Toolkeuze/promptsanering als gate.

## Wat Codex/ChatGPT kan doen

Codex:

- HTML-prototypes omzetten naar React/native learning blocks.
- Mobiele styling en toegankelijkheid verbeteren.
- Evidence metadata toevoegen (`competency_codes`, `evidence_kind`, `required_for_certificate`).
- Scenario's koppelen aan attempts en grading.
- Scorefeedback en remediatielinks bouwen.

ChatGPT/Claude:

- Extra MKB-voorbeelden.
- Kortere B1/B2-copy.
- Scenariofeedback en distractors.
- Scripts voor eventuele video/voice-over.

Outsourcen/reviewen:

- Juridische review EU AI Act-categorieen.
- DPO/privacy review op data- en promptvoorbeelden.
- Professionele animatie/video/voice-over.
- Organisatiespecifiek toolbeleid en verwerkersovereenkomsten.

## Eindoordeel

De materialen zijn meer dan schetsen: ze zijn inhoudelijk al bruikbaar als didactische bouwstenen. De grootste waarde zit in 01, 02, 03, 06 en 12. De grootste risico's zijn mobiel gedrag, toegankelijkheid, juridische/privacy-nuance en overlap tussen Literacy en Proficiency.

Advies: gebruik 01-07 om AI Literacy rijker te maken, maar houd foundation kort. Gebruik 08-12 als duidelijke Proficiency-laag, zodat gemotiveerde of risicovollere gebruikers kunnen verdiepen zonder de gemiddelde MKB-cursist te overbelasten.
