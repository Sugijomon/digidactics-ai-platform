# Prompt voor Lovable - export schema en data voor V8.1 migratie

Ik wil mijn bestaande Lovable-project/database migreren naar een nieuwe Next.js + Supabase implementatie voor de Shadow AI Scan V8.1. Behandel de huidige Lovable-database als legacy bron, niet als definitief productieschema.

Voer de volgende taken uit en lever alles als exporteerbare bestanden of duidelijke output:

1. Exporteer het volledige databaseschema:
   - alle tabellen
   - kolommen met types
   - primary keys
   - foreign keys
   - indexes
   - constraints
   - enum/statuswaarden
   - eventuele policies/permissions als die bestaan

2. Exporteer representatieve data als JSON of CSV:
   - maximaal 100 rijen per tabel
   - behoud IDs en relaties
   - anonimiseer persoonsgegevens waar mogelijk
   - markeer welke tabellen demo/seed-data bevatten

3. Maak een datadictionary:
   - tabelnaam
   - veldnaam
   - datatype
   - betekenis
   - voorbeeldwaarde
   - of het veld persoonlijk identificeerbaar kan zijn
   - of het veld nodig lijkt voor V8.1 scoring

4. Maak een mappingvoorstel naar Shadow AI Scan V8.1. Gebruik deze V8.1-doelconcepten:
   - organizations
   - organization_members
   - scan_rounds
   - survey_responses
   - tool_usage_combinations
   - organization_tool_policy_snapshots
   - scoring_configs
   - tool_scores
   - respondent_scores
   - risk_clusters
   - dpo_review_items
   - report_exports
   - audit_events

5. Controleer of de Lovable-data velden bevat voor deze V8.1 scoring inputs:
   - org_policy_status
   - tool
   - use_case
   - context
   - accounttype
   - datatype
   - frequency
   - browser_extension_usage
   - automation_flag
   - agentic_usage
   - override_reason
   - department/team/cluster
   - scan_round
   - respondent pseudonymous ID

6. Controleer of de Lovable-data al berekende V8.1 outputs bevat of oudere scorevelden:
   - shadow_score
   - raw_exposure_score
   - exposure_score
   - toxic_boost
   - review_boost
   - priority_score_raw
   - priority_score
   - tier
   - dpo_review_required
   - trigger_codes

7. Rapporteer afwijkingen:
   - velden die ontbreken voor V8.1
   - oude velden die niet meer gebruikt moeten worden
   - velden die mogelijk privacyrisico geven
   - tabellen die alleen als demo/seed bruikbaar zijn
   - tabellen die waarschijnlijk gemigreerd kunnen worden

8. Geef de output in deze structuur:
   - `legacy_schema.sql` of schema-overzicht
   - `legacy_sample_data.zip` of losse JSON/CSV-bestanden
   - `data_dictionary.md`
   - `v8_1_mapping_report.md`
   - `migration_risks.md`

Belangrijk:
- Maak geen nieuw productieschema zonder eerst de mapping te tonen.
- Verwijder geen data.
- Pas geen bestaande tabellen aan.
- Focus op export, documentatie en V8.1-migratieanalyse.