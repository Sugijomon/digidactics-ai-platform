# Learning content sync audit

Datum: 2026-05-28
Scope: AI Literacy (foundation) en AI Proficiency

## Conclusie

De Supabase/editor-data bevat nu alle source leerpagina's voor AI Literacy en AI Proficiency als live `learning_topics` en `learning_pages.content.blocks`. De lesson-player preview fallback is beperkt zodat repo/preview content niet meer stilletjes live data maskeert zodra Supabase is geconfigureerd.

## Backfilled naar editor

AI Literacy (foundation):
- Source pages: 15
- Live matched pages: 15
- Editable non-empty pages: 15
- Missing topics/pages: 0
- Empty pages: 0

AI Proficiency:
- Source pages: 11
- Live matched pages: 11
- Editable non-empty pages: 11
- Missing topics/pages: 0
- Empty pages: 0

Belangrijke gecontroleerde pagina's:
- ai-literacy-foundation/genai: 2 live blocks, bestaande content behouden
- ai-literacy-foundation/transparantie: 5 live blocks
- ai-proficiency/genai: 18 live blocks, bestaande content behouden
- ai-proficiency/werkproces-analyseren: 3 live blocks
- ai-proficiency/privacy-by-design: 3 live blocks
- ai-proficiency/praktijkcase: 2 live blocks

## Bewust behouden editor-content

Niet-lege bestaande editorpagina's zijn niet blind overschreven. Daardoor blijven deze afwijkingen bewust bestaan:
- AI Literacy / genai: source had 4 blocks, live had 2 blocks. Live behouden.
- AI Proficiency / genai: source had 4 blocks, live had 18 blocks. Live behouden.

## Mogelijke dubbelingen / overlegpunten

Oude live topics en pagina's zijn behouden, zoals gevraagd, en moeten inhoudelijk beoordeeld worden voordat ze worden gearchiveerd of gemapt:

AI Literacy extra topics:
- l1-ai-fundamentals
- l2-risk-responsibility
- l3-responsible-use
- l4-assessment-evidence
- ai-tools
- ai-governance

AI Literacy extra pages:
- aisa-regulatory-anchor
- aisa-l1-what-counts-as-ai
- aisa-l1-genai-gpai
- aisa-l2-risk-levels
- aisa-l2-workplace-examples
- aisa-l2-prohibited-allowed
- aisa-l3-transparency
- aisa-l3-human-in-the-loop
- aisa-l3-bias-data
- aisa-l3-safe-prompting
- aisa-assessment
- aisa-outputs-evidence
- aisa-versioned-credential
- aisa-positioning

AI Proficiency extra topics:
- intro
- onderwerp-1
- ai-tooling
- governance

AI Proficiency extra pages:
- aisa-l1-what-counts-as-ai
- aisa-l1-genai-gpai
- aisa-l3-transparency
- aisa-l2-prohibited-allowed
- aisa-l2-workplace-examples

## Codewijzigingen

- `apps/rai/app/learning/admin/actions.ts`: sync kiest een niet-gearchiveerde cursus, verplaatst volgordes tijdelijk om unique conflicts te voorkomen, upsert topics/pages op codes, backfilled alleen ontbrekende/lege content en behoudt afwijkende bestaande content.
- `apps/rai/lib/learning-admin-data.ts`: audit vergelijkt AI Literacy en AI Proficiency live-vs-source met ids, volgordes en block-counts; editor maskeert lege live pages niet meer met preview content.
- `apps/rai/app/learning/admin/content-audit/page.tsx`: audit UI toont status, live ids, topicvolgorde en block-counts.
- `apps/rai/lib/learning-data.ts`: preview fallback is beperkt; bij Supabase-config wordt live data leidend en wordt preview niet meer gebruikt om ontbrekende live course/page data te verbergen.

## Verificatie

- `npm --workspace @digidactics/rai run typecheck`: groen.
- Supabase query bevestigt alle source topics/pages aanwezig en niet leeg.
- Niet-ingelogde shell checks voor admin routes redirecten naar login, zoals verwacht.
- Niet-ingelogde shell checks voor player routes geven 404 zodra live data niet via sessie/RLS zichtbaar is; dit bevestigt dat preview fallback niet meer maskeert.

## Nog handmatig te bevestigen in ingelogde browser

Open in Edge/Firefox met content-editor sessie:
- `/learning/admin/courses/ai-literacy-foundation`
- `/learning/admin/courses/ai-proficiency`
- `/learning/admin/lessons/genai?courseCode=ai-proficiency`
- `/learning/admin/lessons/werkproces-analyseren?courseCode=ai-proficiency`
- `/learning/admin/lessons/privacy-by-design?courseCode=ai-proficiency`

Verwacht: de pagina's tonen bewerkbare content blocks uit Supabase.
