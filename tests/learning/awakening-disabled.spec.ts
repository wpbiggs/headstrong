import { expect, test } from "@playwright/test";

// Run only against a separately built disabled application; never toggle a hosted flag.
test("disabled flag closes root, adventure and inherited sample entry points", async ({
  page,
}) => {
  for (const path of ["/", "/learn", "/learn/studio"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Learning prototype is disabled" }),
    ).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Launch|Connect saved/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: /operator|dashboard/i }),
    ).toHaveCount(0);
  }
});
