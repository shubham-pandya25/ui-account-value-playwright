import { test, expect } from '@playwright/test';
import { loadConfig } from '../src/config/load-config';

const config = loadConfig();

test('validates portfolio value is 0', async ({ page }) => {
  const navigationTimeoutMs = config.behavior?.navigationTimeoutMs ?? 45_000;
  const actionTimeoutMs = config.behavior?.actionTimeoutMs ?? 15_000;

  page.setDefaultTimeout(actionTimeoutMs);
  page.setDefaultNavigationTimeout(navigationTimeoutMs);

  await page.goto(new URL('/c', config.app.baseUrl).toString(), {
    waitUntil: 'domcontentloaded',
  });

  const portfolioLink = page.locator('a[aria-label="Portfolio"]').first();
  await expect(portfolioLink).toBeVisible({ timeout: 10_000 });
  await portfolioLink.click();

  await expect(page).toHaveURL(/\/c\/portfolio/, { timeout: 15_000 });

  const portfolioValue = page.getByText(/^€0\.00$/).first();
  await expect(portfolioValue).toBeVisible({ timeout: 10_000 });
});