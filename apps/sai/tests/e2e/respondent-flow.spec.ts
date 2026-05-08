import { expect, test } from "@playwright/test";

const SUPABASE_RPC_ROUTE = "**/rest/v1/rpc/**";

test("respondent can complete the SAI survey flow with two tools", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await mockSupabaseRpc(page);
  await page.goto("/survey");
  await page.evaluate(() => window.sessionStorage.clear());
  await page.getByRole("button", { name: "Start de scan" }).click();

  await expect(page).toHaveURL(/\/survey\/profile$/, { timeout: 30_000 });
  await page.locator('input[value="marketing_communicatie"]').check();
  await page.getByLabel("AI-gebruik frequentie").selectOption("daily");
  await page.getByLabel("Bewustzijn over data-opslag").selectOption("ja_controle");
  await page.getByLabel("Anonimiseren van informatie").selectOption("soms");
  await page.getByLabel("AI-browserextensies").selectOption("ja_bewust");
  await page
    .getByLabel("AI-agents of automatisering")
    .selectOption("agents_reeks_taken");
  await page.getByLabel("Bekendheid met AI-spelregels").selectOption("ja_goed");
  await page.getByLabel("Eigen AI-vaardigheid").selectOption("gevorderd");
  await page
    .getByLabel("Hoe verwerk je AI-output?")
    .selectOption("controle_handmatig");
  await page.getByRole("button", { name: "Verder" }).click();

  await expect(page).toHaveURL(/\/survey\/motivations$/, { timeout: 30_000 });
  await page.locator('input[value="complexe_taken"]').check();
  await page.locator('input[value="experimenteren"]').check();
  await page.getByRole("button", { name: "Verder" }).click();

  await expect(page).toHaveURL(/\/survey\/data$/, { timeout: 30_000 });
  await page.locator('input[value="internal_emails"]').check();
  await page.locator('input[value="financial_data"]').check();
  await expect(page.getByText("3 geselecteerd").first()).toBeVisible();
  await page.locator('input[value="unsure"]').check();
  await expect(page.locator('input[value="customer_data"]')).not.toBeChecked();
  await expect(page.locator('input[value="internal_emails"]')).not.toBeChecked();
  await expect(page.locator('input[value="financial_data"]')).not.toBeChecked();
  await expect(page.locator('input[value="unsure"]')).toBeChecked();
  await expect(page.getByText(/exclusieve keuze/)).toBeVisible();
  await page.locator('input[value="internal_emails"]').check();
  await page.locator('input[value="financial_data"]').check();
  await page.locator('input[value="accuracy"]').check();
  await page.locator('input[value="privacy_security"]').check();
  await page.locator('input[value="training"]').check();
  await page.locator('input[value="technical_advice"]').check();
  await page.locator('input[value="speed"]').check();
  await page.locator('input[value="quality"]').check();
  await page.getByRole("button", { name: "Verder" }).click();

  await expect(page).toHaveURL(/\/survey\/tools$/, { timeout: 30_000 });
  await page.getByRole("button", { name: "Tool opslaan" }).click();
  await expect(page.getByRole("heading", { name: "1. ChatGPT" })).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: "Algemene AI" }).click();
  await page.getByLabel("Zoek tool").fill("Claude");
  await page.locator('input[value="claude"]').check();
  await page.locator('input[value="code_schrijven"]').check();
  await page.locator('input[value="beslisondersteuning"]').check();
  await page.getByRole("button", { name: "Tool opslaan" }).click();
  await expect(page.getByRole("heading", { name: "2. Claude" })).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole("button", { name: "Verder naar afronden" }).click();

  await expect(page).toHaveURL(/\/survey\/complete$/, { timeout: 30_000 });
  await expect(page.getByText("Geregistreerde tools")).toBeVisible();
  await expect(page.getByText("ChatGPT")).toBeVisible();
  await expect(page.getByText("Claude")).toBeVisible();
  await expect(page.getByText("sai-smoke-wave-token")).not.toBeVisible();

  await page.getByRole("button", { name: "Scan afronden" }).click();
  await expect(page.getByRole("heading", { name: "Bedankt voor je input" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/Supabase geweigerd na completion/)).toBeVisible();
});

test("complete step cannot be opened before a tool is saved", async ({
  page,
}) => {
  await page.goto("/survey/complete");
  await expect(page.getByRole("heading", { name: "Geen actieve scan" })).toBeVisible();
});

test("profile step validates dependent required answers before saving", async ({
  page,
}) => {
  await mockSupabaseRpc(page);
  await page.goto("/survey");
  await page.evaluate(() => window.sessionStorage.clear());
  await page.getByRole("button", { name: "Start de scan" }).click();

  await expect(page).toHaveURL(/\/survey\/profile$/, { timeout: 30_000 });
  await page.locator('input[value="anders"]').check();
  await page.getByRole("button", { name: "Verder" }).click();
  await expect(
    page.getByText("Vul jouw vakgebied in.").first(),
  ).toBeVisible();

  await page.locator('input[value="marketing_communicatie"]').check();
  await page.getByLabel("AI-gebruik frequentie").selectOption("never");
  await page.getByRole("button", { name: "Verder" }).click();
  await expect(
    page.getByText("Kies waarom je AI nog niet gebruikt."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/survey\/profile$/);
});

test("motivations step validates required choices before saving", async ({
  page,
}) => {
  await mockSupabaseRpc(page);
  await page.goto("/survey");
  await page.evaluate(() => window.sessionStorage.clear());
  await page.getByRole("button", { name: "Start de scan" }).click();

  await expect(page).toHaveURL(/\/survey\/profile$/, { timeout: 30_000 });
  await page.getByRole("button", { name: "Verder" }).click();

  await expect(page).toHaveURL(/\/survey\/motivations$/, { timeout: 30_000 });
  await page.locator('input[value="tijdswinst"]').uncheck();
  await page.locator('input[value="kwaliteitsverbetering"]').uncheck();
  await page.getByRole("button", { name: "Verder" }).click();
  await expect(
    page.getByText("Kies minimaal een motivatie voordat je doorgaat."),
  ).toBeVisible();

  await page.locator('input[value="anders"]').check();
  await page.getByRole("button", { name: "Verder" }).click();
  await expect(
    page.getByText("Vul kort in wat je andere motivatie is."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/survey\/motivations$/);
});

test("data step validates required groups before saving", async ({ page }) => {
  await mockSupabaseRpc(page);
  await page.goto("/survey");
  await page.evaluate(() => window.sessionStorage.clear());
  await page.getByRole("button", { name: "Start de scan" }).click();

  await expect(page).toHaveURL(/\/survey\/profile$/, { timeout: 30_000 });
  await page.getByRole("button", { name: "Verder" }).click();

  await expect(page).toHaveURL(/\/survey\/motivations$/, { timeout: 30_000 });
  await page.getByRole("button", { name: "Verder" }).click();

  await expect(page).toHaveURL(/\/survey\/data$/, { timeout: 30_000 });
  await page.locator('input[value="customer_data"]').uncheck();
  await page.locator('input[value="privacy"]').uncheck();
  await page.locator('input[value="clear_policy"]').uncheck();
  await page.locator('input[value="ease_of_use"]').uncheck();
  await page.getByRole("button", { name: "Verder" }).click();

  await expect(page.getByText(/Kies minimaal een datatype/)).toBeVisible();
  await expect(page.getByText(/Kies minimaal een zorg/)).toBeVisible();
  await expect(
    page.getByText(/Kies minimaal een vorm van ondersteuning/),
  ).toBeVisible();
  await expect(
    page.getByText(/Kies minimaal een reden voor je toolvoorkeur/),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/survey\/data$/);
});

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
