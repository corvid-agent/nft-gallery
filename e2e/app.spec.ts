import { test, expect } from '@playwright/test';

// Minimal valid 1x1 transparent PNG
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB' +
  'Nl7BcQAAAABJRU5ErkJggg==',
  'base64'
);

test.describe('App - Basic Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Mock all Algorand indexer API calls
    await page.route('**/mainnet-idx.4160.nodely.dev/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ assets: [], transactions: [], account: { amount: 0, assets: [] } }),
      })
    );
    // Mock IPFS gateway requests
    await page.route('**/ipfs.io/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG })
    );
    await page.goto('/');
  });

  test('should load with correct title', async ({ page }) => {
    await expect(page).toHaveTitle('Algorand NFT Gallery');
  });

  test('should display the navigation bar with logo', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    const logo = nav.locator('.logo');
    await expect(logo).toBeVisible();
    await expect(logo).toContainText('NFT Gallery');
  });

  test('should display nav links to Dashboard, Apps, and GitHub', async ({ page }) => {
    const navLinks = page.locator('nav .nav-links a');
    await expect(navLinks).toHaveCount(3);
    await expect(navLinks.nth(0)).toHaveText('Dashboard');
    await expect(navLinks.nth(1)).toHaveText('Apps');
    await expect(navLinks.nth(2)).toHaveText('GitHub');
  });

  test('should display the hero section with heading and description', async ({ page }) => {
    const hero = page.locator('.hero');
    await expect(hero).toBeVisible();
    await expect(hero.locator('h1')).toHaveText('Algorand NFT Gallery');
    await expect(hero.locator('p')).toHaveText('Browse, explore, and favorite NFTs on the Algorand blockchain');
  });

  test('should display the search input and button', async ({ page }) => {
    const searchInput = page.locator('#searchInput');
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute('placeholder', 'Enter Algorand address or asset ID...');

    const searchBtn = page.locator('#searchBtn');
    await expect(searchBtn).toBeVisible();
    await expect(searchBtn).toHaveText('Search');
  });

  test('should display Browse and Favorites tab buttons', async ({ page }) => {
    const tabs = page.locator('.tab-btn');
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(0)).toHaveText('Browse');
    await expect(tabs.nth(1)).toHaveText('Favorites');
    // Browse tab should be active by default
    await expect(tabs.nth(0)).toHaveClass(/active/);
    await expect(tabs.nth(1)).not.toHaveClass(/active/);
  });

  test('should display the footer with correct text', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer.locator('p')).toContainText('Built autonomously by corvid-agent');
  });

  test('should display footer links', async ({ page }) => {
    const footerLinks = page.locator('footer .footer-links a');
    await expect(footerLinks).toHaveCount(3);
    await expect(footerLinks.nth(0)).toHaveText('GitHub');
    await expect(footerLinks.nth(1)).toHaveText('Landing Page');
    await expect(footerLinks.nth(2)).toHaveText('Discord');
  });

  test('should have the modal overlay hidden by default', async ({ page }) => {
    const overlay = page.locator('#modalOverlay');
    await expect(overlay).toBeAttached();
    await expect(overlay).not.toHaveClass(/active/);
  });

  test('should show the browse tab content and hide favorites by default', async ({ page }) => {
    const browseTab = page.locator('#browseTab');
    await expect(browseTab).toBeVisible();
    const favoritesTab = page.locator('#favoritesTab');
    await expect(favoritesTab).toBeHidden();
  });
});
