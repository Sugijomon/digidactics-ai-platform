# RAI Learning System Design Style Guide

Dit document beschrijft alleen de visuele stijl van het **RAI learning system**: cursusoverzicht, course detail, lesson player, learning admin/content editor en certificaatweergave.

Niet meegenomen:

- SAI survey/prototypes
- losse interactieve artefacten
- HTML-embed stijl
- DM Sans / DM Serif
- kleuren uit externe of gegenereerde artefacten

## Visuele Richting

RAI Learning is een rustige, professionele leeromgeving voor AI-geletterdheid, compliance en vaardigheidsbewijs. De stijl moet vertrouwen, voortgang en structuur uitstralen.

Kernwoorden:

- zakelijk
- betrouwbaar
- helder
- compact waar nodig
- rustig in kleurgebruik
- scanbaar in admin/editor
- leesbaar in de lesson player

Gebruik geen marketingachtige landingpage-opbouw in learning flows. De gebruiker komt om te leren, voortgang te zien, content te beheren of bewijs te controleren.

## Fonts

De RAI learning UI gebruikt de platformtypografie uit `apps/rai/app/globals.css`.

| Rol | Font | Gebruik |
|---|---|---|
| Heading | Manrope | H1/H2/H3, navigatiekoppen, cardtitels, grote metrics |
| Body | Inter | Paragrafen, tabellen, labels, formulieren, lesson text |
| Mono | system mono | IDs, codeachtige waarden, technische metadata |

Font fallback:

| Token | Waarde |
|---|---|
| `--font-body-fallback` | Inter, ui-sans-serif, system-ui, Segoe UI, sans-serif |
| `--font-heading-fallback` | Manrope, Inter stack |

## Font Sizes

### Learning Catalog En Course Detail

| Element | Richtmaat | Gewicht | Opmerking |
|---|---:|---:|---|
| Page H1 | 36-48px | 800 | Alleen voor hoofdpagina's |
| Course title | 24-32px | 800 | Course cards/detail |
| Section H2 | 22-28px | 700-800 | Module/onderwerpsecties |
| Card title | 16-20px | 700 | Cursuskaarten, modules |
| Body | 15-17px | 400-500 | Beschrijvende tekst |
| Meta/label | 12-13px | 600-800 | Badges, niveau, status |

### Lesson Player

| Element | Richtmaat | Gewicht | Opmerking |
|---|---:|---:|---|
| Topic/player title | 24-30px | 800 | Bovenin player |
| Hero title in lesson | 32-36px | 800 | Alleen hero-block |
| Block H2 | 26-28px | 700 | Secties binnen les |
| Lesson paragraph | 18px | 400-500 | Ruime line-height |
| Sidebar course title | 14-16px | 700 | Compact, wit op donker |
| Sidebar lesson item | 13-14px | 700 | Actieve les duidelijk |
| Bottom nav button | 14-15px | 700 | Vorige/Volgende |

### Admin / Content Editor

| Element | Richtmaat | Gewicht | Opmerking |
|---|---:|---:|---|
| Admin H1 | 40-48px | 800 | Content editor pagina's |
| Metric number | 48-56px | 800 | Audit/stat cards |
| Admin section title | 22-28px | 700-800 | Tabel/cards |
| Table/body | 14-15px | 400-600 | Leesbaar en compact |
| Form label | 12-13px | 700 | Vaak uppercase of semibold |
| Metadata | 11-12px | 600-800 | Status, IDs, blocktypes |

## Kleuren

### Platform Basis

| Token | Hex | Gebruik |
|---|---|---|
| Primary | `#00658b` | Primaire merkactie, links, actieve accenten |
| Primary container | `#00a1da` | Heldere accentkleur, CTA's |
| Primary fixed | `#c4e7ff` | Zachte icon/background accenten |
| Primary fixed dim | `#7dd0ff` | Progress/lichte highlights |
| Secondary | `#396379` | Ondersteunende blauwgrijze tint |
| Secondary container | `#bae6ff` | Zachte ondersteunende vlakken |
| UI blue grey | `#6993aa` | Subtitles, muted labels |
| Brand green | `#93c942` | Positief/voltooid/succes |
| Brand green accent | `#5c9e1a` | Sterke positieve status |

### Surfaces En Tekst

| Token | Hex | Gebruik |
|---|---|---|
| Surface lowest | `#ffffff` | Cards, modals, contentvlakken |
| Surface | `#f7fafc` | Algemene lichte appachtergrond |
| Container low | `#f1f4f6` | Subtiele panelen |
| Container | `#ebeef0` | Inputs, neutral sections |
| Container high | `#e5e9eb` | Progress empty state, separators |
| Container highest | `#e0e3e5` | Iets sterkere neutral |
| On surface | `#181c1e` | Primaire tekst |
| On surface variant | `#3e484f` | Secundaire tekst |
| Outline | `#6e7880` | Sterkere borders |
| Outline variant | `#bdc8d0` | Subtiele borders |

### Lesson Player Specifiek

| Token | Hex | Gebruik |
|---|---|---|
| Player shell dark | `#1a2b3c` | Sidebar/topbar |
| Player active accent | `#4da8c7` | Progress, actieve les |
| Hero dark | `#001e2b` | Donkere hero gradient |
| Brand teal | `#005e70` | Learning merkaccent |
| Brand teal dark | `#004653` | Donkere variant |
| Warm learning background | `#f6f4ef` | Oudere learning/admin achtergronden |
| Warm line | `#d9d3c8` | Oudere subtiele borders |

### Statuskleuren

| Status | Achtergrond | Tekst/accent |
|---|---|---|
| Success / voltooid | `#ecfdf5` | `#065f46` |
| Warning / aandacht | `#fff7ed` | `#7c2d12` |
| Error / blokkade | `#fee2e2` | `#b91c1c` |
| Info | `#eaf2fc` | `#1a5fa6` |

Gebruik statuskleur functioneel. Niet als decoratief kleurvlak zonder betekenis.

## Vormen En Radius

| Element | Radius | Richtlijn |
|---|---:|---|
| Buttons | 8-12px | In admin vaak rechthoekiger |
| Pills/badges | 999px | Status, niveau, tags |
| Cards | 8-14px | Admin/catalog |
| Lesson blocks/tools | 8px | Rustig en strak |
| Modals | 12-16px | Duidelijke overlay |
| Inputs | 8px | Consistent en compact |

RAI Learning is minder rond dan de survey-prototypes. Gebruik 20px+ radius alleen als een bestaande component dat al doet.

## Spacing

Gebruik een 8px ritme.

| Stap | Pixels | Gebruik |
|---|---:|---|
| XS | 4px | Icon/tekst, fijne meta |
| S | 8px | Compacte inline spacing |
| M | 12px | Form labels, card intern |
| L | 16px | Default component padding |
| XL | 24px | Secties, cards onderling |
| XXL | 32px | Grote pagina-overgangen |

Lesson player:

- sidebar is compact
- contentkolom is ruim en leesbaar
- bottom navigation blijft vast en voorspelbaar
- vermijd layout shifts door vaste dimensies voor controls, iframes, video en slide decks

Admin/content editor:

- dense maar niet krap
- tabellen en auditregels moeten snel scanbaar blijven
- formvelden logisch groeperen
- geen kaarten-in-kaarten tenzij het om een modal of repeated item gaat

## Layout Patronen

### Learning Catalog

Doel: snel kiezen welke cursus/microlearning relevant is.

Richtlijnen:

- duidelijke filter/tabs boven content
- course cards met niveau, verplicht/optioneel, progress en CTA
- consistente cardhoogtes waar mogelijk
- geen marketing hero als eerste ervaring

### Course Detail

Doel: overzicht van leerpad en voortgang.

Richtlijnen:

- titel en certificaatstatus prominent
- onderwerpsecties als scanbare modules
- pagina's in volgorde met progress/lock state
- toetsing en certificaatlogica zichtbaar maar niet intimiderend

### Lesson Player

Doel: geconcentreerd leren en afronden.

Richtlijnen:

- vaste sidebar links met topics en pagina's
- vaste topbar met topic/context/progress
- content in rustige middenkolom
- vaste bottombar met vorige/volgende
- interactieve blokken tonen duidelijke feedback
- completion gates mogen niet onzichtbaar zijn

### Admin / Content Editor

Doel: content beheren, syncen, auditen en beoordelen.

Richtlijnen:

- grote H1 en duidelijke actions rechtsboven
- stat cards boven audit/tabellen
- status badges links in regels
- gewenste/live verschillen naast elkaar
- destructive actions expliciet en zeldzaam
- sync/review actions moeten zichtbaar resultaat of foutmelding tonen

## Componentrichtlijnen

### Buttons

Primary:

- achtergrond: primary of primary container
- tekst: wit
- font-weight: 700-800
- radius: 8-12px
- duidelijke focus-ring

Secondary:

- witte achtergrond
- subtiele border
- donkere tekst
- hover met lichte surface tint

Disabled:

- verlaagde opacity
- cursor disabled
- title/helptekst wanneer actie geblokkeerd is

### Badges

Gebruik badges voor:

- verplicht/optioneel
- niveau
- status
- review required
- certificaatstatus

Stijl:

- radius 999px
- font-size 11-12px
- font-weight 700-800
- uppercase alleen voor echte statussen

### Cards

Cards zijn functioneel:

- course cards
- stat cards
- audit rows
- repeated content items
- modals

Gebruik geen cards als algemene pagina-secties wanneer een gewone full-width sectie volstaat.

### Forms

Richtlijnen:

- labels boven inputs
- duidelijke required/optional aanduiding
- foutmelding direct onder veld
- admin inputs compact maar niet kleiner dan 40px hoog
- lange JSON/content editing in monospaced of code-friendly panels

### Tables En Auditregels

Richtlijnen:

- labels compact en sterk
- primaire data links
- status badges vooraan
- metadata in muted kleur
- verschillen visueel naast elkaar
- lange block-type lijsten mogen wrappen

## Certificaatweergave

Doel: beloning en bewijs, zonder juridisch te overclaimen.

Richtlijnen:

- modulevariant zichtbaar: Literacy, Proficiency, Mastery
- naam cursist en datum duidelijk
- competenties/skills als badges
- disclaimer: intern bewijs, geen externe wettelijke licentie
- animatie subtiel en optioneel

## Toegankelijkheid

Minimaal:

- voldoende contrast
- keyboard focus zichtbaar
- buttons zijn echte buttons
- links zijn echte links
- status niet alleen met kleur communiceren
- tekst mag niet overlappen op mobiel
- form errors zijn tekstueel duidelijk

## RAI Learning Prompt Fragment

Gebruik dit fragment voor nieuwe RAI learning UI ontwerpen:

```txt
Ontwerp in de RAI Learning System stijl:
- Fonts: Manrope voor headings/buttons, Inter voor body, labels en tabellen.
- Kleuren: primary #00658b, bright accent #00a1da, soft blue #c4e7ff, muted label #6993aa, success #93c942, dark player shell #1a2b3c.
- Surfaces: #f7fafc achtergrond, witte cards, subtiele borders #bdc8d0, primaire tekst #181c1e, secundaire tekst #3e484f.
- Layout: rustig, professioneel en scanbaar. Geen marketing hero in learning/admin flows.
- Radius: 8-12px voor operationele UI, 999px voor pills.
- Lesson player: vaste sidebar/topbar/bottombar, leesbare middenkolom, duidelijke voortgang en completion gates.
- Admin: dense, overzichtelijk, stat cards bovenaan, acties rechtsboven, expliciete success/error feedback.
```
