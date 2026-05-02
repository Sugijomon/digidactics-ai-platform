# Toolpicker Update Process

This document captures the maintenance principle for updating the SAI toolpicker, use case mappings, context signals, and future RouteAI risk enrichment.

It is not a runtime specification for the respondent survey flow.

## Purpose

The toolpicker and risk mapping layer will need periodic updates because AI tools, common use cases, account patterns, and governance signals change over time.

Updates should be handled as a reviewed maintenance process, not as automatic production changes.

## Source Material

Historical source material may exist locally in:

- `Tools & usecases/JSON`
- `Tools & usecases/Context`
- `Tools & usecases/UPDATEN Werkinstructie`

These files can be used as reference material, but they are not active production truth until reviewed and migrated into repo-managed configuration, migrations, or seeds.

## Runtime Versus Maintenance

Runtime configuration is what the scan directly uses:

- categories
- tools
- use cases
- contexts used in the respondent flow
- toolpicker mappings
- stable survey answer codes

Maintenance content is what supports updates and governance enrichment:

- risk definitions
- tool/use-case combination research
- prompt templates for external research
- governance flags
- Model Library/typekaart enrichment
- review rationales and confidence notes

Runtime configuration must remain stable, reviewed, and auditable. Maintenance content may be richer, messier, and more exploratory.

## Update Flow

1. Select the category or mapping area to update.
2. Run a structured research prompt using the relevant template.
3. Require valid JSON output in the existing schema.
4. Store new output separately from existing source files.
5. Compare the new output with the current reviewed source.
6. Review only the differences.
7. Pay extra attention to potential Article 5, Annex III, HR, legal, financial, biometric, autonomous, and downstream high-risk contexts.
8. Apply only approved changes.
9. Update review metadata such as review date, review status, rationale, and confidence where applicable.
10. Only then propagate approved changes to runtime configuration, database seeds, migrations, or UI.

## Context And Governance Flags

Use this distinction consistently:

- `context` = where the use case lands
- `governance_flag` = why the use case needs extra review or intervention

Examples:

- customer interaction is a context
- synthetic content is a governance flag
- HR/worker management is a context
- human review required is a governance flag
- critical systems is a context
- orchestration/autonomous execution is a governance flag

This prevents the context taxonomy from becoming too large while preserving useful risk signals for RouteAI.

## Current Decision

Do not import the old JSON and context files blindly into production.

Use them as reference material for:

- the initial toolpicker seed strategy
- future Model Library enrichment
- context/governance-flag normalization
- risk mapping review workflows

When these files become production inputs, move the reviewed subset into repo-managed configuration, database seeds, or Supabase migrations.
