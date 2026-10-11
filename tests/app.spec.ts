import { test, expect } from "@playwright/test";

test("responsive demo supports creating, editing, filtering, exporting and deleting an upsell", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome to Upseller." }),
  ).toBeVisible();
  await page.screenshot({
    path: `artifacts/${info.project.name}-login.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Explore the demo" }).click();
  const revenueValue = page.locator(".revenue-card .stat-value");
  const baseline = Number(
    (await revenueValue.innerText()).replace(/[^\d.]/g, ""),
  );
  await expect(
    page.getByRole("heading", { name: "Hello, Alex." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/${info.project.name}-dashboard.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Add upsell", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Guest name").fill("Test Guest");
  await dialog.getByLabel("Confirmation number").fill("TEST-001");
  await dialog.getByLabel("Room number").fill("701");
  await dialog.getByRole("button", { name: "Suite upsell" }).click();
  await dialog.getByLabel("Upsell value").fill("100");
  await dialog.getByLabel("Number of nights").fill("5");
  await expect(dialog.locator(".sale-total-preview strong")).toHaveText(
    "AED 500.00",
  );
  await dialog
    .getByLabel("Has this been updated in Opera?")
    .selectOption("other");
  await dialog.getByLabel("Updated by", { exact: true }).fill("Sarah Ahmed");
  await page.screenshot({
    path: `artifacts/${info.project.name}-form.png`,
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "Save upsell" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("textbox", { name: "Search sales" }).fill("TEST-001");
  const row = page.getByRole("button", { name: /Test Guest.*701/ });
  await expect(row).toContainText("500.00");
  await expect(revenueValue).toContainText(
    (baseline + 500).toLocaleString("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );
  await row.click();
  await expect(page.getByText("Sarah Ahmed", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit upsell" }).click();
  await expect(dialog.getByLabel("Upsell value")).toHaveValue("100");
  await expect(dialog.getByLabel("Number of nights")).toHaveValue("5");
  await dialog.getByLabel("Upsell value").fill("100.15");
  await dialog.getByLabel("Number of nights").fill("3");
  await expect(dialog.locator(".sale-total-preview strong")).toHaveText(
    "AED 300.45",
  );
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(row).toContainText("300.45");
  await expect(revenueValue).toContainText(
    (baseline + 300.45).toLocaleString("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const report = await download;
  expect(report.suggestedFilename()).toMatch(/upseller-.*\.csv/);
  const stream = await report.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString("utf8");
  expect(csv).toContain('"Upsell per night AED","Total AED","Nights"');
  expect(csv).toContain('"100.15","300.45","3"');
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete upsell", exact: true })
    .click();
  await expect(row).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "No upsells in this view" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("button", { name: "Daily", exact: true }).click();
  await expect(
    page.locator(".stat-card").nth(1).locator(".stat-value"),
  ).toContainText("4");
  await page.getByRole("button", { name: "Yearly", exact: true }).click();
  await page.getByRole("button", { name: "All time", exact: true }).click();
  await expect(
    page.locator(".stat-card").nth(1).locator(".stat-value"),
  ).toContainText("38");
  expect(errors).toEqual([]);
});

test("sales API refuses unauthenticated requests", async ({ request }) => {
  expect((await request.get("/api/sales")).status()).toBe(401);
  expect(
    (
      await request.post("/api/sales", {
        headers: { origin: "http://localhost:3000" },
        data: {},
      })
    ).status(),
  ).toBe(401);
  expect((await request.get("/api/auth")).status()).toBe(200);
  expect(
    (
      await request.post("/api/sales", {
        headers: { origin: "https://example.net" },
        data: {},
      })
    ).status(),
  ).toBe(403);
});

test("admin can add, edit and soft-delete users on desktop and mobile", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the demo" }).click();
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Users", exact: true }).click();
  else
    await page
      .getByRole("button", { name: "User management", exact: true })
      .click();
  await expect(
    page.getByRole("heading", { name: "User management", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete Alex Morgan" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Add user", exact: true })
    .filter({ visible: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("First name").fill("Sarah");
  await dialog.getByLabel("Last name").fill("Ahmed");
  await dialog.getByLabel("Email address").fill("sarah@example.com");
  await dialog.getByLabel("Role", { exact: true }).selectOption("user");
  await dialog.getByRole("button", { name: "Add user", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText("sarah@example.com", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit Sarah Ahmed" }).click();
  await dialog.getByLabel("Role", { exact: true }).selectOption("admin");
  await dialog.getByRole("button", { name: "Save user" }).click();
  await expect(
    page
      .locator(".user-row")
      .filter({ hasText: "sarah@example.com" })
      .locator(".role-badge"),
  ).toHaveText("Admin");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/${info.project.name}-users.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Delete Sarah Ahmed" }).click();
  await expect(dialog).toContainText("soft-deleted record");
  await dialog
    .getByRole("button", { name: "Delete user", exact: true })
    .click();
  await expect(
    page.getByText("sarah@example.com", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Filter user status").selectOption("deleted");
  await expect(
    page.getByText("sarah@example.com", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit Sarah Ahmed" }),
  ).toHaveCount(0);
});

test("regular users do not see user management", async ({ page }) => {
  await page.route("**/api/auth", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "regular",
          firstName: "Regular",
          lastName: "User",
          email: "regular@example.com",
          role: "user",
        },
      },
    }),
  );
  await page.route("**/api/sales", (route) =>
    route.fulfill({ json: { sales: [] } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hello, Regular." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "User management", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Users", exact: true }),
  ).toHaveCount(0);
});

test("form drawer anchors to the right on desktop and bottom on mobile", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the demo" }).click();
  const trigger = page
    .getByRole("button", { name: "Add upsell", exact: true })
    .filter({ visible: true })
    .first();
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveClass(/drawer/);
  const viewport = page.viewportSize()!;
  const motion = await dialog.evaluate((el) => {
    const animation = el
      .getAnimations()
      .find(
        (a) =>
          a instanceof CSSAnimation &&
          /^drawer-(right|bottom)-in$/.test(a.animationName),
      )!;
    animation.pause();
    const duration = Number(animation.effect!.getTiming().duration);
    const frames = [0, duration / 2, duration].map((time) => {
      animation.currentTime = time;
      const box = el.getBoundingClientRect();
      return { x: box.x, y: box.y };
    });
    animation.finish();
    return { frames, overlayScroll: el.parentElement!.scrollLeft };
  });
  expect(motion.overlayScroll).toBe(0);
  const axis = info.project.name === "mobile" ? "y" : "x";
  const edge =
    info.project.name === "mobile" ? viewport.height : viewport.width;
  expect(motion.frames[0][axis]).toBeGreaterThanOrEqual(edge - 1);
  expect(motion.frames[0][axis]).toBeGreaterThan(motion.frames[1][axis]);
  expect(motion.frames[1][axis]).toBeGreaterThan(motion.frames[2][axis]);
  await expect
    .poll(async () => {
      const box = (await dialog.boundingBox())!;
      return Math.round(box.y + box.height);
    })
    .toBe(viewport.height);
  await expect
    .poll(async () => {
      const box = (await dialog.boundingBox())!;
      return Math.round(box.x + box.width);
    })
    .toBe(viewport.width);
  const box = (await dialog.boundingBox())!;
  expect(Math.abs(box.x + box.width - viewport.width)).toBeLessThan(2);
  if (info.project.name === "mobile") {
    expect(box.x).toBe(0);
    expect(box.y).toBeGreaterThan(0);
    expect(box.width).toBe(viewport.width);
  } else {
    expect(box.y).toBe(0);
    expect(box.width).toBe(660);
  }
  const save = dialog.getByRole("button", { name: "Save upsell", exact: true });
  await expect(save).toBeInViewport();
  await page.screenshot({
    path: `artifacts/${info.project.name}-drawer-top.png`,
  });
  await dialog.locator(".modal-form-body").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(save).toBeInViewport();
  await expect(
    dialog.getByRole("button", { name: "Close dialog" }),
  ).toBeInViewport();
  await page.screenshot({
    path: `artifacts/${info.project.name}-drawer-bottom.png`,
  });
  await dialog.getByRole("button", { name: "Close dialog" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(save).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Close dialog" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
  await trigger.click();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test("sidebar quotes rotate every fifteen minutes and keep twenty navigable quotes", async ({
  page,
}, info) => {
  await page.clock.install();
  async function enterDemo() {
    await page.goto("/");
    await page.getByRole("button", { name: "Explore the demo" }).click();
    if (info.project.name === "mobile")
      await page.getByRole("button", { name: "Open navigation" }).click();
  }
  await enterDemo();
  const widget = page.getByRole("region", { name: "Daily inspiration" });
  const quote = widget.locator("blockquote");
  const refresh = widget.getByRole("button", { name: "Get a new quote" });
  const previous = widget.getByRole("button", { name: "Previous quote" });
  const next = widget.getByRole("button", { name: "Next quote in history" });
  await expect(refresh).toBeEnabled();
  await expect(previous).toBeDisabled();
  const first = await quote.innerText();
  await refresh.click();
  await expect(quote).not.toHaveText(first);
  const second = await quote.innerText();
  await previous.click();
  await expect(quote).toHaveText(first);
  await next.click();
  await expect(quote).toHaveText(second);
  await expect(next).toBeDisabled();
  await page.clock.fastForward(14 * 60 * 1000 + 59000);
  await expect(quote).toHaveText(second);
  await page.clock.fastForward(1000);
  await expect(quote).not.toHaveText(second);
  await expect(widget.getByLabel("Quote 3 of 3")).toHaveCount(1);
  for (let i = 0; i < 22; i++) await refresh.click();
  await expect(widget.getByLabel("Quote 20 of 20")).toHaveCount(1);
  const latest = await quote.innerText();
  const history = new Set([latest]);
  for (let i = 0; i < 19; i++) {
    await previous.click();
    history.add(await quote.innerText());
  }
  expect(history.size).toBe(20);
  await expect(previous).toBeDisabled();
  await expect(widget.getByLabel("Quote 1 of 20")).toHaveCount(1);
  for (let i = 0; i < 19; i++) await next.click();
  await expect(quote).toHaveText(latest);
  await page.screenshot({
    path: `artifacts/${info.project.name}-quotes.png`,
    animations: "disabled",
  });
  await enterDemo();
  await expect(quote).toHaveText(latest);
  await expect(widget.getByLabel("Quote 20 of 20")).toHaveCount(1);
});

test("compact inspiration keeps the profile and logout visible without sidebar scrolling", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the demo" }).click();
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Open navigation" }).click();
  const sidebar = page.locator(".sidebar");
  const widget = page.getByRole("region", { name: "Daily inspiration" });
  const heights =
    info.project.name === "mobile" ? [844, 667, 568] : [900, 700, 600, 480];
  for (const height of heights) {
    await page.setViewportSize({
      width: info.project.name === "mobile" ? 390 : 1440,
      height,
    });
    await expect(
      page.getByRole("button", { name: "Log out", exact: true }),
    ).toBeInViewport();
    await expect(sidebar.locator(".sidebar-bottom")).toBeInViewport({
      ratio: 1,
    });
    expect(
      await sidebar.evaluate((el) => el.scrollHeight <= el.clientHeight),
    ).toBe(true);
    expect((await widget.boundingBox())!.height).toBeLessThanOrEqual(114);
  }
  await page.screenshot({
    path: `artifacts/${info.project.name}-compact-quotes.png`,
    animations: "disabled",
  });
});
