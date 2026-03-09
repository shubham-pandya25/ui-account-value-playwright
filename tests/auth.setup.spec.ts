import fs from 'node:fs';
import path from 'node:path';
import { test as setup, expect, Locator, Page } from '@playwright/test';
import { asArray, loadConfig } from '../src/config/load-config';

const config = loadConfig();
const authFile = path.join('playwright', '.auth', 'session.json');

const navigationTimeoutMs = config.behavior?.navigationTimeoutMs ?? 45_000;
const actionTimeoutMs = config.behavior?.actionTimeoutMs ?? 15_000;

setup.setTimeout(180_000);

setup('authenticate account', async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  page.setDefaultTimeout(actionTimeoutMs);
  page.setDefaultNavigationTimeout(navigationTimeoutMs);

  await page.goto(new URL(config.app.loginPath, config.app.baseUrl).toString(), {
    waitUntil: 'domcontentloaded',
    timeout: navigationTimeoutMs,
  });

  await clickIfVisible(page, config.selectors.cookieAcceptButton, 2_000);

  const usernameField =
    (await findFirstVisible(page, config.selectors.usernameInput, 8_000)) ??
    (await findVisibleByLabel(page, /email|username/i, 5_000));

  const passwordField =
    (await findFirstVisible(page, config.selectors.passwordInput, 8_000)) ??
    (await findVisibleByLabel(page, /password/i, 5_000));

  if (!usernameField || !passwordField) {
    console.log('Login page URL:', page.url());
    await page.screenshot({ path: 'test-results/setup-login-missing.png', fullPage: true });
    throw new Error(`Login fields were not visible. Current URL: ${page.url()}`);
  }

  await usernameField.fill(config.account.username);
  await passwordField.fill(config.account.password);

  const signInButton =
    (await findFirstVisible(page, config.selectors.signInButton, 5_000)) ??
    (await findButtonByName(page, /continue|sign in|log in/i, 5_000));

  if (!signInButton) {
    await page.screenshot({ path: 'test-results/setup-signin-missing.png', fullPage: true });
    throw new Error(`Sign-in button was not visible. Current URL: ${page.url()}`);
  }

await signInButton.click();

await handleOtpIfPresent(page);


await page.waitForTimeout(5_000);

const currentUrl = page.url();
console.log('URL after sign-in attempt:', currentUrl);

if (/\/sign-in\/?$/.test(new URL(currentUrl).pathname)) {
  await page.screenshot({ path: 'test-results/setup-still-on-signin.png', fullPage: true });

  const visibleError =
    (await page.getByText(/invalid|incorrect|try again|verification failed|error/i).first().isVisible().catch(() => false)) ||
    (await page.locator('[role="alert"]').first().isVisible().catch(() => false));

  if (visibleError) {
    throw new Error(`Login did not progress and an inline error is visible. Still on: ${currentUrl}`);
  }

  throw new Error(
    `Login did not progress past the sign-in page. Still on: ${currentUrl}. ` +
      `Possible causes: invalid credentials, captcha/anti-bot challenge, unexpected intermediate step, or incorrect selectors.`
  );
}


if (currentUrl.includes('device-approval')) {
  console.log('Device approval step detected. Complete approval, then resume the Playwright run.');
  await page.pause();
}


await dismissOptionalPrompt(page);


await expect
  .poll(() => page.url(), { timeout: 120_000 })
  .not.toMatch(/\/sign-in\/?$/);

await page.context().storageState({ path: authFile });

  await expect
    .poll(() => page.url(), { timeout: 120_000 })
    .toMatch(/(device-approval|enable-passkey|\/c(\/|$))/);

  if (page.url().includes('device-approval')) {
    console.log('Device approval step detected. Complete it manually in the paused browser.');
    await page.pause();
  }

  await expect
    .poll(() => page.url(), { timeout: 120_000 })
    .toMatch(/(enable-passkey|\/c(\/|$))/);

  await dismissOptionalPrompt(page);

  await expect
    .poll(() => page.url(), { timeout: 120_000 })
    .toMatch(/\/c(\/|$)/);

  await page.context().storageState({ path: authFile });
});

async function handleOtpIfPresent(page: Page): Promise<void> {
  const otpValue = config.account.otp;
  if (!otpValue) return;

  const otpSelectors = asArray(config.selectors.otpInput);
  const otpSubmitSelectors = asArray(config.selectors.otpSubmitButton);

  const otpField =
    (otpSelectors.length > 0
      ? await findFirstVisible(page, otpSelectors, 8_000)
      : null) ?? (await findVisibleByLabel(page, /code|otp|verification/i, 3_000));

  if (!otpField) {
    console.warn('OTP value was provided, but no OTP input became visible.');
    return;
  }

  await otpField.fill(otpValue);

  if (otpSubmitSelectors.length > 0) {
    const otpSubmitButton = await findFirstVisible(page, otpSubmitSelectors, 5_000);
    if (otpSubmitButton) {
      await otpSubmitButton.click();
    }
  }
}

async function dismissOptionalPrompt(page: Page): Promise<void> {
  const dismissSelectors = asArray(config.selectors.passkeyDismissButton);

  const dismissButton =
    (dismissSelectors.length > 0
      ? await findFirstVisible(page, dismissSelectors, 1_500)
      : null) ??
    (await findButtonByName(page, /skip|maybe later|not now/i, 1_500));

  if (!dismissButton) return;

  console.log('Optional prompt detected. Clicking dismiss button.');
  await dismissButton.click();
}

async function clickIfVisible(
  page: Page,
  selectors?: string | string[],
  timeoutMs = 2_000
): Promise<void> {
  if (!selectors) return;

  const locator = await findFirstVisible(page, selectors, timeoutMs);
  if (locator) {
    await locator.click();
  }
}

async function requireVisible(
  page: Page,
  selectors: string | string[],
  timeoutMs: number
): Promise<Locator> {
  const locator = await findFirstVisible(page, selectors, timeoutMs);

  if (!locator) {
    throw new Error(`No visible element found for selectors: ${asArray(selectors).join(', ')}`);
  }

  return locator;
}

async function clickFirstVisible(
  page: Page,
  selectors: string | string[],
  timeoutMs = actionTimeoutMs
): Promise<void> {
  const locator = await requireVisible(page, selectors, timeoutMs);
  await locator.click();
}

async function findFirstVisible(
  page: Page,
  selectors: string | string[],
  timeoutMs: number
): Promise<Locator | null> {
  const selectorList = asArray(selectors);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    for (const selector of selectorList) {
      const locator = page.locator(selector).first();
      if (await locator.isVisible().catch(() => false)) {
        return locator;
      }
    }

    await page.waitForTimeout(200);
  }

  return null;
}

async function findVisibleByLabel(
  page: Page,
  label: RegExp,
  timeoutMs: number
): Promise<Locator | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const locator = page.getByLabel(label).first();

    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }

    await page.waitForTimeout(200);
  }

  return null;
}

async function findButtonByName(
  page: Page,
  name: RegExp,
  timeoutMs: number
): Promise<Locator | null> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const locator = page.getByRole('button', { name }).first();

    if (await locator.isVisible().catch(() => false)) {
      return locator;
    }

    await page.waitForTimeout(200);
  }

  return null;
}