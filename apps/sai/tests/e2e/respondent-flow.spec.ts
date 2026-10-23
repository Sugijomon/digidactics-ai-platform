import { expect, test, type Page } from "@playwright/test";

const SUPABASE_RPC_ROUTE = "**/rest/v1/rpc/**";
const SURVEY_SESSION_STORAGE_KEY = "sai.respondent.session";
const E2E_WAVE_TOKEN = "sai-smoke-wave-token";

test("respondent can complete the current SAI survey flow with one tool", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await mockSupabaseRpc(page);
  await page.goto("/survey");
  await page.evaluate(() => window.sessionStorage.clear());
  await startSurvey(page);

  await expect(page).toHaveURL(/\/survey\/profile$/, { timeout: 30_000 });
  await page.locator('input[value="marketing_communicatie"]').check();
  await page.getByRole("button", { name: "Volgende stap" }).click();

  await expect(page).toHaveURL(/\/survey\/motivations$/, { timeout: 30_000 });
  await page.locator('input[value="weekly"]').check();
  await page.locator('input[value="tijdswinst"]').check();
  await page.locator('input[value="experimenteren"]').check();
  await page.getByRole("button", { name: "Volgende stap" }).click();

  await expect(page).toHaveURL(/\/survey\/tools$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Catalogus" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Alle 45/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Zelf invullen" })).toHaveCount(0);
  await page.getByRole("button", { name: "Code" }).click();
  await page.getByRole("button", { name: /Cursor/ }).click();
  let toolDialog = page.getByRole("dialog");
  await expect(toolDialog.getByText("Waarvoor gebruik je deze tool?")).toBeVisible();
  await expect(toolDialog.locator("button").filter({ hasText: "Intern gebruik" })).toBeVisible();
  await expect(
    toolDialog.locator("button").filter({ hasText: "Klantgerichte toepassing" }),
  ).toBeVisible();
  await expect(toolDialog.getByText("Voor interne dashboards")).toBeHidden();
  await toolDialog.locator("button").filter({ hasText: "Intern gebruik" }).click();
  await toolDialog
    .locator("button")
    .filter({ hasText: "Klantgerichte toepassing" })
    .click();
  await toolDialog.getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByText("1. Cursor")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText("2 contexten")).toBeVisible();
  await page.getByRole("button", { name: "Cursor verwijderen" }).click();
  await expect(page.getByText("1. Cursor")).toHaveCount(0);
  await page.getByRole("button", { name: "Beeld/video" }).click();
  await page.getByRole("button", { name: /Midjourney/ }).click();
  toolDialog = page.getByRole("dialog");
  await expect(toolDialog.getByRole("heading", { name: "Midjourney" })).toBeVisible();
  await expect(
    toolDialog.getByRole("button", { name: "Afbeeldingen genereren" }),
  ).toBeVisible();
  await expect(
    toolDialog.getByRole("button", { name: "Automatisering" }),
  ).toHaveCount(0);
  await toolDialog.getByRole("button", { name: "Annuleren" }).click();
  await page.getByRole("button", { name: "Data en automatisering" }).click();
  await page.getByRole("button", { name: /Akkio/ }).click();
  toolDialog = page.getByRole("dialog");
  await expect(toolDialog.getByRole("heading", { name: "Akkio" })).toBeVisible();
  await expect(toolDialog.getByRole("button", { name: "Data analyseren" })).toBeVisible();
  await expect(
    toolDialog.getByRole("button", { name: "Teksten schrijven" }),
  ).toHaveCount(0);
  await toolDialog.getByRole("button", { name: "Annuleren" }).click();
  await page.getByRole("button", { name: "Algemene AI" }).click();
  await page.getByRole("button", { name: /ChatGPT/ }).click();
  await expect(page.getByRole("heading", { name: "ChatGPT" })).toBeVisible();
  await page.getByRole("button", { name: "Teksten schrijven of bewerken" }).click();
  await page.getByRole("button", { name: "Brainstormen" }).click();
  await page.getByRole("button", { name: "Opslaan" }).click();
  await expect(page.getByText("1. ChatGPT")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("2 toepassingen")).toBeVisible();
  await page.getByRole("button", { name: "Volgende" }).click();

  await expect(page).toHaveURL(/\/survey\/data$/, { timeout: 30_000 });
  await page.locator('input[value="interne_email"]').check({ force: true });
  await page.locator('input[value="ja_controle"]').check({ force: true });
  await page.locator('input[value="soms"]').check({ force: true });
  await page.getByRole("button", { name: "Volgende" }).click();

  await expect(page).toHaveURL(/\/survey\/accounts$/, { timeout: 30_000 });
  await page.locator('input[value="business_license"]').check({ force: true });
  await page.locator('input[value="ja_bewust"]').check({ force: true });
  await page.locator('input[value="agents_reeks_taken"]').check({ force: true });
  await page.getByRole("button", { name: "Volgende stap" }).click();

  await expect(page).toHaveURL(/\/survey\/literacy$/, { timeout: 30_000 });
  await page.locator('input[value="ja_goed"]').check();
  await page.locator('input[value="ease_of_use"]').check();
  await page.locator('input[value="gevorderd"]').check({ force: true });
  await page.locator('input[value="controle_handmatig"]').check();
  await page.getByRole("button", { name: "Volgende stap" }).click();

  await expect(page).toHaveURL(/\/survey\/future$/, { timeout: 30_000 });
  await page.locator('input[value="privacy"]').check();
  await page.locator('input[value="clear_policy"]').check();
  await page.locator('input[value="training"]').check();
  await page.getByRole("button", { name: "Naar afronding" }).click();

  await expect(page).toHaveURL(/\/survey\/complete$/, { timeout: 30_000 });
  await expect(page.getByText("Controleer je toolregistratie")).toBeVisible();
  await expect(page.getByRole("button", { name: "Nog een tool toevoegen" })).toHaveCount(0);
  await page.getByRole("button", { name: "Nee, liever niet" }).click();
  await page.getByRole("button", { name: "Scan afronden" }).click();

  await expect(
    page.getByRole("heading", { name: "Bedankt voor je input" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("De scansessie is gesloten na afronden.")).toBeVisible();
  await expect(page.getByText("mock-token")).toHaveCount(0);
});

test("respondent can opt in as ambassador during completion", async ({
  page,
}) => {
  await mockSupabaseRpc(page);
  await seedCompletedSurveySession(page);

  await page.goto("/survey/complete");
  await expect(page.getByText("Wil je meedenken als AI-ambassadeur?")).toBeVisible();
  await page.getByRole("button", { name: "Ja, lijkt me leuk" }).click();
  await page.getByPlaceholder("naam@organisatie.nl").fill("ambassadeur@example.com");
  await page.getByRole("button", { name: "Opslaan" }).click();
  await expect(
    page.getByText(
      "Fijn dat je wilt meedenken! Je e-mailadres is succesvol geregistreerd.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Scan afronden" }).click();

  await expect(
    page.getByRole("heading", { name: "Bedankt voor je input" }),
  ).toBeVisible({ timeout: 30_000 });
});

test("respondent with no current AI tools skips the toolpicker", async ({
  page,
}) => {
  await mockSupabaseRpc(page);
  await page.goto("/survey");
  await page.evaluate(() => window.sessionStorage.clear());
  await startSurvey(page);

  await expect(page).toHaveURL(/\/survey\/profile$/, { timeout: 30_000 });
  await page.locator('input[value="operations"]').check();
  await page.getByRole("button", { name: "Volgende stap" }).click();

  await expect(page).toHaveURL(/\/survey\/motivations$/, { timeout: 30_000 });
  await page.locator('input[value="never"]').check();
  await page.locator('input[value="weet_niet_hoe"]').check();
  await page.getByRole("button", { name: "Volgende stap" }).click();

  await expect(page).toHaveURL(/\/survey\/future$/, { timeout: 30_000 });
  await expect(page.getByText("Stap 5 van 5")).toBeVisible();
  await expect(page.getByText("Catalogus")).toHaveCount(0);
  await page.locator('input[value="privacy"]').check();
  await page.locator('input[value="training"]').check();
  await page.getByRole("button", { name: "Naar afronding" }).click();

  await expect(page).toHaveURL(/\/survey\/complete$/, { timeout: 30_000 });
  await expect(
    page.getByText("Je hebt aangegeven dat je nu geen AI-tools gebruikt"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nee, liever niet" }).click();
  await page.getByRole("button", { name: "Scan afronden" }).click();

  await expect(
    page.getByRole("heading", { name: "Bedankt voor je input" }),
  ).toBeVisible({ timeout: 30_000 });
});

test("complete step cannot be opened before a tool is saved", async ({
  page,
}) => {
  await page.goto("/survey/complete");
  await expect(
    page.getByRole("heading", { name: "Geen actieve scan" }),
  ).toBeVisible();
});

test("respondent can resume an active scan from the start page", async ({
  page,
}) => {
  await mockSupabaseRpc(page);
  await page.goto("/survey");
  await page.evaluate(() => window.sessionStorage.clear());
  await startSurvey(page);

  await expect(page).toHaveURL(/\/survey\/profile$/, { timeout: 30_000 });
  await page.locator('input[value="operations"]').check();
  await page.getByRole("button", { name: "Volgende stap" }).click();

  await expect(page).toHaveURL(/\/survey\/motivations$/, { timeout: 30_000 });
  await page.goto("/survey");
  await expect(page.getByText("Actieve scan gevonden")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Verder bij Frequentie" }),
  ).toBeVisible();
  await expect(page.getByText("1/8 klaar")).toBeVisible();
  await expect(page.getByText("0 tools opgeslagen")).toBeVisible();
  await expect(page.getByText("mock-token")).toHaveCount(0);
  await page.getByRole("link", { name: "Hervat actieve scan" }).click();

  await expect(page).toHaveURL(/\/survey\/motivations$/);
});

test("start page explains inactive or expired access codes", async ({
  page,
}) => {
  await page.route(SUPABASE_RPC_ROUTE, async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: corsHeaders(),
      });
      return;
    }

    await route.fulfill({
      status: 400,
      headers: jsonHeaders(),
      body: JSON.stringify({ message: "invalid_or_closed_wave" }),
    });
  });

  await page.goto("/survey");
  await page.evaluate(() => window.sessionStorage.clear());
  await startSurvey(page, "inactive-wave-token");

  await expect(
    page.getByText("Deze toegangscode is niet actief of verlopen."),
  ).toBeVisible();
  await expect(page.getByText("invalid_or_closed_wave")).toHaveCount(0);
});

test("guarded future steps redirect to the next open step", async ({ page }) => {
  await mockSupabaseRpc(page);
  await page.addInitScript((storageKey) => {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        runId: "00000000-0000-4000-8000-000000000001",
        submissionToken: "mock-token-guarded",
        startedAt: new Date().toISOString(),
        currentStep: "profile",
        completedSteps: ["profile"],
      }),
    );
  }, SURVEY_SESSION_STORAGE_KEY);

  await page.goto("/survey/data");

  await expect(page).toHaveURL(/\/survey\/motivations$/, {
    timeout: 30_000,
  });
  await expect(
    page.getByText("We hebben je teruggezet naar de eerstvolgende open stap."),
  ).toBeVisible();
});

async function seedCompletedSurveySession(page: import("@playwright/test").Page) {
  await page.goto("/survey");
  await page.evaluate((storageKey) => {
    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        runId: "00000000-0000-4000-8000-000000000777",
        submissionToken: "mock-token-seeded",
        startedAt: new Date().toISOString(),
        currentStep: "complete",
        completedSteps: [
          "profile",
          "motivations",
          "tools",
          "useCases",
          "data",
          "accounts",
          "literacy",
          "future",
        ],
        savedTools: [
          {
            surveyToolId: "00000000-0000-4000-9000-000000000777",
            toolName: "ChatGPT",
            useCaseCodes: ["teksten_schrijven"],
            contextCodes: [],
            accountTypeCode: "business_license",
            savedAt: new Date().toISOString(),
          },
        ],
      }),
    );
  }, SURVEY_SESSION_STORAGE_KEY);
}

async function startSurvey(page: Page, waveToken = E2E_WAVE_TOKEN) {
  await page.getByLabel("Toegangscode").fill(waveToken);
  await page.getByRole("button", { name: "Start de scan" }).click();
}

async function mockSupabaseRpc(page: import("@playwright/test").Page) {
  let sequence = 0;
  let completed = false;

  await page.route(SUPABASE_RPC_ROUTE, async (route) => {
    const request = route.request();
    const rpcName = new URL(request.url()).pathname.split("/").pop();

    if (request.method() === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: corsHeaders(),
      });
      return;
    }

    if (completed && rpcName !== "start_survey_run") {
      await route.fulfill({
        status: 400,
        headers: jsonHeaders(),
        body: JSON.stringify({ message: "invalid_token_or_run_closed" }),
      });
      return;
    }

    sequence += 1;

    if (rpcName === "start_survey_run") {
      await fulfillJson(route, [
        {
          run_id: `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
          submission_token: `mock-token-${sequence}`,
        },
      ]);
      return;
    }

    if (rpcName === "save_tool") {
      await fulfillJson(route, `00000000-0000-4000-9000-${String(sequence).padStart(12, "0")}`);
      return;
    }

    if (rpcName === "save_tool_use_case") {
      await fulfillJson(route, `00000000-0000-4000-a000-${String(sequence).padStart(12, "0")}`);
      return;
    }

    if (rpcName === "save_tool_use_cases") {
      await fulfillJson(route, [
        `00000000-0000-4000-a000-${String(sequence).padStart(12, "0")}`,
      ]);
      return;
    }

    if (rpcName === "register_tool_discovery") {
      await fulfillJson(route, `00000000-0000-4000-b000-${String(sequence).padStart(12, "0")}`);
      return;
    }

    if (rpcName === "complete_survey_run") {
      completed = true;
      await fulfillJson(route, null);
      return;
    }

    await fulfillJson(route, null);
  });
}

async function fulfillJson(
  route: import("@playwright/test").Route,
  value: unknown,
) {
  await route.fulfill({
    status: 200,
    headers: jsonHeaders(),
    body: JSON.stringify(value),
  });
}

function jsonHeaders() {
  return {
    ...corsHeaders(),
    "content-type": "application/json",
  };
}

function corsHeaders() {
  return {
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-origin": "*",
  };
}
