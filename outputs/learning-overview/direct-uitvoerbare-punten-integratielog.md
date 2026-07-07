# Direct uitvoerbare punten - integratielog

Datum: 2026-05-29

## Geimplementeerd

- Bronstatusmetadata toegevoegd aan juridische/provisionele cursusclaims:
  - `source_ids`
  - `source_status`
  - `last_verified_at`
  - `provisional`
  - `legal_review_required`
- Centrale bronlijst toegevoegd in `apps/rai/lib/learning-governance-config.ts`.
- DPO-reviewchecklist toegevoegd met tags voor privacy, HR, toolscope en Evidence Dossier.
- `review_required` metadata toegevoegd aan privacy-, promptsanering-, HR/finance/toolscope- en FRIA/QMS-blokken.
- B1/B2-taaldoelen vastgelegd per cursus:
  - AI Literacy: B1+
  - AI Proficiency: B1+
  - AI Mastery: B2
- Proficiency role path config toegevoegd voor core, HR, Finance, Marketing, Support en Operations.
- Rolpadmetadata toegevoegd aan Proficiency-blokken.
- Rubrics toegevoegd of geborgd voor:
  - fout-asymmetrie
  - SWAC
  - Mastery governance-case
  - FRIA/QMS/sandbox
- Evidence Dossier exportspecificatie toegevoegd in `docs/learning-evidence-dossier-spec.md`.
- Content audit uitgebreid met tellingen voor DPO/content review, legal review en provisionele claims.
- SQL/app-parity tests toegevoegd voor certificering en access gates.

## Bewust niet hard gemaakt

- Digital Omnibus en high-risk deadlines blijven als `provisional_agreement` gemarkeerd.
- Nederlandse toezichtverdeling blijft concept/voorgenomen totdat de Uitvoeringswet definitief is.
- Evidence Dossier bewaartermijnen, exportrechten en ruwe antwoordvelden blijven DPO-besluitpunten.

## Verificatie

- `scripts/verify-learning-governance-metadata.ts`
- `scripts/learning-parity-tests.ts`
- `npm run test:learning-governance`
- `npm --workspaces --if-present run typecheck`
