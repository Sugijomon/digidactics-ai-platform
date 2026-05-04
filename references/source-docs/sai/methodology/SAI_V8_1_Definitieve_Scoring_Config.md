# Shadow AI Scan - Definitieve scoringconfiguratie V8.1

Status: canoniek voor implementatie
Scoring config ID: `sai_v8_1_default_2026_05_04`
Bron: `Shadow_AI_Scan_Scoring_V8_1.md`
Laatst vastgezet: 2026-05-04

## Doel

Dit bestand legt de V8.1-scoreconfiguratie vast als implementatiecontract voor Supabase, Next.js, exports en audittrail. Het dashboard mag deze waarden tonen, maar de berekening en privacyregels moeten server-side worden afgedwongen.

## Versie

- Methodologieversie: `V8.1`
- Config status: `canonical`
- Standaard reviewdrempel: `exposure_score >= 40`
- Standaard privacygrens: `min_cell_size = 5`
- Bestuurlijke scorecap: `100`

## Shadow score

`shadow_score = shadow_base`

| org_policy_status | shadow_base | betekenis |
| --- | ---: | --- |
| allowed | 0 | Toegestaan / goedgekeurd |
| newly_discovered | 20 | Nieuw ontdekt |
| under_review | 20 | In beoordeling |
| restricted | 40 | Beperkt toegestaan |
| not_allowed | 80 | Niet toegestaan / verboden |

## Exposure score

`raw_exposure_score = (use_case_base * context_multiplier * account_multiplier) + data_boost + frequency_boost + automation_boost + extension_boost + agentic_boost`

`exposure_score = min(raw_exposure_score, 100)`

### Use-case base

| risicocategorie | use_case_base | voorbeelden |
| --- | ---: | --- |
| low | 10 | Brainstormen, teksten schrijven, vertalen |
| medium | 20 | Samenvatten, data analyseren, code schrijven |
| high | 35 | Klantenservice, workflow uitvoeren, systemen aansturen |

### Context multiplier

| context | multiplier |
| --- | ---: |
| intern_gebruik | 1.0 |
| klantgerichte_toepassing | 1.25 |
| beslisondersteuning | 1.4 |
| besluiten_over_personen | 1.6 |
| hr_evaluatie | 1.8 |
| kritieke_systemen | 2.0 |

### Account multiplier

| accounttype | multiplier |
| --- | ---: |
| zakelijke_licentie | 1.0 |
| prive_gratis | 1.4 |
| prive_betaald | 1.8 |
| beide | worst_case_account_multiplier |

## Additieve opslagen

### Frequentie

| frequentie | frequency_boost |
| --- | ---: |
| maandelijks | 0 |
| wekelijks | 8 |
| dagelijks | 15 |

### Datatype

| datatype_class | data_boost |
| --- | ---: |
| public | 0 |
| internal | 15 |
| sensitive | 30 |
| uncertain | null; route naar awareness-gap, geen gevoeligheidsklasse |

### Technische versnellers

| signaal | boost | review trigger |
| --- | ---: | --- |
| browser_extension_usage | 10 | true wanneer `shadow_base > 0` |
| automation_flag | 15 | true wanneer `shadow_base > 0` |
| agentic_usage | 20 | altijd true |

## Priority score

`priority_score_raw = (0.45 * shadow_score) + (0.45 * exposure_score) + toxic_boost + review_boost`

`priority_score = min(priority_score_raw, 100)`

- `toxic_boost = 20` wanneer `shadow_score > 50` en `exposure_score > 50`
- `review_boost` uitsluitend via expliciete flags of handmatige override
- boosts wijzigen geen `shadow_score` of `exposure_score`; alleen de DPO-prioriteit

## Review triggers

`dpo_review_required = true` wanneer minimaal een van deze condities geldt:

| trigger_code | conditie |
| --- | --- |
| exposure_threshold | `exposure_score >= review_threshold` |
| not_allowed_tool | `shadow_base = 80` |
| approved_sensitive_data | `shadow_base = 0` en `data_boost = 30` |
| hr_evaluation | `context = hr_evaluatie` |
| agentic_usage | `agentic_usage = true` |
| automation_shadow | `automation_flag = true` en `shadow_base > 0` |
| extension_shadow | `extension_flag = true` en `shadow_base > 0` |
| manual_override | override actief met verplichte `override_reason` |

## Banding

| score_range | tier |
| --- | --- |
| 0-24 | low |
| 25-49 | elevated |
| 50-74 | high |
| 75-100 | critical |

Dashboards tonen tiers naast scores. Binnen de hoogste tier mag raw score alleen technisch worden gebruikt voor sortering, niet als bestuurlijke precisieclaim.

## Aggregatie

- Tool-priority wordt begrensd op 100.
- Respondentscore wordt begrensd op 100.
- Aggregatie gebruikt max-dominantie plus gedempte bijtelling; geen lineaire optelling van alle tools.
- Productie-implementatie moet de exacte aggregatiefunctie als server-side functie vastleggen en testen.

## Privacy en anonimiteit

- Analyseweergaven tonen geen individuele medewerkers.
- Dashboardclusters worden alleen afzonderlijk getoond bij `n >= min_cell_size`.
- Kleinere cellen worden samengevoegd, onderdrukt of uitsluitend kwalitatief getoond.
- Activatiebeheer mag medewerkers tonen; risico-, governance-, voortgang- en rapportageviews niet.

## Auditvereisten

Elke scanronde en export legt minimaal vast:

- `scoring_config_id`
- `scan_round_id`
- `policy_snapshot_id`
- `review_threshold`
- `min_cell_size`
- `trigger_codes_used`
- `exported_at`
- `exported_by`
- gebruikte query/view of materialized view versie

## Nog te valideren na eerste productieronde

- Empirische validatie van `toxic_boost` drempel `>50`.
- Empirische validatie van `agentic_boost = +20`.
- Exacte productiekeuze voor gedempte bijtelling in respondentaggregatie.