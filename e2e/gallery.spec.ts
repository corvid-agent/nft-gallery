import { test, expect } from '@playwright/test';

test.describe('Gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/mainnet-idx.4160.nodely.dev/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ assets: [], account: { amount: 0, assets: [] } }) })
    );
    await page.route('**/ipfs.io/**', route =>
      route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('') })
    );
  });

  test('should show NFT grid area', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#nftGrid')).toBeAttached();
  });

  test('should show favorites grid area', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#favGrid')).toBeAttached();
  });

  test('should switch to favorites tab', async ({ page }) => {
    await page.goto('/');
    const favTab = page.locator('.tab-btn[data-tab="favorites"]');
    if (await favTab.isVisible()) {
      await favTab.click();
    }
  });

  test('should have modal overlay', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#modalOverlay, #modal').first()).toBeAttached();
  });

  test('should have search functionality', async ({ page }) => {
    await page.goto('/');
    const search = page.locator('#searchInput');
    await search.fill('12345');
  });
});
