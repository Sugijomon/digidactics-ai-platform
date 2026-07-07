# Rijke HTML-embeds in het learning system

Interactieve HTML-artefacten kunnen als `iframe`-block in een lespagina worden geplaatst. Zet in de editor **Interactie vereist** aan als de embed moet meetellen voor voortgang of certificeringsbewijs.

De lesson player toont embeds in de normale contentkolom. Ontwerp nieuwe artefacten daarom voor ongeveer **600-648px breedte**: geen vaste desktop-layout van 900px, geen twee kolommen boven 580px en geen horizontale scroll. De player injecteert voor same-origin embeds een kleine fit-CSS en meet de hoogte automatisch op, maar het beste resultaat komt van artefacten die zelf compact zijn ontworpen.

## Completion-event

Laat het HTML-bestand na een betekenisvolle actie dit bericht naar de lesson player sturen:

```html
<script>
  function completeDigiDacticsBlock(blockId, answer) {
    window.parent.postMessage(
      {
        type: "digidactics_event",
        event: "block_complete",
        blockId,
        answer: answer || "completed",
      },
      "*"
    );
  }

  // Voorbeeld: na het afronden van een kaart, scenario of quiz.
  document.querySelector("[data-complete]")?.addEventListener("click", function () {
    completeDigiDacticsBlock("BLOCK_ID_HIER", {
      choice: "veilig",
      completedAt: new Date().toISOString(),
    });
  });
</script>
```

Gebruik `event: "answer_submitted"` als de embed een inhoudelijk antwoord terugstuurt. De lesson player bewaart de payload als antwoordbewijs bij het block.

## Blockinstellingen

Minimaal nodig in de block-JSON:

```json
{
  "id": "p7-veilig-prompten-embed",
  "type": "iframe",
  "title": "Veilig prompten oefening",
  "url": "/uploads/learning/veilig-prompten.html",
  "height": 620,
  "evidence_kind": "self_check",
  "required_for_certificate": true
}
```

Als `evidence_kind` op `none` staat, wordt de embed alleen getoond en blokkeert hij de knop **Volgende** niet.

## Huidige plaatsing

De Claude HTML-artefacten staan als statische assets in `apps/rai/public/learning/artefacts`.

| Module | Lespagina | Artefact | Status |
|---|---|---|---|
| AI Literacy | `wat-telt-als-ai` | `05-wel-geen-ai-schema.html` | Tonen |
| AI Literacy | `transparantie` | `01-risicopiramide.html` | Tonen |
| AI Literacy | `verboden-vs-toegestaan` | `07-verboden-hoog-risico-transparantie.html` | Tonen |
| AI Literacy | `privacy-klantdata` | `06-privacy-data-matrix.html` | Tonen |
| AI Literacy | `prompting-basics-veilig-gebruik` | `04-veilig-prompten-slides.html` | Tonen |
| AI Literacy | `output-controleren` | `03-controlelus-tijdlijn.html` | Tonen |
| AI Literacy | `human-in-the-loop` | `02-hitl-hotl-hic.html` | Tonen |
| AI Proficiency | `goede-use-case-slechte-use-case` | `11-use-case-framing-slides.html` | Tonen |
| AI Proficiency | `prompten-met-context-grenzen-en-kwaliteitseisen` | `08-prompting-slides.html` | Tonen |
| AI Proficiency | `output-controleren-voor-gebruik` | `09-verificatie-tijdlijn.html` | Tonen |
| AI Proficiency | `data-veilig-invoeren-of-juist-niet` | `10-dataclassificatie-matrix.html` | Tonen |
| AI Proficiency | `werken-met-tools-instellingen-en-grenzen` | `12-toolkeuze-promptsanering-slides.html` | Tonen |
| AI Mastery | `use-case-triage-op-waarde-risico-en-haalbaarheid` | `13-triage-matrix.html` | Tonen |
| AI Mastery | `rollen-gebruiker-deployer-provider-owner` | `14-ketendiagram-rollen.html` | Tonen |
| AI Mastery | `override-sampling-vier-ogen-en-stopcriteria` | `16-controle-interventies-tijdlijn.html` | Tonen |
| AI Mastery | `datakwaliteit-representativiteit-en-bias` | `18-datakwaliteit-bias-kaarten.html` | Tonen |
| AI Mastery | `monitoring-logs-en-incidenten` | `15-monitoringcyclus-tijdlijn.html` | Tonen |
| AI Mastery | `transparantie-en-betrokkenencommunicatie` | `17-disclosure-slides.html` | Tonen |

De certificaat-animaties `19`, `20` en `21` zijn meegekopieerd naar dezelfde assetmap, maar nog niet als lespagina-iframe geplaatst. Die horen inhoudelijk bij de certificaat/succesweergave.

In development gebruikt de lesson player live Supabase IDs/progress, maar rendert hij de repo-content over matchende pagina-codes heen. Daardoor zie je wijzigingen uit deze bronbestanden direct terug, ook als de Supabase content-audit nog niet opnieuw is gesynchroniseerd.
