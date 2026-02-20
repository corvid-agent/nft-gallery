import { test, expect } from '@playwright/test';

test.describe('App', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/mainnet-idx.4160.nodely.dev/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ assets: [], account: { amount: 0, assets: [] } }) })
    );
    await page.route('**/ipfs.io/**', route =>
      route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('') })
    );
  });

  test('should load with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/NFT Gallery/i);
  });

  test('should show search input', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#searchInput')).toBeVisible();
  });

  test('should show collections grid', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#collectionsGrid')).toBeAttached();
  });

  test('should show tab buttons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.tab-btn').first()).toBeVisible();
  });
});
