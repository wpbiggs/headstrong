import { expect, test } from "@playwright/test";

test("waterworks changes seeded beds without WebGL, conserves a cup and never runs a care clock or upload", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).includes("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/learning/")) calls.push(r.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/learn");
  await expect(page.getByText(/3D unavailable/)).toBeVisible();
  await page.getByRole("button", { name: "Seed garden", exact: true }).click();
  const water = page.getByRole("region", { name: "Garden waterworks" });
  await page
    .getByRole("button", { name: "Water channels", exact: true })
    .click();
  await water.getByRole("button", { name: "Pour one cup" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".seedwind-bed").nth(0)).toContainText(
    "Ripples cross the empty soil",
  );
  await expect(water.getByRole("img")).toHaveAccessibleName(
    "Last poured water: cove 3, slope 0, terrace 0 drops",
  );
  await page.getByRole("button", { name: "Seed breeze", exact: true }).click();
  await page
    .getByRole("button", { name: "Release a seed on the wind" })
    .click();
  await page
    .getByRole("button", { name: "Water channels", exact: true })
    .click();
  await expect(page.locator(".seedwind-bed").nth(0)).toContainText(
    "tall golden blossoms",
  );
  await water.getByRole("button", { name: "Split three ways" }).click();
  await expect(water.locator(".water-preview")).toContainText(
    "cove 1, slope 1, terrace 1",
  );
  await expect(water.getByRole("img")).toHaveAccessibleName(
    "Last poured water: cove 3, slope 0, terrace 0 drops",
  );
  await water.getByRole("button", { name: "Pour one cup" }).click();
  await expect(page.locator(".seedwind-bed").nth(0)).toContainText(
    "low, wide leaves",
  );
  await expect(water.getByRole("img")).toHaveAccessibleName(
    "Last poured water: cove 1, slope 1, terrace 1 drops",
  );
  await page.getByRole("button", { name: "Observatory", exact: true }).click();
  await page.getByRole("button", { name: "Seed garden", exact: true }).click();
  await page
    .getByRole("button", { name: "Water channels", exact: true })
    .click();
  await expect(page.locator(".seedwind-bed.watered")).toHaveCount(3);
  await page.getByRole("button", { name: "Stop & rest", exact: true }).click();
  await expect(
    water.getByRole("button", { name: "Pour one cup" }),
  ).toBeDisabled();
  await expect(
    water.getByRole("button", { name: "Cove channel" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Resume adventure", exact: true })
    .first()
    .click();
  await water.getByRole("button", { name: "Terrace channel" }).click();
  for (let i = 0; i < 4; i++)
    await water.getByRole("button", { name: "Pour one cup" }).click();
  await expect(
    water.getByRole("list", { name: "Your last water routes" }).locator("li"),
  ).toHaveCount(4);
  await expect(page.locator(".seedwind-bed").nth(0)).toContainText(
    "safe, not failing",
  );
  await expect(page.locator(".seedwind-bed.watered")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await water.screenshot({ path: "test-results/waterworks-mobile.png" });
  await page
    .getByRole("button", { name: "Save an island discovery (optional)" })
    .click();
  await expect(page.getByLabel("Share seed experiments (1)")).not.toBeChecked();
  await page.getByLabel("Share seed experiments (1)").check();
  await expect(page.locator(".discovery-preview")).toContainText(
    "Selected seed releases",
  );
  await expect(page.locator(".discovery-preview")).not.toContainText(
    /water|drops|channel/i,
  );
  expect(calls).toEqual([]);
  await page.getByRole("button", { name: /Back to paused island/ }).click();
  await page.getByRole("button", { name: "Reset island", exact: true }).click();
  await page.getByRole("button", { name: "Seed garden", exact: true }).click();
  await page
    .getByRole("button", { name: "Water channels", exact: true })
    .click();
  await expect(water.locator(".water-result")).toContainText(
    "The pump is waiting",
  );
  await expect(page.locator(".seedwind-bed.watered")).toHaveCount(0);
  await expect(
    water.getByRole("list", { name: "Your last water routes" }),
  ).toHaveCount(0);
});

test("seed choices grow contrasting patches without WebGL, accounts, flights or mandatory reflection; sharing is explicit", async ({
  page,
  request,
}) => {
  const fixture = await (
    await request.get("http://127.0.0.1:4000/__fixture")
  ).json();
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof original>
    ) {
      if (String(args[0]).includes("webgl")) return null;
      return original.apply(this, args);
    } as typeof original;
  });
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/learning/")) calls.push(r.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/learn");
  await expect(page.getByText(/3D unavailable/)).toBeVisible();
  await page.getByRole("button", { name: "Seed garden", exact: true }).click();
  const garden = page.getByRole("region", { name: "Seedwind garden" });
  await garden
    .getByRole("button", { name: "Release a seed on the wind" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(garden.locator(".seedwind-result")).toContainText("2 m");
  await expect(garden.locator(".seedwind-bed").nth(0)).toContainText(
    "1 growing clump",
  );
  await garden.getByRole("button", { name: "Feathered · catches air" }).click();
  await garden
    .getByRole("button", { name: "Release a seed on the wind" })
    .click();
  await expect(garden.locator(".seedwind-result")).toContainText("6 m");
  await expect(garden.locator(".seedwind-bed").nth(1)).toContainText(
    "1 growing clump",
  );
  await garden.getByRole("button", { name: "Ridge gust", exact: true }).click();
  await garden
    .getByRole("button", { name: "Release a seed on the wind" })
    .click();
  await expect(garden.locator(".seedwind-result")).toContainText("14 m");
  await expect(garden.locator(".seedwind-bed").nth(2)).toContainText(
    "1 growing clump",
  );
  await expect(
    page.getByText("◇ A SLEEPING BEACON ACROSS THE COVE"),
  ).toBeVisible();
  expect(calls).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await garden.screenshot({ path: "test-results/seedwind-garden-mobile.png" });
  await page.getByRole("button", { name: "Stop & rest", exact: true }).click();
  await expect(
    garden.getByRole("button", { name: "Release a seed on the wind" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Resume adventure", exact: true })
    .first()
    .click();
  await expect(garden.locator(".seedwind-bed.growing")).toHaveCount(3);
  await page.getByRole("button", { name: "Workshop", exact: true }).click();
  await page.getByRole("button", { name: /Optional: leave/ }).click();
  await page
    .getByRole("textbox", { name: /What surprised/ })
    .fill("PRIVATE note that must not be uploaded.");
  await page
    .getByRole("button", { name: "Save an island discovery (optional)" })
    .click();
  await expect(page.getByLabel("Share seed experiments (3)")).not.toBeChecked();
  await page.getByLabel("Discovery learner token").fill(fixture.tokens.learner);
  expect(calls).toEqual([]);
  await page
    .getByRole("button", { name: "Find my approved adventures and records" })
    .click();
  const choices = page.getByLabel("Approved Awakening adventure");
  await expect(choices.locator("option")).toHaveCount(2);
  await choices.selectOption({ index: 1 });
  await page.getByLabel("Share seed experiments (3)").check();
  await expect(page.locator(".discovery-preview")).toContainText(
    "14 m · terrace bed",
  );
  await expect(page.locator(".discovery-preview")).not.toContainText("PRIVATE");
  await expect(page.locator(".discovery-preview")).not.toContainText(
    "Selected flights",
  );
  const post = page.waitForRequest(
    (r) => r.url().endsWith("/learning/discoveries") && r.method() === "POST",
  );
  await page
    .getByRole("button", {
      name: "Share this discovery with my trusted adults",
    })
    .click();
  const body = (await post).postDataJSON();
  expect(body.reflection).toContain("Selected seed releases");
  expect(body.reflection).not.toContain("PRIVATE");
  await expect(page.getByRole("status")).toContainText(
    "Your discovery was saved",
  );
  await page.getByRole("button", { name: /Back to paused island/ }).click();
  await page.getByRole("button", { name: "Reset island", exact: true }).click();
  await page.getByRole("button", { name: "Seed garden", exact: true }).click();
  await expect(page.locator(".seedwind-bed.growing")).toHaveCount(0);
  await expect(garden.locator(".seedwind-result")).toContainText(
    "The soil is waiting",
  );
});

test("3D garden renders and survives renderer disposal without extra plant growth", async ({
  page,
}) => {
  await page.goto("/learn");
  await expect(
    page.getByText("PlayCanvas ready — island view", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Seed garden", exact: true }).click();
  const garden = page.getByRole("region", { name: "Seedwind garden" });
  await garden
    .getByRole("button", { name: "Release a seed on the wind" })
    .click();
  await garden.getByRole("button", { name: "Feathered · catches air" }).click();
  await garden.getByRole("button", { name: "Ridge gust", exact: true }).click();
  await garden
    .getByRole("button", { name: "Release a seed on the wind" })
    .click();
  await page
    .getByRole("button", { name: "Water channels", exact: true })
    .click();
  await page.getByRole("button", { name: "Terrace channel" }).click();
  await page.getByRole("button", { name: "Pour one cup" }).click();
  await page.locator("canvas").scrollIntoViewIfNeeded();
  await page
    .locator("canvas")
    .screenshot({ path: "test-results/seedwind-island-webgl.png" });
  for (let i = 0; i < 2; i++) {
    await page
      .getByRole("button", { name: "Stop & rest", exact: true })
      .click();
    await expect(page.locator("canvas")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Resume adventure", exact: true })
      .first()
      .click();
    await expect(
      page.getByText("PlayCanvas ready — island view", { exact: true }),
    ).toBeVisible();
  }
  await expect(garden.locator(".seedwind-bed.growing")).toHaveCount(2);
  await expect(garden.locator(".seedwind-bed").nth(2)).toContainText(
    "tall golden blossoms",
  );
  await expect(
    page.getByRole("list", { name: "Your last water routes" }).locator("li"),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Seed breeze", exact: true }).click();
  await expect(
    page
      .getByRole("list", { name: "Your last seed experiments" })
      .locator("li"),
  ).toHaveCount(2);
});
