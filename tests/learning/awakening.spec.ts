import { expect, test } from "@playwright/test";

test("open trail preserves a flight and offers local sky experiments without uploads", async ({
  page,
}) => {
  const calls: string[] = [];
  const resizeErrors: string[] = [];
  page.on("pageerror", (error) => {
    if (error.message.includes("ResizeObserver"))
      resizeErrors.push(error.message);
  });
  page.on("request", (r) => {
    if (r.url().includes("/learning/")) calls.push(r.url());
  });
  await page.goto("/learn");
  await expect(
    page.getByRole("button", { name: "Observatory", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Observatory", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("region", { name: "Observatory experiments" }),
  ).toBeVisible();
  const layout = await page.evaluate(() => {
    const trail = document
      .querySelector("#island-trail")
      ?.getBoundingClientRect();
    const world = document
      .querySelector(".island-world")
      ?.getBoundingClientRect();
    const sky = document
      .querySelector(".sky-workshop")
      ?.getBoundingClientRect();
    if (!trail || !world || !sky) throw new Error("Trail layout is missing");
    return {
      trailAboveWorld: trail.bottom <= world.top,
      skyBesideWorld: sky.left >= world.right,
    };
  });
  expect(layout).toEqual({ trailAboveWorld: true, skyBesideWorld: true });
  await expect(
    page.getByRole("region", { name: "Flight controls" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Kite constellation" }).click();
  await page.getByRole("button", { name: "Close lens", exact: true }).click();
  await expect(
    page.getByRole("img", { name: /kite constellation, close lens/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Workshop", exact: true }).click();
  await page.getByRole("button", { name: "Launch glider" }).click();
  await expect(page.locator(".flight-readout")).not.toContainText("0 / 70 m");
  await page.getByRole("button", { name: "Seed garden", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Island trail" }).getByRole("status"),
  ).toContainText("unfinished flight is held");
  await page
    .getByRole("button", { name: "Release a seed on the wind" })
    .click();
  await page.keyboard.press("ArrowRight");
  await page.getByRole("button", { name: "Stop & rest", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Observatory", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Resume adventure", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Observatory", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Close lens", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("region", { name: "Observatory experiments" })
    .screenshot({ path: "test-results/observatory-mobile.png" });
  await page.getByRole("button", { name: "Workshop", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "← Sheltered cove", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "You carried the spark." }),
  ).toBeVisible({ timeout: 15000 });
  expect(calls).toEqual([]);
  expect(resizeErrors).toEqual([]);
  await page.getByRole("button", { name: "Reset island", exact: true }).click();
  await page.getByRole("button", { name: "Observatory", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Wide lens", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("closing or changing the discovery session discards late responses and never uploads notes", async ({
  page,
  request,
}) => {
  const fixture = await (
    await request.get("http://127.0.0.1:4000/__fixture")
  ).json();
  const response = await request.get(
    `http://127.0.0.1:4000/learning/goals/${fixture.adventureGoalId}`,
    { headers: { Authorization: `Bearer ${fixture.tokens.learner}` } },
  );
  const detail = await response.json();
  const writes: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") writes.push(r.url());
  });
  await page.goto("/learn");
  await page.getByRole("button", { name: /Optional: leave/ }).click();
  await page
    .getByRole("textbox", { name: /What surprised/ })
    .fill("This note stays private unless I choose to share it.");
  await page
    .getByRole("button", { name: "Save an island discovery (optional)" })
    .click();
  await page.getByLabel("Share my optional island note").check();
  await page.getByLabel("Discovery learner token").fill(fixture.tokens.learner);
  await page.getByLabel("Awakening record ID").fill(fixture.adventureGoalId);
  let release = () => {};
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/learning/goals/*", async (route) => {
    await delayed;
    try {
      await route.fulfill({ json: detail });
    } catch {
      /* Aborted after session change. */
    }
  });
  await page
    .getByRole("button", { name: "Check record / refresh human feedback" })
    .click();
  await expect(page.getByRole("status")).toContainText("Checking");
  await page
    .getByLabel("Discovery learner token")
    .fill(fixture.tokens.stranger);
  release();
  await expect(
    page.getByRole("button", {
      name: "Share this discovery with my trusted adults",
    }),
  ).toBeDisabled();
  await expect(page.getByText(/Record: [a-f0-9]/)).toHaveCount(0);
  await page.getByRole("button", { name: /Back to paused island/ }).click();
  await expect(
    page.getByRole("heading", { name: "A good place to rest." }),
  ).toBeVisible();
  expect(writes).toEqual([]);
});

test("explicit adventure save previews only selected flights, rejects unrelated quests and receives human feedback", async ({
  page,
  request,
}) => {
  const fixture = await (
    await request.get("http://127.0.0.1:4000/__fixture")
  ).json();
  const headers = { Authorization: `Bearer ${fixture.tokens.learner}` };
  const unrelated = await (
    await request.post("http://127.0.0.1:4000/learning/goals", {
      headers,
      data: { objective: "Understand equal fraction pieces" },
    })
  ).json();
  await request.post(
    `http://127.0.0.1:4000/learning/goals/${unrelated.id}/quest`,
    { headers, data: { questId: fixture.questId } },
  );
  const writes: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") writes.push(r.url());
  });
  await page.goto("/learn");
  await page.getByRole("button", { name: "Launch glider" }).click();
  await expect(
    page.getByRole("heading", { name: "You carried the spark." }),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: /Optional: leave/ }).click();
  await page
    .getByRole("textbox", { name: /What surprised/ })
    .fill("PRIVATE unsent note about my experiment.");
  await page
    .getByRole("button", { name: "Save an island discovery (optional)" })
    .click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(
    page.getByText("Nothing selected.", { exact: false }),
  ).toBeVisible();
  expect(writes).toEqual([]);
  await expect(
    page.getByLabel("Share my optional island note"),
  ).not.toBeChecked();
  await page.getByLabel(/Share completed flights/).check();
  await expect(page.locator(".discovery-preview")).toContainText("70 m");
  await expect(page.locator(".discovery-preview")).not.toContainText("PRIVATE");
  await page.getByLabel("Discovery learner token").fill(fixture.tokens.learner);
  await page.getByLabel("Awakening record ID").fill(unrelated.id);
  await expect(page.getByLabel(/Share completed flights/)).not.toBeChecked();
  await page.getByLabel(/Share completed flights/).check();
  await page
    .getByRole("button", { name: "Check record / refresh human feedback" })
    .click();
  await expect(
    page.locator(".discovery-save").getByRole("alert"),
  ).toContainText("not a currently approved Awakening record");
  expect(writes).toEqual([]);
  await page.getByLabel("Awakening record ID").fill(fixture.adventureGoalId);
  await page
    .getByRole("button", { name: "Check record / refresh human feedback" })
    .click();
  const share = page.getByRole("button", {
    name: "Share this discovery with my trusted adults",
  });
  await expect(share).toBeEnabled();
  expect(writes).toEqual([]);
  await share.click();
  await expect(page.getByRole("status")).toContainText(
    "Your discovery was saved",
  );
  await expect(share).toBeDisabled();
  expect(writes).toEqual([
    `http://127.0.0.1:4000/learning/goals/${fixture.adventureGoalId}/evidence`,
  ]);
  const saved = await (
    await request.get(
      `http://127.0.0.1:4000/learning/goals/${fixture.adventureGoalId}`,
      { headers: { Authorization: `Bearer ${fixture.tokens.parent}` } },
    )
  ).json();
  expect(saved.journey.evidence.reflection).toContain("70 m");
  expect(saved.journey.evidence.reflection).not.toContain("PRIVATE");
  const feedback = await request.post(
    `http://127.0.0.1:4000/learning/goals/${fixture.adventureGoalId}/feedback`,
    {
      headers: { Authorization: `Bearer ${fixture.tokens.educator}` },
      data: {
        assessment: "needs_practice",
        comment:
          "I noticed your experiment. Try changing only the wing next time.",
      },
    },
  );
  expect(feedback.status()).toBe(201);
  await page
    .getByRole("button", { name: "Check record / refresh human feedback" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Human educator feedback" }),
  ).toBeVisible();
  await expect(page.getByText(/I noticed your experiment/)).toBeVisible();
  await page.screenshot({
    path: "test-results/awakening-discovery-desktop.png",
    fullPage: true,
    mask: [page.getByLabel("Discovery learner token")],
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/awakening-discovery-mobile.png",
    fullPage: false,
    mask: [page.getByLabel("Discovery learner token")],
  });
  await page
    .getByRole("heading", { name: "Human educator feedback" })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/awakening-discovery-mobile-feedback.png",
    fullPage: false,
    mask: [page.getByLabel("Discovery learner token")],
  });
  await page.getByRole("button", { name: /Back to paused island/ }).click();
  await expect(
    page.getByRole("heading", { name: "A good place to rest." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resume adventure", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "You carried the spark." }),
  ).toBeVisible();
  await expect(page.locator(".session-tag")).toContainText(
    "SHARE ONLY BY CHOICE",
  );
  await page
    .getByRole("button", { name: "Save an island discovery (optional)" })
    .click();
  await expect(page.getByLabel("Discovery learner token")).toHaveValue("");
  await expect(page.getByLabel(/Share completed flights/)).not.toBeChecked();
  await page.getByRole("button", { name: /Back to paused island/ }).click();
  await page.getByRole("button", { name: "Connect saved workspace" }).click();
  await page
    .getByLabel("Bearer token", { exact: true })
    .fill(fixture.tokens.parent);
  await page
    .getByLabel("Goal ID", { exact: true })
    .fill(fixture.adventureGoalId);
  await page
    .getByRole("button", { name: "Load journey / refresh feedback" })
    .click();
  await page
    .getByLabel("Guardian reply", { exact: true })
    .fill("I enjoyed seeing you try a new idea. What could you explore next?");
  await page
    .getByRole("button", { name: "Send guardian encouragement once" })
    .click();
  await expect(
    page.getByText("I enjoyed seeing you try a new idea.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send guardian encouragement once" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "← Back to paused island", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save an island discovery (optional)" })
    .click();
  await page.getByLabel("Discovery learner token").fill(fixture.tokens.learner);
  await page.getByLabel("Awakening record ID").fill(fixture.adventureGoalId);
  await page
    .getByRole("button", { name: "Check record / refresh human feedback" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Guardian encouragement", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("heading", { name: "Guardian encouragement", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/guardian-encouragement-mobile.png",
    fullPage: false,
    mask: [page.getByLabel("Discovery learner token")],
  });
  await expect(
    page.getByText("I enjoyed seeing you try a new idea.", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => [
      Object.keys(localStorage),
      Object.keys(sessionStorage),
    ]),
  ).toEqual([[], []]);
});

test("game-first entry, contrasting experiments, keyboard steering, consequence, rest/reset and privacy", async ({
  page,
}) => {
  const requests: string[] = [];
  const writes: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.hostname !== "127.0.0.1" ||
      url.port === "4000" ||
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/learning/") ||
      request.method() !== "GET"
    )
      requests.push(request.url());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      (window as unknown as { storageWrites: string[] }).storageWrites.push(
        key,
      );
      return original.call(this, key, value);
    };
    (window as unknown as { storageWrites: string[] }).storageWrites = [];
  });
  const start = Date.now();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "The Awakening", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Launch glider" }),
  ).toBeEnabled();
  expect(Date.now() - start).toBeLessThan(60_000);
  await expect(page.getByLabel("Bearer token")).toHaveCount(0);
  await expect(page.locator("textarea")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /operator|dashboard/i }),
  ).toHaveCount(0);
  await expect(page.getByText("PlayCanvas ready — island view")).toBeVisible();
  await page.screenshot({
    path: "test-results/awakening-entry.png",
    fullPage: true,
  });

  // Deliberately mismatch the wing and wind: a soft cove landing, not a penalty.
  const swept = page.getByRole("button", { name: "Swept · wind-cutting" });
  await swept.focus();
  await page.keyboard.press("Enter");
  await expect(swept).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Launch glider" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/soft landing. A new idea/i)).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator(".experiment-list")).toContainText("35 m");
  await expect(page.locator(".island-world")).not.toHaveClass(/awakened/);
  await page.screenshot({
    path: "test-results/awakening-cove.png",
    fullPage: true,
  });

  await page.getByRole("button", { name: "Return to workshop" }).click();
  await page.getByRole("button", { name: "Launch glider" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", { name: "Ridge crosswind" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Enter");
  // Stop mid-flight: no canvas or clock remains; resume preserves this experiment.
  await page.keyboard.press("Escape");
  await expect(page.locator("canvas")).toHaveCount(0);
  const frozen = await page.getByLabel("Flight instruments").innerText();
  await page.waitForTimeout(500);
  expect(await page.getByLabel("Flight instruments").innerText()).toBe(frozen);
  await page
    .getByRole("button", { name: "Resume adventure", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "You carried the spark." }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".island-world")).toHaveClass(/awakened/);
  await expect(page.locator(".experiment-list li")).toHaveCount(2);
  await expect(page.locator(".experiment-list")).toContainText("70 m");
  await page.getByRole("button", { name: /Offer the Lumiling/ }).click();
  await expect(
    page.getByText("It now flies beside your glider."),
  ).toBeVisible();
  await page.getByRole("button", { name: /Turn the wind ribbon/ }).click();
  await expect(page.getByText(/Compare the same wing/)).toBeVisible();
  await page.screenshot({
    path: "test-results/awakening-restored.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /Optional: leave/ }).click();
  await page
    .getByRole("textbox", { name: /What surprised/ })
    .fill("Synthetic discovery: swept wings worked on the ridge.");

  // Explicit opt-in opens the inherited record form, never copies local notes.
  await page.getByRole("button", { name: "Connect saved workspace" }).click();
  await expect(page.getByLabel("Bearer token", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/does not receive your island notes/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to paused island" }).click();
  await expect(
    page.getByRole("heading", { name: "A good place to rest." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset island" }).click();
  await expect(page.locator(".island-world")).not.toHaveClass(/awakened/);
  await expect(page.locator(".experiment-list li")).toHaveCount(0);
  await expect(page.locator("textarea")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Wide · floating" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: /Offer the Lumiling/ }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: /Optional: leave/ }).click();
  await expect(
    page.getByRole("textbox", { name: /What surprised/ }),
  ).toHaveValue("");
  writes.push(
    ...(await page.evaluate(
      () => (window as unknown as { storageWrites: string[] }).storageWrites,
    )),
  );
  await page.reload();
  await expect(page.locator("textarea")).toHaveCount(0);
  writes.push(
    ...(await page.evaluate(
      () => (window as unknown as { storageWrites: string[] }).storageWrites,
    )),
  );
  expect(writes).toEqual([]);
  expect(
    await page.evaluate(() => [
      Object.keys(localStorage),
      Object.keys(sessionStorage),
    ]),
  ).toEqual([[], []]);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test("touch-sized controls and full experiment remain usable without WebGL or reflection", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() =>
      null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto("/learn");
  await expect(page.getByText(/3D unavailable/)).toBeVisible();
  await page.getByRole("button", { name: "Build & fly" }).tap();
  await page.getByRole("button", { name: "Swept · wind-cutting" }).tap();
  await page.getByRole("button", { name: "Ridge crosswind" }).tap();
  await expect(
    page.getByRole("button", { name: "Ridge crosswind" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Launch glider" }).tap();
  await page.getByRole("button", { name: "Sheltered cove" }).tap();
  await expect(page.getByRole("heading", { name: /soft landing/ })).toBeVisible(
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: "Return to workshop" }).tap();
  await page.getByRole("button", { name: "Wide · floating" }).tap();
  await page.getByRole("button", { name: "Launch glider" }).tap();
  await expect(
    page.getByRole("heading", { name: "You carried the spark." }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.locator("textarea")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  for (const name of ["Reset island", "Stop & rest", "Rest here"]) {
    const bounds = await page
      .getByRole("button", { name, exact: true })
      .boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
  }
  await page.screenshot({
    path: "test-results/awakening-touch-fallback.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reset island" }).tap();
  await expect(page.locator(".experiment-list li")).toHaveCount(0);
  await context.close();
});

test("mobile WebGL view renders, touch flight restores world, repeated pause/resume disposes cleanly", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/learn");
  await expect(page.getByText("PlayCanvas ready — island view")).toBeVisible();
  await page.screenshot({
    path: "test-results/awakening-mobile-webgl.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Build & fly" }).tap();
  await page.getByRole("button", { name: "Launch glider" }).tap();
  await expect(
    page.getByRole("heading", { name: "You carried the spark." }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.locator(".island-world")).toHaveClass(/awakened/);
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Stop & rest", exact: true }).tap();
    await expect(page.locator("canvas")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Resume adventure", exact: true })
      .first()
      .tap();
    await expect(
      page.getByText("PlayCanvas ready — island view"),
    ).toBeVisible();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/awakening-mobile-restored.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await context.close();
});
