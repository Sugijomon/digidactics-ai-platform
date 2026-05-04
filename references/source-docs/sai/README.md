# SAI Source Documents

Deze map bevat bronmateriaal voor de Shadow AI Scan V8.1. Gebruik deze bestanden als referentiecontext; leg actieve productkeuzes en implementatiebesluiten vast in `docs/`.

## Belangrijkste bronnen

| Map | Inhoud | Gebruik |
| --- | --- | --- |
| `methodology/` | V8.1 methodologie, scoringconfig en Lovable exportprompt | Leidend voor scoring, schema, dashboard en frontend-flow |
| `legacy-export/` | Lovable schema-export, datadictionary, mappingrapport, migratierisico's en sample/full export | Referentie voor migratie en datamapping |
| `database-target/` | Target schema concepten en changenotes | Historische schema-input; runtime migrations staan in `supabase/migrations/` |
| `security-rls/` | RLS concepten en v2.1 baseline uit de Lovable/Claude fase | Historische security-input; runtime migrations staan in `supabase/migrations/` |
| `dashboard/` | Dashboard-copy en inhoudelijke referenties | Context bij dashboardimplementatie |
| `documentation/` | DPO-handleiding | Klant-/procesdocumentatie |
| `validation/` | V8.1 coverage check en validatie-export | Benchmarkcontrole |

## Dashboard HTML

De actuele dashboard HTML-pagina's staan bewust niet hier maar in:

`design-html/sai/dashboard/pages/`

Referentiepagina's en grafiekvoorbeelden staan in:

`design-html/sai/dashboard/reference-pages/`

## Projectregister

Het Excel-overzicht met alle belangrijke documenten staat in:

`references/project-register/Shadow_AI_project_documenten_overzicht.xlsx`

