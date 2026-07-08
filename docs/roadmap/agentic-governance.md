# Agentic governance roadmap

> Status: canoniek (gepromoveerd uit founder-draft, 2026-07-08) - implementatieconflicten worden beslecht door repo-ADRs en de code zelf.

**Status:** Roadmap, niet huidige implementatiescope.  
**Doel:** Vastleggen hoe de architectuur voorbereid blijft op agentic governance zonder dit nu te bouwen.  
**Relatie:** Breidt later `Actor`, `Capability`, `Credential`, `Decision` en `Evidence` uit uit `../architecture/shared-domain-model.md`.

## Kernbesluit

Agentic governance is toekomstig. De huidige architectuur moet voorbereid zijn, maar niets hiervan wordt nu gebouwd.

Fase-5-herbeoordeling start bij de eerste concrete klantvraag om een agent te governen, of bij de bouw van de eigen distillatie-agent - welke het eerst komt.

ADR-N16 beantwoordt de vraag "AIResource of Actor?": een agent heeft later twee gezichten. Het AIResource-gezicht beschrijft het gedeployde systeem (model, versie, configuratie, Typekaart-pinbaar). Het Actor-gezicht beschrijft de principal die onder Delegation handelt, met eigen credentials en eventgeschiedenis. Registratie als het een sluit het ander niet uit; het gezicht bepaalt de governancevraag.

## Future richting

Later wordt Actor polymorf:

- human;
- service;
- agent.

Daarmee ontstaan nieuwe governancevragen:

- wie mag een agent namens de organisatie laten handelen?
- welke scope krijgt een agent?
- welke beslissingen mag een agent voorbereiden maar niet nemen?
- welke evidence is nodig voor delegated action?
- hoe toon je capability of credential van een agent aan?

## Delegation

Delegation is de toekomstige relatie waarbij een menselijke of organisatorische Actor beperkte handelingsruimte geeft aan een agent Actor.

Delegation moet later minimaal bevatten:

- delegator;
- delegate;
- scope;
- allowed actions;
- prohibited actions;
- expiry/review;
- revocation;
- evidence trail.

Dit is nu alleen een roadmapconcept.

## AI-rijbewijs voor agents

Een "AI-rijbewijs voor agents" is later denkbaar als credential of control framework voor agentgedrag. Het is nu geen productfeature.

Mogelijke latere invulling:

- agent capability profile;
- tool/action permissions;
- eval evidence;
- sandbox/test evidence;
- monitoring policy;
- human override requirement.

## Evidence voor agentic actions

Wanneer agents later handelen, moet Evidence Foundation kunnen vastleggen:

- welke agent handelde;
- namens welke Actor/Organization;
- met welke delegated scope;
- welke input/output;
- welke beslisgrens;
- welke human approval;
- welke rollback of incidentrespons.

## Huidige scope

- Namen en entiteiten zo kiezen dat agentic governance later past.
- Actor niet permanent versmallen tot User.
- AIResource breed genoeg houden voor agent/workflow/deployment.
- Evidence en Decision toekomstbestendig modelleren.

## Niet bouwen

- Geen agent identities.
- Geen delegation model.
- Geen agent permissions.
- Geen agent AI-rijbewijs.
- Geen autonome besluitvorming.
- Geen agentic enforcement.
- Geen productie- of databasewijzigingen voor agents.

## Open vragen voor later

- Wanneer is een workflow een AIResource en wanneer een Actor?
- Welke agentacties vereisen voorafgaande menselijke goedkeuring?
- Welke evals zijn genoeg voor een agent credential?
- Wie draagt eindverantwoordelijkheid bij delegated agent actions?
