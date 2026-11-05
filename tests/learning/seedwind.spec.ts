import { expect, test } from "@playwright/test";

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
  await expect(garden.locator("output")).toContainText("2 m");
  await expect(garden.locator(".seedwind-bed").nth(0)).toContainText(
    "1 growing clump",
  );
  await garden.getByRole("button", { name: "Feathered · catches air" }).click();
  await garden
    .getByRole("button", { name: "Release a seed on the wind" })
    .click();
  await expect(garden.locator("output")).toContainText("6 m");
  await expect(garden.locator(".seedwind-bed").nth(1)).toContainText(
    "1 growing clump",
  );
  await garden.getByRole("button", { name: "Ridge gust", exact: true }).click();
  await garden
    .getByRole("button", { name: "Release a seed on the wind" })
    .click();
  await expect(garden.locator("output")).toContainText("14 m");
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
  await expect(garden.locator("output")).toContainText("The soil is waiting");
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
  await expect(
    page
      .getByRole("list", { name: "Your last seed experiments" })
      .locator("li"),
  ).toHaveCount(2);
});
