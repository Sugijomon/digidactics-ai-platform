"use server";

import {
  buildAiFotoGeneratedCardDraft,
  clampAiFotoEvidenceLevel,
  getAiFotoClusterKey,
  validateAiFotoCardItemApproval,
  type AiFotoApplicationSignalInput,
  type AiFotoCardType,
  type AiFotoEvidenceLevel,
} from "@digidactics/domain";
import { revalidatePath } from "next/cache";
import { getDashboardAccess } from "@/components/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

const ANALYSIS_VERSION = "ai-foto-analysis-v1";
const CARD_TYPES: AiFotoCardType[] = ["waarde", "aandacht", "vaardigheid"];
const EDITABLE_STATUSES = new Set(["draft", "ai_suggested", "consultant_reviewed"]);

type ActionAccess = {
  orgId: string;
  userId: string;
};

type AiFotoApplicationRow = {
  account_environment_code: string | null;
  ai_visibility_code: string | null;
  control_rework_code: string | null;
  escalation_route_awareness_code: string | null;
  id: string;
  output_control_code: string | null;
  people_impact_code: string | null;
  survey_application_condition_need:
    | { condition_need_code: string | null }[]
    | null;
  survey_application_data_type: { data_type_code: string | null }[] | null;
  survey_application_near_miss_signal:
    | { near_miss_signal_code: string | null }[]
    | null;
  survey_run: { completed_at: string | null; org_id: string; wave_id: string | null } | null;
  survey_tool: { tool_name: string | null } | null;
  survey_tool_use_case: { use_case_code: string | null } | null;
  transparency_code: string | null;
  value_evidence_code: string | null;
};

type CardItemRow = {
  analysis_version: string;
  card_type: AiFotoCardType;
  cluster_key: string;
  evidence_refs: unknown;
  id: string;
  interpretation: string | null;
  observation: string;
  respondent_count: number | null;
  scan_wave_id: string | null;
  source_kind: string;
  status: string;
  title: string;
};

export async function generateAiFotoCardItems() {
  const access = await requireAiFotoDashboardAccess();
  const supabase = await createClient();
  const minCellSize = await getMinCellSize(supabase, access.orgId);
  const applications = await getAiFotoApplications(supabase, access.orgId);
  const groupedApplications = groupApplicationsForCards(applications, minCellSize);

  for (const group of groupedApplications) {
    if (group.applications.length < minCellSize) {
      continue;
    }

    for (const cardType of CARD_TYPES) {
      const draft = buildAiFotoGeneratedCardDraft({
        applications: group.applications,
        cardType,
        clusterKey: group.clusterKey,
        respondentCount: group.applications.length,
        valueEvidenceCodes: group.applications.map(
          (application) => application.valueEvidenceCode,
        ),
      });
      const existing = await findExistingCardItem(supabase, {
        cardType,
        clusterKey: group.clusterKey,
        orgId: access.orgId,
        scanWaveId: group.scanWaveId,
      });

      if (existing && !EDITABLE_STATUSES.has(existing.status)) {
        continue;
      }

      if (existing) {
        const { error } = await supabase
          .from("card_item")
          .update({
            evidence_level: draft.evidenceLevel,
            evidence_refs: draft.evidenceRefs,
            observation: draft.observation,
            respondent_count: draft.respondentCount,
            status: existing.status === "consultant_reviewed"
              ? "consultant_reviewed"
              : "ai_suggested",
            title: draft.title,
          })
          .eq("id", existing.id)
          .eq("org_id", access.orgId);

        if (error) throw new Error(error.message);
        await recordAudit(supabase, access.orgId, "card_item.generated", existing.id, {
          action: "updated_existing_draft",
          card_type: cardType,
          cluster_key: group.clusterKey,
        });
        continue;
      }

      const { data, error } = await supabase
        .from("card_item")
        .insert({
          analysis_version: draft.analysisVersion,
          card_type: draft.cardType,
          cluster_key: draft.clusterKey,
          created_by: access.userId,
          evidence_level: draft.evidenceLevel,
          evidence_refs: draft.evidenceRefs,
          observation: draft.observation,
          org_id: access.orgId,
          respondent_count: draft.respondentCount,
          scan_wave_id: group.scanWaveId,
          source_kind: draft.sourceKind,
          status: "ai_suggested",
          title: draft.title,
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      await recordAudit(supabase, access.orgId, "card_item.generated", data.id, {
        action: "inserted_ai_suggestion",
        card_type: cardType,
        cluster_key: group.clusterKey,
      });
    }
  }

  revalidatePath("/dashboard/ai-foto");
}

export async function updateAiFotoCardItem(formData: FormData) {
  const access = await requireAiFotoDashboardAccess();
  const supabase = await createClient();
  const cardItem = await getCardItemForOrg(supabase, access.orgId, getRequiredString(formData, "card_item_id"));

  if (!EDITABLE_STATUSES.has(cardItem.status)) {
    throw new Error("Approved kaartitems kunnen niet via conceptredactie worden aangepast.");
  }

  const valueEvidenceCode = getValueEvidenceCode(cardItem.evidence_refs);
  const evidenceLevel = clampAiFotoEvidenceLevel(
    parseEvidenceLevel(getRequiredString(formData, "evidence_level")),
    valueEvidenceCode,
    formData.get("allow_triangulated_evidence") === "on",
  );
  const openQuestions = parseLines(formData.get("open_questions"));
  const proposedOwnerRole = normalizeOptionalSelect(formData.get("proposed_owner_role"));
  const reviewDate = normalizeDate(formData.get("review_date"));

  const { error } = await supabase
    .from("card_item")
    .update({
      evidence_level: evidenceLevel,
      follow_up_direction: getOptionalString(formData, "follow_up_direction"),
      interpretation: getOptionalString(formData, "interpretation"),
      observation: getRequiredString(formData, "observation"),
      open_questions: openQuestions,
      precaution: getOptionalString(formData, "precaution"),
      proposed_owner_role: proposedOwnerRole,
      review_date: reviewDate,
      title: getRequiredString(formData, "title"),
    })
    .eq("id", cardItem.id)
    .eq("org_id", access.orgId);

  if (error) throw new Error(error.message);
  await recordAudit(supabase, access.orgId, "card_item.updated", cardItem.id, {
    fields: [
      "title",
      "observation",
      "interpretation",
      "open_questions",
      "precaution",
      "follow_up_direction",
      "proposed_owner_role",
      "review_date",
      "evidence_level",
    ],
  });

  revalidatePath("/dashboard/ai-foto");
}

export async function markAiFotoCardItemReviewed(formData: FormData) {
  const access = await requireAiFotoDashboardAccess();
  const supabase = await createClient();
  const cardItem = await getCardItemForOrg(supabase, access.orgId, getRequiredString(formData, "card_item_id"));

  if (cardItem.status === "approved") {
    throw new Error("Approved kaartitems zijn al geaccordeerd.");
  }

  const { error } = await supabase
    .from("card_item")
    .update({ status: "consultant_reviewed" })
    .eq("id", cardItem.id)
    .eq("org_id", access.orgId);

  if (error) throw new Error(error.message);
  await recordAudit(supabase, access.orgId, "card_item.updated", cardItem.id, {
    status: "consultant_reviewed",
  });

  revalidatePath("/dashboard/ai-foto");
}

export async function approveAiFotoCardItem(formData: FormData) {
  const access = await requireAiFotoDashboardAccess();
  const supabase = await createClient();
  const cardItem = await getCardItemForOrg(supabase, access.orgId, getRequiredString(formData, "card_item_id"));
  const validation = validateAiFotoCardItemApproval({
    analysisVersion: cardItem.analysis_version,
    evidenceRefs: cardItem.evidence_refs,
    interpretation: cardItem.interpretation,
    observation: cardItem.observation,
    respondentCount: cardItem.respondent_count,
    title: cardItem.title,
  });

  if (!validation.ok) {
    throw new Error(
      `Kaartitem is niet akkoordklaar. Ontbrekend: ${validation.missingFields.join(", ") || "geen"}. Geblokkeerde termen: ${validation.blockedTerms.join(", ") || "geen"}.`,
    );
  }

  const { error } = await supabase
    .from("card_item")
    .update({
      approved_at: new Date().toISOString(),
      approved_by: access.userId,
      status: "approved",
    })
    .eq("id", cardItem.id)
    .eq("org_id", access.orgId);

  if (error) throw new Error(error.message);
  await recordAudit(supabase, access.orgId, "card_item.approved", cardItem.id, {
    analysis_version: ANALYSIS_VERSION,
    validation,
  });

  revalidatePath("/dashboard/ai-foto");
}

export async function recordAiFotoExportPreview(formData: FormData) {
  const access = await requireAiFotoDashboardAccess();
  const supabase = await createClient();
  const itemIds = getRequiredString(formData, "selected_item_ids")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (itemIds.length === 0) {
    throw new Error("Er zijn nog geen approved kaartitems voor export-preview.");
  }

  const { count, error: countError } = await supabase
    .from("card_item")
    .select("id", { count: "exact", head: true })
    .eq("org_id", access.orgId)
    .eq("analysis_version", ANALYSIS_VERSION)
    .eq("status", "approved")
    .in("id", itemIds);

  if (countError) throw new Error(countError.message);
  if ((count ?? 0) !== itemIds.length) {
    throw new Error("Export-preview mag alleen approved kaartitems bevatten.");
  }

  const minCellSize = await getMinCellSize(supabase, access.orgId);
  const scanWaveId = normalizeOptionalSelect(formData.get("scan_wave_id"));
  const methodVersion =
    normalizeOptionalSelect(formData.get("method_version")) ?? "ai-foto-scan-v1";
  const { data, error } = await supabase
    .from("report_exports")
    .insert({
      created_by: access.userId,
      export_status: "preview_ready",
      export_type: "ai_foto_cards",
      filters: {
        analysis_version: ANALYSIS_VERSION,
        card_item_ids: itemIds,
        method_version: methodVersion,
        preview_only: true,
      },
      k_anonymity_applied: minCellSize,
      min_cell_size: minCellSize,
      org_id: access.orgId,
      row_count: itemIds.length,
      suppressed_cell_count: 0,
      view_or_query_version: ANALYSIS_VERSION,
      wave_id: scanWaveId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  await recordAudit(
    supabase,
    access.orgId,
    "ai_foto.export_preview_recorded",
    data.id,
    {
      item_count: itemIds.length,
      method_version: methodVersion,
    },
  );

  revalidatePath("/dashboard/ai-foto");
}

async function requireAiFotoDashboardAccess(): Promise<ActionAccess> {
  const access = await getDashboardAccess();

  if (access.kind !== "authorized") {
    throw new Error("Niet bevoegd voor de AI-Foto werkbank.");
  }

  return {
    orgId: access.roleState.orgId,
    userId: access.roleState.user.id,
  };
}

async function getMinCellSize(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
) {
  const { data, error } = await supabase
    .from("scan_scoring_config")
    .select("dashboard_min_cell_size")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  return error || !data ? 5 : (data.dashboard_min_cell_size ?? 5);
}

async function getAiFotoApplications(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
) {
  const { data, error } = await supabase
    .from("survey_application")
    .select(
      `
        id,
        account_environment_code,
        output_control_code,
        people_impact_code,
        ai_visibility_code,
        transparency_code,
        control_rework_code,
        value_evidence_code,
        escalation_route_awareness_code,
        survey_run!inner(org_id, product_code_snapshot, completed_at, wave_id),
        survey_tool(tool_name),
        survey_tool_use_case(use_case_code),
        survey_application_data_type(data_type_code),
        survey_application_condition_need(condition_need_code),
        survey_application_near_miss_signal(near_miss_signal_code)
      `,
    )
    .eq("survey_run.org_id", orgId)
    .eq("survey_run.product_code_snapshot", "ai_foto")
    .not("survey_run.completed_at", "is", null)
    .returns<AiFotoApplicationRow[]>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

function groupApplicationsForCards(
  rows: AiFotoApplicationRow[],
  minCellSize: number,
) {
  const groups = new Map<
    string,
    {
      applications: AiFotoApplicationSignalInput[];
      clusterKey: string;
      scanWaveId: string | null;
    }
  >();

  for (const row of rows) {
    const clusterKey = getAiFotoClusterKey({
      minCellSize,
      toolName: row.survey_tool?.tool_name,
      useCaseCode: row.survey_tool_use_case?.use_case_code,
    });
    const scanWaveId = row.survey_run?.wave_id ?? null;
    const mapKey = `${scanWaveId ?? "no-wave"}::${clusterKey}`;
    const group = groups.get(mapKey) ?? {
      applications: [],
      clusterKey,
      scanWaveId,
    };

    group.applications.push({
      accountEnvironmentCode: row.account_environment_code,
      aiVisibilityCode: row.ai_visibility_code,
      conditionNeedCodes: extractCodes(row.survey_application_condition_need, "condition_need_code"),
      controlReworkCode: row.control_rework_code,
      dataTypeCodes: extractCodes(row.survey_application_data_type, "data_type_code"),
      escalationRouteAwarenessCode: row.escalation_route_awareness_code,
      nearMissSignalCodes: extractCodes(row.survey_application_near_miss_signal, "near_miss_signal_code"),
      outputControlCode: row.output_control_code,
      peopleImpactCode: row.people_impact_code,
      surveyApplicationId: row.id,
      toolName: row.survey_tool?.tool_name,
      transparencyCode: row.transparency_code,
      useCaseCode: row.survey_tool_use_case?.use_case_code,
      valueEvidenceCode: row.value_evidence_code,
    });
    groups.set(mapKey, group);
  }

  return [...groups.values()];
}

async function findExistingCardItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    cardType: AiFotoCardType;
    clusterKey: string;
    orgId: string;
    scanWaveId: string | null;
  },
) {
  let query = supabase
    .from("card_item")
    .select("id, status")
    .eq("org_id", input.orgId)
    .eq("analysis_version", ANALYSIS_VERSION)
    .eq("card_type", input.cardType)
    .eq("source_kind", "application_cluster")
    .eq("cluster_key", input.clusterKey);

  query = input.scanWaveId
    ? query.eq("scan_wave_id", input.scanWaveId)
    : query.is("scan_wave_id", null);

  const { data, error } = await query.maybeSingle<{ id: string; status: string }>();

  if (error) throw new Error(error.message);
  return data;
}

async function getCardItemForOrg(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  cardItemId: string,
) {
  const { data, error } = await supabase
    .from("card_item")
    .select(
      `
        id,
        scan_wave_id,
        card_type,
        source_kind,
        cluster_key,
        title,
        observation,
        respondent_count,
        evidence_refs,
        interpretation,
        status,
        analysis_version
      `,
    )
    .eq("id", cardItemId)
    .eq("org_id", orgId)
    .single<CardItemRow>();

  if (error) throw new Error(error.message);
  return data;
}

async function recordAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  eventType: string,
  subjectId: string,
  payload: Record<string, unknown>,
) {
  const { error } = await supabase.rpc("record_ai_foto_card_item_audit", {
    p_event_type: eventType,
    p_org_id: orgId,
    p_payload: payload,
    p_subject_id: subjectId,
  });

  if (error) throw new Error(error.message);
}

function extractCodes<T extends string>(
  rows: Array<Record<T, string | null>> | null,
  key: T,
) {
  return (rows ?? [])
    .map((row) => row[key])
    .filter((value): value is string => Boolean(value));
}

function getRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Ontbrekend veld: ${key}`);
  }

  return value.trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeOptionalSelect(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value;
}

function parseLines(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseEvidenceLevel(value: string): AiFotoEvidenceLevel {
  if (value === "aangetoond" || value === "aannemelijk" || value === "gesteld") {
    return value;
  }

  return "gesteld";
}

function getValueEvidenceCode(evidenceRefs: unknown) {
  if (!Array.isArray(evidenceRefs)) {
    return null;
  }

  const ref = evidenceRefs.find(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "field" in item &&
      item.field === "valueEvidenceCode" &&
      "value" in item &&
      typeof item.value === "string",
  );

  return ref && "value" in ref && typeof ref.value === "string" ? ref.value : null;
}
