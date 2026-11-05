import { expect, test } from "@playwright/test";

test("trusted inbox shows server-scoped adult tools, saves independent replies and clears private drafts", async ({
  page,
  request,
}) => {
  const api = "http://127.0.0.1:4000";
  const fixture = await (await request.get(`${api}/__fixture`)).json();
  const learnerHeaders = { Authorization: `Bearer ${fixture.tokens.learner}` };
  const catalog = await (
    await request.get(`${api}/learning/quests`, { headers: learnerHeaders })
  ).json();
  const spec = catalog.items.find(
    (item: { questId: string }) => item.questId === fixture.questId,
  );
  const id = crypto.randomUUID();
  const reflection =
    "Synthetic inbox discovery: I compared the same idea under two conditions.";
  expect(
    (
      await request.post(`${api}/learning/discoveries`, {
        headers: learnerHeaders,
        data: {
          submissionId: id,
          questId: spec.questId,
          scene: spec.scene,
          reflection,
          observedEntityIds: [spec.scene.entities[0].id],
        },
      })
    ).status(),
  ).toBe(201);
  const calls: { method: string; url: string }[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/learning/"))
      calls.push({ method: r.method(), url: r.url() });
  });
  await page.goto("/learn");
  await page
    .getByRole("button", { name: "Trusted adult feedback inbox" })
    .click();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Trusted discovery inbox" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create my goal" }),
  ).toHaveCount(0);
  await page.getByLabel("Trusted adult token").fill(fixture.tokens.parent);
  expect(calls).toEqual([]);
  await page
    .getByRole("button", { name: "Find discoveries shared with me" })
    .click();
  const record = () =>
    page.getByRole("button", { name: new RegExp(id.slice(0, 8)) });
  await expect(record()).toBeVisible();
  await expect(page.getByText(reflection, { exact: true })).toHaveCount(0);
  expect(calls).toEqual([{ method: "GET", url: `${api}/learning/goals` }]);
  await record().click();
  await expect(page.getByText(reflection, { exact: true })).toBeVisible();
  await expect(page.getByLabel("Inbox human assessment")).toHaveCount(0);
  await expect(page.getByLabel("enjoyment", { exact: true })).toHaveCount(0);
  await page
    .getByLabel("Inbox reply")
    .fill("PRIVATE draft that must disappear on a connection change.");
  await page
    .getByLabel("Trusted adult token")
    .fill(fixture.tokens.otherEducator);
  await expect(page.getByText(reflection, { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Inbox reply")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Find discoveries shared with me" })
    .click();
  await expect(
    page.getByText("No saved discoveries match this view.", { exact: false }),
  ).toBeVisible();
  await expect(record()).toHaveCount(0);
  await page.getByLabel("Trusted adult token").fill(fixture.tokens.parent);
  await page
    .getByRole("button", { name: "Find discoveries shared with me" })
    .click();
  await expect(record()).toBeVisible();
  await record().click();
  await expect(page.getByLabel("Inbox reply")).toHaveValue("");
  await page
    .getByLabel("Inbox reply")
    .fill("I noticed you trying another idea. Keep exploring your questions.");
  expect(calls.every((call) => call.method === "GET")).toBeTruthy();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Send my reply once" }).click();
  await expect(page.getByRole("status")).toContainText("Your reply was saved");
  await expect(
    page.getByText("Your reply is already saved and cannot be overwritten.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send my reply once" }),
  ).toHaveCount(0);
  await expect(record()).toHaveCount(0);
  await page.getByLabel("Awaiting my reply only").uncheck();
  await expect(record()).toContainText("Your reply saved");
  const guardianDetail = await (
    await request.get(`${api}/learning/goals/${id}`, {
      headers: learnerHeaders,
    })
  ).json();
  expect(guardianDetail.journey.feedback).toBeNull();
  expect(guardianDetail.journey.guardianFeedback.comment).toContain(
    "Keep exploring",
  );
  await page.getByLabel("Trusted adult token").fill(fixture.tokens.educator);
  await expect(page.getByText(reflection, { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Find discoveries shared with me" })
    .click();
  await expect(record()).toBeVisible();
  await record().click();
  await expect(page.getByLabel("Inbox human assessment")).toHaveValue("");
  await page
    .getByLabel("Inbox reply")
    .fill(
      "Try keeping one condition the same while you compare the next idea.",
    );
  await expect(
    page.getByRole("button", { name: "Send my reply once" }),
  ).toBeDisabled();
  await page
    .getByLabel("Inbox human assessment")
    .selectOption("needs_practice");
  await page.getByRole("button", { name: "Send my reply once" }).click();
  await expect(page.getByRole("status")).toContainText("Your reply was saved");
  await page
    .getByRole("region", { name: "Selected shared discovery" })
    .screenshot({ path: "test-results/trusted-inbox-mobile-feedback.png" });
  await page.getByLabel("Trusted adult token").fill(fixture.tokens.learner);
  await page
    .getByRole("button", { name: "Find discoveries shared with me" })
    .click();
  await expect(
    page.getByText("This is a learner session.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Selected shared discovery" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Inbox reply")).toHaveCount(0);
  await page.getByRole("button", { name: "Clear connection" }).click();
  await expect(page.getByLabel("Trusted adult token")).toHaveValue("");
  await page.getByRole("button", { name: /Back to paused island/ }).click();
  await expect(
    page.getByRole("heading", { name: "A good place to rest." }),
  ).toBeVisible();
  const writes = calls.filter((call) => call.method === "POST");
  expect(writes.map((call) => call.url)).toEqual([
    `${api}/learning/goals/${id}/guardian-feedback`,
    `${api}/learning/goals/${id}/feedback`,
  ]);
});

test("late adult catalog cannot restore a previous session's records or reply tools", async ({
  page,
  request,
}) => {
  const fixture = await (
    await request.get("http://127.0.0.1:4000/__fixture")
  ).json();
  const catalog = await (
    await request.get("http://127.0.0.1:4000/learning/goals", {
      headers: { Authorization: `Bearer ${fixture.tokens.parent}` },
    })
  ).json();
  let release = () => {};
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/learning/goals", async (route) => {
    await delayed;
    try {
      await route.fulfill({ json: catalog });
    } catch {
      /* Connection change aborts the old request. */
    }
  });
  await page.goto("/learn");
  await page
    .getByRole("button", { name: "Trusted adult feedback inbox" })
    .click();
  await page.getByLabel("Trusted adult token").fill(fixture.tokens.parent);
  await page
    .getByRole("button", { name: "Find discoveries shared with me" })
    .click();
  await expect(page.getByRole("status")).toContainText("Checking authorized");
  await page
    .getByLabel("Trusted adult token")
    .fill(fixture.tokens.otherEducator);
  release();
  await expect(
    page.getByRole("region", { name: "Discoveries shared with you" }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Inbox reply")).toHaveCount(0);
  await expect(page.getByLabel("Inbox human assessment")).toHaveCount(0);
});
