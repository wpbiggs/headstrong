import { expect, test } from "@playwright/test";

test("water-only sharing previews actual pours, excludes private play, and receives separate human feedback", async ({
  page,
  request,
}) => {
  const api = "http://127.0.0.1:4000";
  const fixture = await (await request.get(`${api}/__fixture`)).json();
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/learning/")) calls.push(r.url());
  });
  await page.goto("/learn");
  await page.getByRole("button", { name: "Seed garden", exact: true }).click();
  const quick = page.getByRole("region", { name: "Play at this stop" });
  await quick.getByRole("button", { name: "Send a seed" }).click();
  await quick.getByRole("button", { name: "Pump water" }).click();
  await quick.getByLabel("Island water gate").selectOption("split");
  await quick.getByRole("button", { name: "Pump water" }).click();
  await quick.getByLabel("Island water gate").selectOption("slope");
  await page.getByRole("button", { name: "Observatory", exact: true }).click();
  await quick.getByRole("button", { name: "Project a kite" }).click();
  await quick.getByRole("button", { name: "Spread the lights" }).click();
  await quick
    .getByRole("button", { name: "Follow the trail to workshop" })
    .click();
  await page.getByRole("button", { name: /Optional: leave/ }).click();
  await page
    .getByRole("textbox", { name: /What surprised/ })
    .fill("PRIVATE note must not be shared with a water-only discovery.");
  await page
    .getByRole("button", { name: "Save an island discovery (optional)" })
    .click();
  for (const checkbox of await page.getByRole("checkbox").all())
    await expect(checkbox).not.toBeChecked();
  await page.getByLabel("Share water routes (2)").check();
  await page.getByLabel("Share my current sky setup").check();
  await page.getByLabel("Discovery learner token").fill(fixture.tokens.learner);
  await expect(page.getByLabel("Share water routes (2)")).not.toBeChecked();
  await expect(page.getByLabel("Share my current sky setup")).not.toBeChecked();
  expect(calls).toEqual([]);
  await page
    .getByRole("button", { name: "Find my approved adventures and records" })
    .click();
  await page
    .getByLabel("Approved Awakening adventure")
    .selectOption({ index: 1 });
  await page.getByLabel("Share water routes (2)").check();
  const preview = await page.locator(".discovery-preview").innerText();
  expect(preview).toContain("cove route · cove 3, slope 0, terrace 0");
  expect(preview).toContain("split route · cove 1, slope 1, terrace 1");
  expect(preview).not.toMatch(
    /slope route|PRIVATE|Selected current sky|Selected seed|Selected flights/,
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
  expect(body.reflection).toBe(preview);
  expect(body.observedEntityIds).toEqual(["workshop"]);
  await expect(page.getByRole("status")).toContainText(
    "Your discovery was saved",
  );
  const headers = { Authorization: `Bearer ${fixture.tokens.parent}` };
  const detail = await (
    await request.get(`${api}/learning/goals/${body.submissionId}`, { headers })
  ).json();
  expect(detail.journey.evidence.reflection).toBe(preview);
  expect(detail.journey.satisfaction).toBeNull();
  expect(
    (
      await request.post(
        `${api}/learning/goals/${body.submissionId}/guardian-feedback`,
        {
          headers,
          data: {
            comment:
              "I noticed you comparing where the same cup goes. Keep exploring your ideas.",
          },
        },
      )
    ).status(),
  ).toBe(201);
  expect(
    (
      await request.post(
        `${api}/learning/goals/${body.submissionId}/feedback`,
        {
          headers: { Authorization: `Bearer ${fixture.tokens.educator}` },
          data: {
            comment:
              "Try keeping the route the same and changing where you plant a seed.",
            assessment: "needs_practice",
          },
        },
      )
    ).status(),
  ).toBe(201);
  await page
    .getByRole("button", { name: "Check record / refresh human feedback" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Guardian encouragement" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Human educator feedback" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Back to paused island/ }).click();
  await page
    .getByRole("button", { name: "Save an island discovery (optional)" })
    .click();
  await expect(page.getByLabel("Share water routes (2)")).not.toBeChecked();
  await expect(page.getByLabel("Share my current sky setup")).not.toBeChecked();
  await expect(page.getByLabel("Discovery learner token")).toHaveValue("");
});

test("sky-only sharing uses the curated observatory anchor and the existing-record path", async ({
  page,
  request,
}) => {
  const api = "http://127.0.0.1:4000";
  const fixture = await (await request.get(`${api}/__fixture`)).json();
  const headers = { Authorization: `Bearer ${fixture.tokens.learner}` };
  const catalog = await (
    await request.get(`${api}/learning/quests`, { headers })
  ).json();
  const quest = catalog.items.find(
    (item: { scene: { templateId: string } }) =>
      item.scene.templateId === "awakening-glider",
  );
  const goal = await (
    await request.post(`${api}/learning/goals`, {
      headers,
      data: {
        objective:
          "Synthetic sky discovery: compare one constellation with two lenses.",
      },
    })
  ).json();
  expect(
    (
      await request.post(`${api}/learning/goals/${goal.id}/quest`, {
        headers,
        data: { questId: quest.questId },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/learn");
  await page.getByRole("button", { name: "Observatory", exact: true }).click();
  const quick = page.getByRole("region", { name: "Play at this stop" });
  await quick.getByRole("button", { name: "Project a kite" }).click();
  await quick.getByRole("button", { name: "Spread the lights" }).click();
  await page
    .getByRole("button", { name: "Save an island discovery (optional)" })
    .click();
  await page.getByLabel("Discovery learner token").fill(fixture.tokens.learner);
  await page.getByLabel("Awakening record ID").fill(goal.id);
  await page
    .getByRole("button", { name: "Check record / refresh human feedback" })
    .click();
  await expect(page.getByLabel("Share water routes (0)")).toBeDisabled();
  await page.getByLabel("Share my current sky setup").check();
  const preview = await page.locator(".discovery-preview").innerText();
  expect(preview).toContain("kite constellation · close lens · five lights");
  expect(preview).not.toMatch(/Selected water|Selected seed|Selected flights/);
  await expect(
    page.getByText("Observation anchors: beacon.", { exact: false }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page
    .locator(".discovery-preview")
    .screenshot({ path: "test-results/sky-discovery-preview-mobile.png" });
  const post = page.waitForRequest(
    (r) =>
      r.url().endsWith(`/goals/${goal.id}/evidence`) && r.method() === "POST",
  );
  await page
    .getByRole("button", {
      name: "Share this discovery with my trusted adults",
    })
    .click();
  const body = (await post).postDataJSON();
  expect(body).toEqual({ reflection: preview, observedEntityIds: ["beacon"] });
  await expect(page.getByRole("status")).toContainText(
    "Your discovery was saved",
  );
  const detail = await (
    await request.get(`${api}/learning/goals/${goal.id}`, { headers })
  ).json();
  expect(detail.journey.evidence.reflection).toBe(preview);
  expect(detail.journey.feedback).toBeNull();
  expect(detail.journey.guardianFeedback).toBeNull();
  expect(detail.journey.satisfaction).toBeNull();
});
