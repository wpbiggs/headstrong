import { expect, test } from "@playwright/test";

test("explicit catalog connection saves without record IDs and safely retries an accepted lost response", async ({
  page,
  request,
}) => {
  const fixture = await (
    await request.get("http://127.0.0.1:4000/__fixture")
  ).json();
  const calls: { url: string; method: string; body: string | null }[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/learning/"))
      calls.push({ url: r.url(), method: r.method(), body: r.postData() });
  });
  await page.goto("/learn");
  await page.getByRole("button", { name: /Optional: leave/ }).click();
  await page
    .getByRole("textbox", { name: /What surprised/ })
    .fill("I wondered how a different wing could change the next flight.");
  await page
    .getByRole("button", { name: "Save an island discovery (optional)" })
    .click();
  await page.getByLabel("Discovery learner token").fill(fixture.tokens.learner);
  expect(calls).toEqual([]);
  await page
    .getByRole("button", { name: "Find my approved adventures and records" })
    .click();
  const choices = page.getByLabel("Approved Awakening adventure");
  await expect(choices.locator("option")).toHaveCount(2);
  expect(calls.map((c) => c.method)).toEqual(["GET", "GET"]);
  expect(calls.every((c) => c.body === null)).toBeTruthy();
  const questId = await choices.locator("option").nth(1).getAttribute("value");
  await choices.selectOption(questId as string);
  await expect(page.getByLabel("Awakening record ID")).toHaveValue("");
  await page.getByLabel("Share my optional island note").check();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/discovery-connection-mobile.png",
    fullPage: true,
    mask: [page.getByLabel("Discovery learner token")],
  });
  const submitted: Record<string, unknown>[] = [];
  const statuses: number[] = [];
  await page.route("**/learning/discoveries", async (route) => {
    submitted.push(route.request().postDataJSON());
    const response = await route.fetch();
    statuses.push(response.status());
    if (submitted.length === 1) await route.abort("failed");
    else await route.fulfill({ response });
  });
  const share = page.getByRole("button", {
    name: "Share this discovery with my trusted adults",
  });
  await share.click();
  await expect(page.getByRole("alert")).toBeVisible();
  await share.click();
  await expect(page.getByRole("status")).toContainText(
    "Your discovery was saved",
  );
  expect(statuses).toEqual([201, 200]);
  expect(submitted[0]).toEqual(submitted[1]);
  expect(Object.keys(submitted[0]).sort()).toEqual([
    "observedEntityIds",
    "questId",
    "reflection",
    "scene",
    "submissionId",
  ]);
  const id = submitted[0].submissionId as string;
  const saved = await (
    await request.get(`http://127.0.0.1:4000/learning/goals/${id}`, {
      headers: { Authorization: `Bearer ${fixture.tokens.parent}` },
    })
  ).json();
  expect(saved.journey.evidence.reflection).toContain("different wing");
  expect(saved.journey.feedback).toBeNull();
  expect(saved.journey.satisfaction).toBeNull();
  expect(
    calls
      .filter((c) => c.method === "POST")
      .every((c) => c.url.endsWith("/discoveries")),
  ).toBeTruthy();
  await page.getByRole("button", { name: /Back to paused island/ }).click();
  await page.getByRole("button", { name: "Connect saved workspace" }).click();
  await page
    .getByLabel("Bearer token", { exact: true })
    .fill(fixture.tokens.parent);
  await page
    .getByRole("button", { name: "Find authorized discovery records" })
    .click();
  const records = page.getByLabel("Authorized discovery records");
  await expect(records.locator(`option[value="${id}"]`)).toHaveCount(1);
  await records.selectOption(id);
  await page
    .getByRole("button", { name: "Load journey / refresh feedback" })
    .click();
  await expect(
    page.getByText(saved.journey.evidence.reflection, { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Guardian reply", { exact: true })
    .fill("I noticed your question. Keep trying your own ideas.");
  await page
    .getByRole("button", { name: "Send guardian encouragement once" })
    .click();
  await expect(
    page.getByText("I noticed your question. Keep trying your own ideas.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Bearer token", { exact: true })
    .fill(fixture.tokens.stranger);
  await expect(records.locator("option")).toHaveCount(1);
  await expect(page.getByLabel("Goal ID", { exact: true })).toHaveValue("");
  await expect(
    page.getByText(saved.journey.evidence.reflection, { exact: true }),
  ).toHaveCount(0);
});

test("changing the discovery session discards a delayed authorized catalog", async ({
  page,
  request,
}) => {
  const fixture = await (
    await request.get("http://127.0.0.1:4000/__fixture")
  ).json();
  const catalog = await (
    await request.get("http://127.0.0.1:4000/learning/quests", {
      headers: { Authorization: `Bearer ${fixture.tokens.learner}` },
    })
  ).json();
  let release = () => {};
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/learning/quests", async (route) => {
    await delayed;
    try {
      await route.fulfill({ json: catalog });
    } catch {
      /* Session change aborts the request. */
    }
  });
  await page.goto("/learn");
  await page
    .getByRole("button", { name: "Save an island discovery (optional)" })
    .click();
  await page.getByLabel("Discovery learner token").fill(fixture.tokens.learner);
  await page
    .getByRole("button", { name: "Find my approved adventures and records" })
    .click();
  await expect(page.getByRole("status")).toContainText("Checking");
  await page
    .getByLabel("Discovery learner token")
    .fill(fixture.tokens.stranger);
  release();
  await expect(
    page.getByLabel("Approved Awakening adventure").locator("option"),
  ).toHaveCount(1);
  await expect(
    page.getByLabel("My saved discovery records").locator("option"),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", {
      name: "Share this discovery with my trusted adults",
    }),
  ).toBeDisabled();
});
