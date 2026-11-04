import { expect, test } from "@playwright/test";

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
  await page.getByRole("link", { name: "Build & fly" }).tap();
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
  await page.getByRole("link", { name: "Build & fly" }).tap();
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
