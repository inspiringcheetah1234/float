import { expect, type Page } from "@playwright/test";
import { authenticator } from "otplib";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

export const creds = JSON.parse(readFileSync(".demo-credentials.json", "utf8")) as {
  password: string;
  owner_totp_secret: string;
};

/** Signs in; completes TOTP for the Owner. */
export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", creds.password);
  await page.click("button[type=submit]");
  // "/" redirects onwards (to /mfa, /today or /my-work), so wait until we have left it too
  await page.waitForURL((u) => u.pathname !== "/login" && u.pathname !== "/");
  if (page.url().includes("/mfa")) {
    await page.locator("#code").fill(nextTotp());
    await page.getByRole("button", { name: "Verify" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/mfa"));
  }
  await page.waitForLoadState("networkidle");
}

let lastCode = "";
/** A TOTP code not used yet in this run (Supabase rejects a reused code). */
export function nextTotp(): string {
  let code = authenticator.generate(creds.owner_totp_secret);
  while (code === lastCode) {
    execSync("sleep 1");
    code = authenticator.generate(creds.owner_totp_secret);
  }
  lastCode = code;
  return code;
}

export function sql(query: string): string {
  return execSync(`psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -tAc ${JSON.stringify(query)}`, { encoding: "utf8" }).trim();
}

export const clientId = (name: string) => sql(`select id from clients where name = '${name.replace(/'/g, "''")}'`);

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: text }).first()).toBeVisible();
}
