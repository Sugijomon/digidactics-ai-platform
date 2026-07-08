# Gedeeld domeinmodel

> Status: canoniek (gepromoveerd uit founder-draft, 2026-07-08) - implementatieconflicten worden beslecht door repo-ADRs en de code zelf.

**Status:** Canoniek.  
**Doel:** Vastleggen welke kernentiteiten alle Digidactics / RouteAI producten delen.  
**Relatie:** Basis voor `product-map.md`, `evidence-foundation-principles.md`, `model-library-typekaart.md` en `capability-credential-learning.md`.

## Architectuurbesluit

RouteAI heeft een gedeeld domeinmodel. SAI, RAI/RouteAI, Learning en AISA zijn workflows/views over dit model, geen losse datamodellen.

## Entiteiten

### Organization

De juridische of bestuurlijke context waarbinnen AI-gebruik plaatsvindt. Organization draagt beleid, rollen, cataloguskeuzes, reviewritme en bewijsverantwoordelijkheid.

Voorbeelden van eigenschappen: sector, land, governance owner, AI Act rol, reviewcyclus, catalogusbeleid.

### Actor

Degene of datgene dat handelt binnen het systeem. In huidige scope is Actor praktisch een mens of service-account. In de roadmap wordt Actor polymorf: human, service of agent.

Huidige scope: human actors met rollen zoals medewerker, manager, DPO, org_admin, content_editor, super_admin.  
Future: agent actors, delegated authority, agent credentialing.

Voor agents geldt ADR-N16 (dubbel gezicht): zie het besluitregister.

### AIResource

De AI-capability die gebruikt of beoordeeld wordt. Dit vervangt de oude smalle term "Tool" als kernentiteit. Een AIResource kan een SaaS-tool, model, platform, interne applicatie, workflow, agent of deployment-variant zijn.

AIResource wordt gekoppeld aan Typekaart-versies, org-catalog entries, use-cases en evidence.

Een agent verschijnt hier uitsluitend als AIResource-gezicht (het gedeployde systeem); de handelende principal is het Actor-gezicht - zie ADR-N16.

### UseCase

Wat een Actor met een AIResource wil doen in een concrete context. Risico zit primair in de use-case, niet in de tool op zichzelf.

UseCase bevat doel, data, betrokkenen, output, besluitimpact, toezicht en contextparameters.

### Capability

Capability is een benoembare, gate-bare kwalificatie: wat een Actor aantoonbaar beheerst en waarvoor een gate kan toetsen. Capability is nooit zelfstandige toestemming - toestemming is altijd Capability x UseCase-context x Decision ("Niveau != toestemming"). Vaardigheidsniveaus zijn een later Competency-concept, geen Capability.

### Credential

Bewijs dat een capability of kennisdrempel is behaald. Het AI-rijbewijs is een interne credential met auditwaarde, geen extern diploma of certificering.

### Decision

Een vastgelegde governancebeslissing: route, goedkeuring, afwijzing, escalatie, DPO-review, catalogusbesluit, herbevestiging of policykeuze.

Elke Decision moet herleidbaar zijn naar context, actor, rationale, geldende versies en evidence.

### Evidence

Append-only bewijs dat iets is gebeurd, besloten, gezien, goedgekeurd of gewijzigd. Evidence is geen documentdump, maar een traceerbare laag van events, snapshots, versies, rationale en verwijzingen.

## Relaties

Een Organization heeft Actors, AIResources, org-catalog entries, Decisions en Evidence.  
Een Actor dient UseCases in, voltooit Learning, behaalt Credentials en kan Decisions nemen binnen rolgrenzen.  
Een UseCase gebruikt een AIResource en leidt tot een Decision.  
Een Decision verwijst naar Evidence en naar de versies van Typekaart, beslislogica, survey, learning of credential die golden op dat moment.

Policy(Version) is bewust geen negende entiteit: Decisions verwijzen naar de geldende beleids-/logica-versie (version pinning), en Policy-as-data is post-pilot werk.

## Huidige scope

- Menselijke actors en bestaande rollen.
- AIResources als conceptuele opvolger van tools/model_typekaart.
- Decision en Evidence als auditkern.
- Capability/Credential voor AI Literacy, micro-learning en AISA-output.

## Niet bouwen

- Geen agent delegation.
- Geen agent credentialing.
- Geen automatische toestemming op basis van capability.
- Geen nieuwe productie-tabellen op basis van dit document zonder aparte implementatiespecificatie.

## Open vragen

- Welke minimale velden zijn nodig voor een AIResource in pilot-scope?
- Wanneer wordt een platform, model, agent of workflow apart geregistreerd als AIResource?
- Welke Decisions moeten vanaf pilot direct append-only evidence opleveren?
