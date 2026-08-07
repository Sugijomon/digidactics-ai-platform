# RAI Learning System - URL- en routeoverzicht

Laatst gecontroleerd: 6 augustus 2026

## Lokale basis-URL

Voor lokale ontwikkeling en documentatie gebruiken we voortaan een vaste
basis-URL:

```text
http://localhost:3010
```

Start de RAI-app vanuit de repository met:

```powershell
npm --workspace @digidactics/rai run dev -- -p 3010
```

`localhost` verwijst naar de eigen computer. Poort `3010` is alleen bereikbaar
wanneer de lokale ontwikkelserver draait. Staging en productie krijgen een
eigen online domeinnaam en gebruiken deze localhost-URL niet.

## Learner-routes

| Doel | Route | Lokale URL |
|---|---|---|
| Cursus- en microlearningoverzicht | `/learning` | `http://localhost:3010/learning` |
| Cursuslandingspagina | `/learning/[courseCode]` | Zie cursusvoorbeelden hieronder |
| Lessenspeler | `/learning/[courseCode]/[lessonCode]` | Zie lesvoorbeelden hieronder |
| Preview-index | `/learning/preview` | `http://localhost:3010/learning/preview` |
| Microlearning-speler | `/learning/lessons/[lessonCode]` | Afhankelijk van de microlearningcode |

`[courseCode]` en `[lessonCode]` zijn plaatsaanduidingen. De blokhaken komen niet
letterlijk in een echte URL voor.

## Cursussen

| Cursus | Cursuscode | Lokale URL |
|---|---|---|
| AI Literacy Foundation | `ai-literacy-foundation` | `http://localhost:3010/learning/ai-literacy-foundation` |
| AI Proficiency | `ai-proficiency` | `http://localhost:3010/learning/ai-proficiency` |
| AI Mastery | `ai-mastery` | `http://localhost:3010/learning/ai-mastery` |

Een cursus-URL opent de landingspagina van de cursus: onderwerpen, voortgang,
duur en de actie om te starten of verder te gaan. Het is niet de lessenspeler.

## Voorbeelden van lessen

| Cursus | Les | Lokale URL |
|---|---|---|
| AI Literacy Foundation | Human in the Loop | `http://localhost:3010/learning/ai-literacy-foundation/human-in-the-loop` |
| AI Proficiency | Data veilig invoeren of juist niet | `http://localhost:3010/learning/ai-proficiency/data-veilig-invoeren-of-juist-niet` |

Een les-URL bevat altijd zowel de cursuscode als de lescode:

```text
/learning/[courseCode]/[lessonCode]
```

## Beheer- en content-editorroutes

| Doel | Route | Lokale URL |
|---|---|---|
| Admin-dashboard | `/learning/admin` | `http://localhost:3010/learning/admin` |
| Cursusbeheer | `/learning/admin/courses` | `http://localhost:3010/learning/admin/courses` |
| Cursus bewerken | `/learning/admin/courses/[courseCode]` | Zie voorbeelden hieronder |
| Lessenoverzicht | `/learning/admin/lessons` | `http://localhost:3010/learning/admin/lessons` |
| Les bewerken | `/learning/admin/lessons/[pageCode]` | Wordt bij voorkeur vanuit de editor geopend |
| Handmatige reviews | `/learning/admin/reviews` | `http://localhost:3010/learning/admin/reviews` |
| Contentblokken | `/learning/admin/blocks` | `http://localhost:3010/learning/admin/blocks` |
| Content-audit en Git-sync | `/learning/admin/content-audit` | `http://localhost:3010/learning/admin/content-audit` |

Voorbeelden van cursusbeheer:

- `http://localhost:3010/learning/admin/courses/ai-literacy-foundation`
- `http://localhost:3010/learning/admin/courses/ai-proficiency`
- `http://localhost:3010/learning/admin/courses/ai-mastery`

Adminroutes zijn beschermd. Een gebruiker moet zijn ingelogd en de rol
`content_editor` of `super_admin` hebben. Zonder geldige sessie volgt een
doorverwijzing naar de login; met onvoldoende rechten volgt een doorverwijzing
naar het dashboard.

Voor een les-editor kunnen gegenereerde links naast de `pageCode` ook
`courseCode` en `pageId` als queryparameters bevatten. Open lespagina's daarom
bij voorkeur vanuit het cursusbeheer in plaats van zelf een editor-URL samen te
stellen.

## Authenticatie

De toegestane lokale Supabase Auth-callback is:

```text
http://localhost:3010/auth/callback
```

Deze poort moet overeenkomen met de poort waarop de RAI-app lokaal draait.

## Afspraken

- Gebruik `3010` in nieuwe lokale documentatie, bookmarks en testinstructies.
- Gebruik `/learning/[courseCode]` voor een cursuslandingspagina.
- Gebruik `/learning/[courseCode]/[lessonCode]` voor de lessenspeler.
- Gebruik admin-editorlinks bij voorkeur vanuit de interface.
- Gebruik geen localhost-URL als staging- of productie-URL.
