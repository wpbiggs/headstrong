import { expect, test } from "@playwright/test";

test("learner goal through PlayCanvas, evidence, educator feedback and satisfaction", async ({
  page,
  request,
}) => {
  // These identities exist only in the disposable loopback fixture server.
  const response = await request.get("http://127.0.0.1:4000/__fixture");
  expect(response.ok()).toBeTruthy();
  const fixture = await response.json();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/learn");
  await page
    .getByLabel("Bearer token", { exact: true })
    .fill(fixture.tokens.learner);
  await page
    .getByLabel("What do you want to learn?", { exact: true })
    .fill("Understand how two equal halves form a whole");
  await page
    .getByRole("button", { name: "Create my goal", exact: true })
    .click();
  await expect(
    page.getByLabel("Approved quest ID", { exact: true }),
  ).toBeVisible();
  const text = await page.getByText(/Goal ID:.*share this/).textContent();
  const goalId = text?.match(/[a-f0-9-]{36}/)?.[0];
  expect(goalId).toBeTruthy();
  await page
    .getByLabel("Approved quest ID", { exact: true })
    .fill(fixture.questId);
  await page
    .getByRole("button", {
      name: "Choose quest and share with assigned adults",
    })
    .click();
  await expect(page.getByText(/PlayCanvas ready/)).toBeVisible();
  await expect(page.locator("canvas")).toBeVisible();
  expect(
    await page
      .locator("canvas")
      .evaluate((canvas) => (canvas as HTMLCanvasElement).width),
  ).toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Stop experience", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Resume experience", exact: true })
    .click();
  await expect(page.getByText(/PlayCanvas ready/)).toBeVisible();
  await page
    .locator("canvas")
    .screenshot({ path: "test-results/learning-playcanvas.png" });
  // Inspect via native keyboard controls; they drive the same observation/highlight callback.
  const guide = page.getByRole("button", {
    name: "Inspect Guide",
    exact: true,
  });
  await guide.focus();
  await page.keyboard.press("Enter");
  await expect(guide).toHaveAttribute("aria-pressed", "true");
  await page
    .getByLabel("What did you observe and learn?", { exact: true })
    .fill(
      "I compared two equal parts. Each half combines with the other half to make one whole.",
    );
  await page
    .getByRole("button", { name: "Submit evidence once", exact: true })
    .click();
  await expect(
    page.getByText("I compared two equal parts.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page
    .getByLabel("Bearer token", { exact: true })
    .fill(fixture.tokens.educator);
  await expect(
    page.getByText("I compared two equal parts.", { exact: false }),
  ).toHaveCount(0);
  await page.getByLabel("Goal ID", { exact: true }).fill(goalId as string);
  await page
    .getByRole("button", {
      name: "Load journey / refresh feedback",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Feedback", { exact: true })
    .fill(
      "You described equal parts clearly. Next explain why unequal parts are not halves.",
    );
  await page
    .getByRole("button", { name: "Submit educator feedback", exact: true })
    .click();
  await expect(
    page.getByText("You described equal parts clearly.", { exact: false }),
  ).toBeVisible();
  await page
    .getByLabel("Bearer token", { exact: true })
    .fill(fixture.tokens.learner);
  await page.getByLabel("Goal ID", { exact: true }).fill(goalId as string);
  await page
    .getByRole("button", {
      name: "Load journey / refresh feedback",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("You described equal parts clearly.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("enjoyment", { exact: true }).selectOption("5");
  await page
    .getByRole("button", { name: "Save optional ratings", exact: true })
    .click();
  await expect(
    page.getByText("Thank you. Your ratings were saved privately."),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/learning-completed.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  // Mobile must not overflow horizontally, and clearing the session hides private records.
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page
    .getByRole("button", { name: "Clear session and stop", exact: true })
    .click();
  await expect(
    page.getByText("Thank you. Your ratings were saved privately."),
  ).toHaveCount(0);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test("WebGL failure is explicit and keyboard alternative remains usable", async ({
  page,
  request,
}) => {
  const fixture = await (
    await request.get("http://127.0.0.1:4000/__fixture")
  ).json();
  const headers = { Authorization: `Bearer ${fixture.tokens.learner}` };
  const goal = await (
    await request.post("http://127.0.0.1:4000/learning/goals", {
      headers,
      data: { objective: "Explore fractions with accessible controls" },
    })
  ).json();
  expect(
    (
      await request.post(
        `http://127.0.0.1:4000/learning/goals/${goal.id}/quest`,
        {
          headers,
          data: { questId: fixture.questId },
        },
      )
    ).ok(),
  ).toBeTruthy();
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() =>
      null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto("/learn");
  await page
    .getByLabel("Bearer token", { exact: true })
    .fill(fixture.tokens.learner);
  await page.getByLabel("Goal ID", { exact: true }).fill(goal.id);
  await page
    .getByRole("button", {
      name: "Load journey / refresh feedback",
      exact: true,
    })
    .click();
  await expect(page.getByText(/3D unavailable/)).toBeVisible();
  const inspect = page.getByRole("button", {
    name: "Inspect Guide",
    exact: true,
  });
  await inspect.focus();
  await page.keyboard.press("Enter");
  await expect(inspect).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Stop experience", exact: true })
    .click();
  await expect(page.locator("canvas")).toHaveCount(0);
});
