# AI Literacy - advies cesuur, slagingskans en didactische media

## Aanbevolen balans

De gouden balans voor een gemiddelde Nederlandse MKB-cursist is: kort, concreet, bewijsbaar en herstelbaar. De cursus moet aantonen dat iemand veilig met AI kan werken, maar niet voelen als een juridische of technische vakopleiding.

Mijn advies:

- Totale leertijd: 2,5 tot 3,25 uur, inclusief assessment.
- Verplichte pagina's: 14 van 15 blijft goed; P14 optioneel houden.
- Algemene cesuur: 75%.
- Kritische competenties: C4 privacy/data en C6 human oversight op minimaal 80%.
- C8 escalatie/bewijsvoering: belangrijk, maar niet als losse derde blocker. Laat C8 meetellen in P8, P13 en P15.
- Completion gates: P8, P13 en P15. Maak P11 evidence, maar geen harde gate.
- Herkansing: directe herkansing voor objectieve vragen; maximaal 2 assessmentpogingen voordat remediatie nodig is.
- Doel-slagingskans: 80-90% na eerste serieuze poging, 90-95% na gerichte feedback/herkansing.

Waarom niet alles op 80%? Omdat de doelgroep breed is. Een algemene 80%-drempel maakt de cursus snel te streng voor medewerkers die AI beperkt gebruiken, terwijl de echte risico's vooral zitten in privacy/data, human oversight en escalatiegedrag. Die moet je wel stevig toetsen.

## Aanbevolen certificeringslogica

1. Alle verplichte pagina's afgerond.
2. P8 scenario gehaald.
3. P13 case_lab voldoende of goedgekeurd.
4. P15 assessment minimaal 75%.
5. C4 privacy minimaal 80%.
6. C6 human oversight minimaal 80%.
7. Geen openstaande manual review op required evidence.

Aanpassing t.o.v. huidige repo: zet de algemene `passing_threshold` voor AI Literacy naar 75, verwijder C8 als losse kritische blocker, en maak P11 niet `required_for_certificate` tenzij je bewust vier gates wilt.

## Didactische media en gamification per pagina

| Pagina | Huidige rol | Toevoegen | Waarom | Maakbaar door Codex/ChatGPT | Outsourcen |
|---|---|---|---|---|---|
| P1 Welkom en wat is AI? | Orientatie en basisbegrip | Korte animatie van 45-60 sec + 3 kenniskaarten | Verlaagt instapdrempel, maakt AI concreet | Script, storyboard, simpele illustraties, voice-over tekst | Professionele animatie/voice-over |
| P2 Wat telt als AI? | Herkennen in werkcontext | Interactieve "AI of niet?" sorteeropdracht | Actieve herkenning werkt beter dan uitleg lezen | Oefening, voorbeelden, feedbackteksten | Niet nodig |
| P3 Jouw startpunt | Zelfdiagnose | Persoonlijk risicoprofiel na reflectie | Motiveert omdat cursist eigen werk herkent | Profielregels, feedback, badges | Niet nodig |
| P4 EU AI Act gewone taal | Juridisch kader | Risicopiramide infographic + tijdlijn Article 4 | Maakt abstracte wetgeving scanbaar | Infographic-data, tekst, SVG/HTML visual | Juridische eindcheck |
| P5 Verboden/hoog-risico/transparantie | Risicodenken | Mini-scenario's met rode-vlag feedback | Oefenen met herkenning zonder juridisch jargon | Scenario's, feedback, quizlogica | Juridische review van cases |
| P6 Privacy/AVG/klantdata | C4 basis | Datakaart: groen/oranje/rood voorbeelden | Privacy moet in concrete datatypes landen | Datakaarten, checklist, quiz | Privacy/DPO validatie |
| P7 Veilig prompten | Promptveiligheid | Prompt make-over: onveilig naar veilig | Direct toepasbaar in werk | Voorbeelden, slide deck, downloadbare promptkaart | Niet nodig, eventueel DPO review |
| P8 Scenario prompt | C4 gate | Vertakte case met 3 beslismomenten en feedback | Sterke evidence zonder lange toets | Scenarioflow, rubrics, UI copy | DPO/juridische review |
| P9 AI kan fout zitten | Outputkritiek | Korte video of animatie met "plausibel maar fout" voorbeeld | Dit blijft beter hangen met demonstratie | Script, voorbeeldcase, quiz | Video-opname/montage optioneel |
| P10 Output controleren | Controleproces | Interactieve tijdlijn/checkflow | Geeft routine: bron, feit, toon, bias, besluit | Timeline, checklist, download | Niet nodig |
| P11 Controleprotocol | Eigen werkafspraken | Invulbaar protocol + badge "controlelus gemaakt" | Transfer naar dagelijks werk | Template, rubric, voorbeeldantwoorden | Niet nodig |
| P12 Human oversight | C6 basis | HITL/HOTL/HIC visual + beslisboom | Begrippen worden snel verward | Visual, beslisboom, kenniskaarten | Juridische/AI governance review |
| P13 GroeiKompas case | C6 gate | Case lab met rolkaarten en score-rubric | Meet echte toepassing, niet alleen kennis | Case, rubric, feedback, reviewer checklist | Expert review HR/privacy |
| P14 Rolgerichte mini-cases | Optionele transfer | Kies-je-rol cases + bonus badge | Houdt cursus haalbaar maar relevant | Cases per afdeling, badge copy | Niet nodig |
| P15 Assessment | Summatief | Scorekaart per competentie + remediatielinks | Verhoogt slagingskans zonder norm te verlagen | Scorefeedback, herkansingsadvies | Juridische/DPO review van eindvragen |

## Gamification die past bij MKB

Gebruik lichte gamification, geen spelshow. Het doel is motivatie en duidelijkheid.

- Progressie per onderwerp: 6 onderwerp-checkpoints.
- Competentiebadges C1-C8: "aangetoond", "nog oefenen", "review nodig".
- Streak of voortgangsbalk per sessie, maar geen drukmiddel.
- Scenariofeedback direct na keuze: veilig, twijfel, stop/escaleren.
- Remediatiekaarten: bij fout op C4 direct terug naar P6/P7/P8.
- Bonusbadge voor P14, omdat die optioneel is.
- Certificaat-preview: laat zien welke evidence nog ontbreekt.

Niet doen:

- Leaderboards tussen medewerkers.
- Te veel punten of munten.
- Lange open reflecties zonder voorbeeldantwoord.
- Meer dan 2 of 3 harde gates voor foundation.

## Productieregie: wie maakt wat?

Codex kan goed maken:

- Interactieve blocks in de repo.
- Infographics als HTML/CSS/SVG of eenvoudige generated bitmap.
- Timelines, checklists, scorekaarten, badges en dashboards.
- Scenarioflows, rubrics, feedbackteksten en remediatielogica.
- Downloadbare templates en Excel/CSV-overzichten.

ChatGPT kan goed maken:

- Scripts voor microvideo's.
- Storyboards en slide decks.
- Voorbeeldcases per branche/rol.
- Toetsvragen, distractors en feedback.
- Alternatieve uitleg op B1/B2-taalniveau.

Outsourcen of laten reviewen:

- Juridische eindvalidatie EU AI Act/AVG.
- DPO/privacy review op data-voorbeelden.
- Professionele animatie/video/motion design als het merkwaardig strak moet.
- Voice-over door mens of professionele AI-voice met licentie.
- HR/case validatie bij personeelsmonitoring en hoog-risico voorbeelden.

## Prioriteit

Fase 1 - meeste impact, weinig complexiteit:

1. Cesuur aanpassen naar 75% algemeen, C4/C6 80%.
2. C8 uit losse blocker halen.
3. P11 van harde gate naar formatieve evidence.
4. P2 sorteeropdracht, P6 datakaarten, P10 checkflow, P12 beslisboom.
5. Scorekaart met remediatielinks in P15.

Fase 2 - meer didactische rijkdom:

1. P1 korte animatie.
2. P4 risicopiramide + AI Act tijdlijn.
3. P8 vertakte scenario-case.
4. P13 GroeiKompas case lab met rolkaarten.
5. P14 optionele rolcases met bonusbadge.

Fase 3 - polish:

1. Professionele video/voice-over.
2. Juridische eindredactie.
3. DPO validatie.
4. Analytics op slagingspercentage, uitvalpagina's en herkansingen.
