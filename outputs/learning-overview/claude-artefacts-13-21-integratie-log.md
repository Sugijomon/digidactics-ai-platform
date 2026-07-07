# Claude artefacts 13-21 integratie-log

Datum: 2026-05-31

## Native integratie

| # | Bronbestand | Doel | Implementatie |
|---|---|---|---|
| 13 | `13-triage-matrix.html` | Mastery M02 | Nieuw native `decision_matrix` block `m02-triage-matrix` met 4 kwadranten, examples, aanpak, checks en reviewmetadata. |
| 14 | `14-ketendiagram-rollen.html` | Mastery M03 | Uitgebreide rollenkaartmetadata en native timeline `m03-chain-flow` voor provider, deployer, owner en gebruiker. |
| 15 | `15-monitoringcyclus-tijdlijn.html` | Mastery M08 | Native timeline `m08-timeline` aangescherpt naar loggen, signaleren, incident beoordelen en review/bijstellen. |
| 16 | `16-controle-interventies-tijdlijn.html` | Mastery M06 | Native timeline `m06-control-interventions-timeline` met pre-approval, vier-ogencontrole, sampling en stop/override. |
| 17 | `17-disclosure-slides.html` | Mastery M09 | Native `slide_deck` `m09-disclosure-slides` met 3 slides en 2 gate-scenario's; juridische claims verzacht en review_required. |
| 18 | `18-datakwaliteit-bias-kaarten.html` | Mastery M07 | Native knowledge cards aangescherpt plus checklist `m07-bias-checklist`. |
| 19 | `19-certificaat-animatie-literacy.html` | Literacy success UI | `CourseCertificateSuccess` variant `literacy`, gekoppeld aan CompetencyStatusPanel wanneer evidence compleet is. |
| 20 | `20-certificaat-animatie-proficiency.html` | Proficiency success UI | `CourseCertificateSuccess` variant `proficiency`, zichtbaar op course overview bij 100% voortgang. |
| 21 | `21-certificaat-animatie-mastery.html` | Mastery success UI | `CourseCertificateSuccess` variant `mastery`, zichtbaar op course overview bij 100% voortgang. |

## Juridische copy-edit

- Absolute claims rond GDPR Art. 22, Article 50, CV-selectie, EU databankregistratie en high-risk deadlines zijn verzacht.
- Blocks met AI Act, disclosure, HR/CV-selectie, bias, high-risk of privacy-impact hebben `source_ids`, `source_status`, `last_verified_at`, `legal_review_required` en/of `review_required` metadata waar relevant.
- De certificaatfeedback vermeldt expliciet dat het interne evidence is en geen externe licentie, wettelijke vrijwaring of formele AI Act-certificering.

## Techniek

- Geen losse iframe/HTML embeds gebruikt.
- Geen inline `onclick`-JS overgenomen.
- Nieuw native blocktype: `decision_matrix`.
- Certificaatanimatie gebruikt CSS-only check/confetti met `prefers-reduced-motion` fallback.
- Mobile layout: matrix, examples en certificaatmetadata vallen terug naar 1 kolom onder 760px.

## Verificatie

- `npm run test:learning-governance` geslaagd, inclusief governance metadata, certificaat-success component smoke-test en SQL/app-pariteit.
- `npm --workspaces --if-present run typecheck` geslaagd.
- Mastery routes lokaal gecontroleerd op `http://127.0.0.1:3012`: alle 6 doelpagina's geven `200` en bevatten de verwachte nieuwe artefactcontent.
- Browser-check op M02 triage bevestigt zichtbare matrix, 4 native `details`-kwadranten en geen console-errors.
- Mobiele viewportcheck op 390px bevestigt geen horizontale overflow voor de decision matrix.
