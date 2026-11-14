import { expect, test } from "@playwright/test";
import { clientId, expectToast, login, sql } from "./helpers";

test.describe.configure({ mode: "serial" });

test("signed-out users are sent to login; wrong passwords are rejected", async ({ page }) => {
  await page.goto("/clients");
  await expect(page).toHaveURL(/\/login\?next=%2Fclients/);
  await page.fill("#email", "bilal@ghaus.test");
  await page.fill("#password", "wrong-password");
  await page.click("button[type=submit]");
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
});

test("the Owner must pass TOTP 2FA and lands on Today", async ({ page }) => {
  await page.goto("/login");
  await page.fill("#email", "owner@ghaus.test");
  await page.fill("#password", (await import("./helpers")).creds.password);
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/mfa/);
  // Data is hidden by the database until the session is aal2
  await page.goto("/clients");
  await expect(page).toHaveURL(/\/mfa/);
  await login(page, "owner@ghaus.test");
  await expect(page).toHaveURL(/\/today/);
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();
  await expect(page.getByText("Returns by stage")).toBeVisible();
});

test("review gate: the preparer cannot send a return on before reviewer sign-off", async ({ page }) => {
  await login(page, "bilal@ghaus.test");
  await expect(page).toHaveURL(/\/my-work/);
  await page.goto(`/clients/${clientId("Ahmed Raza")}?ty=2026`);
  await expect(page.getByTestId("review-box")).toContainText("Waiting for Sana Iqbal to sign off");
  await expect(page.getByTestId("advance-status")).toBeDisabled();
  await expect(page.getByTestId("sign-off-send")).toHaveCount(0);
});

test("reviewer signs off from the review queue; the preparer is notified", async ({ browser }) => {
  const sana = await browser.newPage();
  await login(sana, "sana@ghaus.test");
  await sana.goto("/review");
  const item = sana.getByTestId("review-item").filter({ hasText: "Ahmed Raza" });
  await expect(item).toBeVisible();
  await item.getByRole("button", { name: "Sign off & send to client" }).click();
  await expectToast(sana, /signed off and sent for client approval/);
  await expect(sana.getByTestId("review-item").filter({ hasText: "Ahmed Raza" })).toHaveCount(0);
  expect(sql(`select return_status from client_tax_years where client_id = '${clientId("Ahmed Raza")}' and tax_year = 2026`)).toBe("sent_for_client_approval");

  const bilal = await browser.newPage();
  await login(bilal, "bilal@ghaus.test");
  await bilal.getByTestId("notifications-bell").click();
  await expect(bilal.getByText("Return signed off").first()).toBeVisible();
  // The review task was completed automatically and an approval task created
  await bilal.goto("/tasks");
  await expect(bilal.getByText("Get client approval: Ahmed Raza TY2026")).toBeVisible();
});

test("editing return figures updates the reconciliation and the activity log", async ({ page }) => {
  await login(page, "bilal@ghaus.test");
  await page.goto(`/clients/${clientId("Zainab Akhtar")}?ty=2026`);
  const salary = page.locator("#income_salary");
  await salary.click();
  await salary.fill("4750000");
  await salary.blur();
  await expect(salary).toHaveValue("47,50,000");
  await expect(page.getByTestId("save-bar")).toBeVisible();
  await page.getByTestId("save-bar").getByRole("button", { name: "Save" }).click();
  await expectToast(page, "Saved");
  await expect(page.getByTestId("save-bar")).toHaveCount(0);
  await page.getByRole("tab", { name: "Wealth" }).click();
  // Salary up by 18 lakh exactly explains the 18 lakh gap seeded for this client
  await expect(page.getByTestId("wealth-gap")).toHaveText("Rs 0");
  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByText("updated return: salary income")).toBeVisible();
});

test("two people editing the same return get a conflict prompt, never a silent overwrite", async ({ browser }) => {
  const id = clientId("Omar Sheikh");
  const a = await browser.newPage();
  const b = await browser.newPage();
  await login(a, "bilal@ghaus.test");
  await login(b, "hira@ghaus.test");
  await a.goto(`/clients/${id}?ty=2026`);
  await b.goto(`/clients/${id}?ty=2026`);

  await a.locator("#tax_chargeable").fill("111111");
  await a.getByTestId("save-bar").getByRole("button", { name: "Save" }).click();
  await expectToast(a, "Saved");

  await b.locator("#tax_chargeable").fill("222222");
  await b.getByTestId("save-bar").getByRole("button", { name: "Save" }).click();
  await expect(b.getByTestId("conflict-dialog")).toBeVisible();
  await expect(b.getByTestId("conflict-dialog")).toContainText("Bilal Ahmed changed this record after you opened it");
  expect(sql(`select tax_chargeable::int from client_tax_years where client_id = '${id}' and tax_year = 2026`)).toBe("111111");

  // Overwriting is an explicit choice
  await b.getByRole("button", { name: "Overwrite with mine" }).click();
  await expectToast(b, "Saved");
  expect(sql(`select tax_chargeable::int from client_tax_years where client_id = '${id}' and tax_year = 2026`)).toBe("222222");
});

test("new client: CNIC is validated and formatted; Cmd+K finds clients by CNIC digits", async ({ page }) => {
  await login(page, "usman@ghaus.test");
  await page.goto("/clients/new");
  await page.fill("#name", "Test Client Khalid");
  await page.fill("#cnic", "35202-12345");
  await expect(page.getByRole("button", { name: "Create client" })).toBeDisabled();
  await page.fill("#cnic", "3520299988877");
  await page.locator("#cnic").blur();
  await expect(page.locator("#cnic")).toHaveValue("35202-9998887-7");
  await page.getByRole("button", { name: "Create client" }).click();
  await expect(page.getByTestId("client-name")).toHaveText("Test Client Khalid");

  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("Client name, CNIC, NTN, phone… or a page").fill("9998887");
  await expect(page.getByRole("option", { name: /Test Client Khalid/ })).toBeVisible();

  // Duplicate CNIC in the same firm is refused
  await page.goto("/clients/new");
  await page.fill("#name", "Duplicate");
  await page.fill("#cnic", "35202-9998887-7");
  await page.getByRole("button", { name: "Create client" }).click();
  await expectToast(page, "Another client in this firm already has that CNIC.");
});

test("clerks have no settings, fees or vault access", async ({ page }) => {
  await login(page, "usman@ghaus.test");
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Settings" })).toHaveCount(0);
  await page.goto("/settings/users");
  await expect(page).toHaveURL(/\/forbidden/);
});

test("@mentions notify the colleague", async ({ browser }) => {
  const bilal = await browser.newPage();
  await login(bilal, "bilal@ghaus.test");
  await bilal.goto(`/clients/${clientId("Omar Sheikh")}?ty=profile`);
  const box = bilal.getByLabel("New comment");
  await box.click();
  await box.pressSequentially("Please check the rent agreement @Hir");
  await bilal.getByRole("listbox").getByText("Hira Khan").click();
  await box.pressSequentially("thanks");
  await bilal.getByRole("button", { name: "Post comment" }).click();
  await expect(bilal.getByText("@Hira Khan").first()).toBeVisible();

  const hira = await browser.newPage();
  await login(hira, "hira@ghaus.test");
  await hira.goto("/notifications");
  await expect(hira.getByText("Bilal Ahmed mentioned you on Omar Sheikh")).toBeVisible();
});

test("wealth statement lines drive closing net assets", async ({ page }) => {
  await login(page, "bilal@ghaus.test");
  await page.goto(`/clients/${clientId("Zainab Akhtar")}?ty=2026`);
  await page.getByRole("tab", { name: "Wealth" }).click();
  const before = await page.getByTestId("net-assets").innerText();
  await page.getByRole("button", { name: "Add line" }).click();
  await page.selectOption("#w-cat", "gold");
  await page.fill("#w-desc", "Gold jewellery 10 tola");
  await page.locator("#w-cost").click();
  await page.locator("#w-cost").fill("500000");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expectToast(page, "Line added");
  await expect(page.getByText("Gold jewellery 10 tola")).toBeVisible();
  await expect(page.getByTestId("net-assets")).not.toHaveText(before);
  await expect(page.getByTestId("wealth-gap")).toHaveText("Rs 5,00,000");
});

test("kanban: dragging past review without sign-off is refused", async ({ page }) => {
  await page.setViewportSize({ width: 2900, height: 1000 }); // all ten columns on screen
  await login(page, "hira@ghaus.test");
  await page.goto("/season");
  const card = page.getByTestId("season-card").filter({ hasText: "Mariam Javed" });
  const target = page.getByTestId("column-approved");
  const from = (await card.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width - 30, from.y + from.height - 12);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width - 10, from.y + from.height + 10, { steps: 5 });
  await page.mouse.move(to.x + 40, to.y + 60, { steps: 15 });
  await page.mouse.up();
  await expectToast(page, /Review sign-off required/);
  await expect(page.getByTestId("column-under_review").getByText("Mariam Javed")).toBeVisible();

  // An allowed move: Iqbal Rice Mills from In preparation to Under review
  const card2 = page.getByTestId("season-card").filter({ hasText: "Iqbal Rice Mills" });
  const target2 = page.getByTestId("column-under_review");
  const f2 = (await card2.boundingBox())!;
  const t2 = (await target2.boundingBox())!;
  await page.mouse.move(f2.x + f2.width - 30, f2.y + f2.height - 12);
  await page.mouse.down();
  await page.mouse.move(f2.x + f2.width - 10, f2.y + f2.height + 10, { steps: 5 });
  await page.mouse.move(t2.x + 40, t2.y + 60, { steps: 15 });
  await page.mouse.up();
  await expect.poll(() => sql(`select return_status from client_tax_years where client_id = '${clientId("Iqbal Rice Mills")}' and tax_year = 2026`)).toBe("under_review");
});

test("one deadline extension moves every affected client", async ({ page }) => {
  await login(page, "owner@ghaus.test");
  await page.goto("/settings/deadlines");
  await page.getByRole("button", { name: "Add extension" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#f-rule_id").selectOption({ label: "Annual income tax return: companies (30 June year-end)" });
  await dialog.locator("#f-tax_year").fill("2026");
  await dialog.locator("#f-due_date").fill("31-01-2027");
  await dialog.locator("#f-reference").fill("Test circular 9 of 2026-27");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expectToast(page, "Saved");
  expect(sql(`select count(*) from v_client_tax_years where tax_year = 2026 and client_type = 'company' and filing_due_date = '2027-01-31'`)).toBe("4");
  await page.goto(`/clients/${clientId("Raza Textiles (Pvt) Ltd")}?ty=2026`);
  await expect(page.getByText("31-01-2027")).toBeVisible();
});

test("Settings show the verify-against-current-law note", async ({ page }) => {
  await login(page, "owner@ghaus.test");
  await page.goto("/settings/notice-sections");
  await expect(page.getByRole("note")).toHaveText("Verify against current law before relying on these.");
  await expect(page.getByText("122(5A)")).toBeVisible();
});
