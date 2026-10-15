import { expect, test } from "@playwright/test";

test("local exploration is usable without credentials and never submits sample notes", async ({
  page,
}) => {
  const apiCalls: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/learning/") || request.url().includes("/api/"))
      apiCalls.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/learn");
  await expect(
    page.getByRole("heading", { name: "What will you discover today?" }),
  ).toBeVisible();
  await expect(page.getByLabel("Bearer token")).toHaveCount(0);
  await page.getByRole("button", { name: "What makes a share fair?" }).click();
  await expect(page.getByLabel("Your learning question")).toHaveValue(
    "What makes a share fair?",
  );
  await page.getByRole("button", { name: /Follow this question/ }).click();
  await expect(
    page.getByText("What makes a share fair?", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Keep in my notebook/ }),
  ).toBeDisabled();
  await expect(page.getByText(/PlayCanvas ready/)).toBeVisible();
  const inspect = page.getByRole("button", {
    name: "Inspect One whole",
    exact: true,
  });
  await inspect.focus();
  await page.keyboard.press("Enter");
  await expect(inspect).toHaveAttribute("aria-pressed", "true");
  await page
    .getByLabel("Your reflection")
    .fill("Two halves and four quarters each make one whole.");
  await page.getByRole("button", { name: /Pause exploration/ }).click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Keep in my notebook/ }),
  ).toBeDisabled();
  await page.getByRole("button", { name: /Resume exploration/ }).click();
  await page.getByRole("button", { name: /Keep in my notebook/ }).click();
  await expect(
    page.getByRole("heading", { name: "You made a connection." }),
  ).toBeVisible();
  await expect(page.getByText(/not been submitted or assessed/)).toBeVisible();
  await page
    .getByRole("button", { name: "Making connections", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Making connections", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /Open my notebook/ }).click();
  await expect(page.getByRole("blockquote")).toContainText(
    "Two halves and four quarters",
  );
  expect(apiCalls).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  await page.reload();
  await page.getByRole("button", { name: "My notebook", exact: false }).click();
  await expect(
    page.getByRole("heading", { name: "Every discovery starts somewhere." }),
  ).toBeVisible();
});

test("studio fits mobile and has explicit WebGL fallback", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() =>
      null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto("/learn");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: /Explore the sample/ }).click();
  await expect(page.getByText(/3D unavailable/)).toBeVisible();
  await page
    .getByRole("button", { name: "Inspect Half 1", exact: true })
    .click();
  await expect(page.getByText("1 of 7 pieces inspected")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
