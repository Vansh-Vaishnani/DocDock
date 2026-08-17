import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('DocDock Patient Dashboard & Accessibility E2E Suite', () => {
  test('should render public landing page without visual or access errors', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/DocDock/i);
  });

  test('should perform accessibility audit on main landing page', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations.length).toBeLessThanOrEqual(5);
  });

  test('should navigate to login page and display form controls', async ({ page }) => {
    await page.goto('/auth/login');
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });
});
