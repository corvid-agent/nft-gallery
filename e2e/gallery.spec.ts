import { test, expect } from '@playwright/test';

// Minimal valid 1x1 transparent PNG
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB' +
  'Nl7BcQAAAABJRU5ErkJggg==',
  'base64'
);

// Mock asset data used across tests
const MOCK_ASSETS = [
  {
    index: 100001,
    params: {
      name: 'Cool NFT #1',
      'unit-name': 'COOL1',
      url: 'https://example.com/nft1.png',
      total: 1,
      decimals: 0,
      creator: 'WGSHC4TYKYBS6EX5V5E377BQDLKWIIPBCFOLZQZIXCKHFIEKRPBFOMW25A',
    },
  },
  {
    index: 100002,
    params: {
      name: 'Cool NFT #2',
      'unit-name': 'COOL2',
      url: 'https://example.com/nft2.png',
      total: 100,
      decimals: 0,
      creator: 'WGSHC4TYKYBS6EX5V5E377BQDLKWIIPBCFOLZQZIXCKHFIEKRPBFOMW25A',
    },
  },
  {
    index: 100003,
    params: {
      name: 'Cool NFT #3',
      'unit-name': 'COOL3',
      url: 'https://example.com/nft3.png',
      total: 50,
      decimals: 2,
      creator: 'WGSHC4TYKYBS6EX5V5E377BQDLKWIIPBCFOLZQZIXCKHFIEKRPBFOMW25A',
    },
  },
];

const MOCK_SINGLE_ASSET = {
  asset: {
    index: 12345,
    params: {
      name: 'Single NFT',
      'unit-name': 'SNFT',
      url: 'https://example.com/single.png',
      total: 1,
      decimals: 0,
      creator: 'OJGTHEJ2O5NXN7FVXDZZEEJTUEQHHCIYIE5MWY6BEFVVLZ2KANJODBOKGA',
      reserve: 'D5J7H7PIYKLY2U6A5OFUAC7GQHTHSXXNX65DSD3CJYPBV2MVK6NTNW44CA',
    },
  },
};

const MOCK_ARC69 = {
  transactions: [
    {
      note: btoa(
        JSON.stringify({
          standard: 'arc69',
          description: 'A really cool NFT',
          properties: { Background: 'Blue', Rarity: 'Legendary' },
        })
      ),
    },
  ],
};

function setupMocks(page: import('@playwright/test').Page) {
  return Promise.all([
    // Mock created-assets endpoint (address lookup)
    page.route('**/v2/accounts/*/created-assets*', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ assets: MOCK_ASSETS, 'next-token': null }),
      });
    }),
    // Mock single asset detail endpoint
    page.route('**/v2/assets/*', (route, request) => {
      const url = request.url();
      // Don't intercept transaction lookups
      if (url.includes('/transactions')) return route.continue();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SINGLE_ASSET),
      });
    }),
    // Mock ARC-69 transaction lookups
    page.route('**/v2/assets/*/transactions*', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ARC69),
      });
    }),
    // Mock image requests
    page.route('**/example.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG })
    ),
    page.route('**/ipfs.io/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG })
    ),
  ]);
}

test.describe('Gallery - Featured Collections', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');
  });

  test('should display the Featured Collections heading', async ({ page }) => {
    const heading = page.locator('#featuredSection .section-heading span').first();
    await expect(heading).toHaveText('Featured Collections');
  });

  test('should render 5 featured collection cards', async ({ page }) => {
    const cards = page.locator('#collectionsGrid .collection-card');
    await expect(cards).toHaveCount(5);
  });

  test('should display collection names', async ({ page }) => {
    const names = page.locator('#collectionsGrid .collection-card h3');
    await expect(names.nth(0)).toHaveText('Nevermore');
    await expect(names.nth(1)).toHaveText('Alchemon');
    await expect(names.nth(2)).toHaveText('Al Goanna');
    await expect(names.nth(3)).toHaveText('Shitty Kitties');
    await expect(names.nth(4)).toHaveText('Yieldlings');
  });

  test('should display collection icons', async ({ page }) => {
    const icons = page.locator('#collectionsGrid .collection-card .collection-icon');
    await expect(icons).toHaveCount(5);
  });

  test('should load NFTs when clicking a featured collection', async ({ page }) => {
    const firstCard = page.locator('#collectionsGrid .collection-card').first();
    await firstCard.click();

    // The results section should become visible
    const resultsSection = page.locator('#resultsSection');
    await expect(resultsSection).toBeVisible();

    // The results heading should show the collection name
    const resultsHeading = page.locator('#resultsHeading');
    await expect(resultsHeading).toHaveText('Nevermore');

    // NFT cards should appear
    const nftCards = page.locator('#nftGrid .nft-card');
    await expect(nftCards).toHaveCount(3);
  });

  test('should populate search input when clicking a collection', async ({ page }) => {
    const firstCard = page.locator('#collectionsGrid .collection-card').first();
    await firstCard.click();

    const searchInput = page.locator('#searchInput');
    await expect(searchInput).toHaveValue(/^[A-Z2-7]+$/);
  });
});

test.describe('Gallery - Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');
  });

  test('should search by asset ID and display single result', async ({ page }) => {
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('12345');
    await page.locator('#searchBtn').click();

    // Results section should appear
    await expect(page.locator('#resultsSection')).toBeVisible();

    // Heading should show Asset #12345
    await expect(page.locator('#resultsHeading')).toHaveText('Asset #12345');

    // One NFT card should render
    const cards = page.locator('#nftGrid .nft-card');
    await expect(cards).toHaveCount(1);
  });

  test('should search by address and display results', async ({ page }) => {
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('WGSHC4TYKYBS6EX5V5E377BQDLKWIIPBCFOLZQZIXCKHFIEKRPBFOMW25A');
    await page.locator('#searchBtn').click();

    await expect(page.locator('#resultsSection')).toBeVisible();
    await expect(page.locator('#resultsHeading')).toContainText('Assets by WGSHC4TY');

    const cards = page.locator('#nftGrid .nft-card');
    await expect(cards).toHaveCount(3);
  });

  test('should trigger search with Enter key', async ({ page }) => {
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('12345');
    await searchInput.press('Enter');

    await expect(page.locator('#resultsSection')).toBeVisible();
    await expect(page.locator('#resultsHeading')).toHaveText('Asset #12345');
  });

  test('should not search with empty input', async ({ page }) => {
    await page.locator('#searchBtn').click();
    // Results section should remain hidden
    await expect(page.locator('#resultsSection')).toBeHidden();
  });

  test('should display NFT card details correctly', async ({ page }) => {
    const searchInput = page.locator('#searchInput');
    await searchInput.fill('WGSHC4TYKYBS6EX5V5E377BQDLKWIIPBCFOLZQZIXCKHFIEKRPBFOMW25A');
    await page.locator('#searchBtn').click();

    const firstCard = page.locator('#nftGrid .nft-card').first();
    await expect(firstCard).toBeVisible();

    // Check card info elements
    await expect(firstCard.locator('.nft-name')).toHaveText('Cool NFT #1');
    await expect(firstCard.locator('.unit-name')).toHaveText('COOL1');
    await expect(firstCard.locator('.asset-id')).toHaveText('#100001');
  });
});

test.describe('Gallery - Detail Modal', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');
  });

  test('should open detail modal when clicking an NFT card', async ({ page }) => {
    // First search to get cards
    await page.locator('#searchInput').fill('WGSHC4TYKYBS6EX5V5E377BQDLKWIIPBCFOLZQZIXCKHFIEKRPBFOMW25A');
    await page.locator('#searchBtn').click();

    const firstCard = page.locator('#nftGrid .nft-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    // Modal should become active
    const overlay = page.locator('#modalOverlay');
    await expect(overlay).toHaveClass(/active/);
  });

  test('should display asset details in the modal', async ({ page }) => {
    await page.locator('#searchInput').fill('WGSHC4TYKYBS6EX5V5E377BQDLKWIIPBCFOLZQZIXCKHFIEKRPBFOMW25A');
    await page.locator('#searchBtn').click();

    await page.locator('#nftGrid .nft-card').first().click();

    // Wait for modal content to load
    const modalBody = page.locator('.modal-body');
    await expect(modalBody).toBeVisible();

    // Check the asset name renders in the modal heading
    await expect(modalBody.locator('h2')).toBeVisible();

    // Check detail grid items exist
    const detailItems = page.locator('.modal .detail-item');
    await expect(detailItems.first()).toBeVisible();
  });

  test('should display trait badges when ARC-69 metadata has properties', async ({ page }) => {
    await page.locator('#searchInput').fill('WGSHC4TYKYBS6EX5V5E377BQDLKWIIPBCFOLZQZIXCKHFIEKRPBFOMW25A');
    await page.locator('#searchBtn').click();

    await page.locator('#nftGrid .nft-card').first().click();

    const modalBody = page.locator('.modal-body');
    await expect(modalBody).toBeVisible();

    // There should be trait badges from the ARC-69 mock (Background, Rarity)
    const traitBadges = page.locator('.modal .trait-badge');
    await expect(traitBadges).toHaveCount(2);

    await expect(traitBadges.nth(0).locator('.trait-type')).toContainText('Background');
    await expect(traitBadges.nth(0).locator('.trait-value')).toHaveText('Blue');
    await expect(traitBadges.nth(1).locator('.trait-type')).toContainText('Rarity');
    await expect(traitBadges.nth(1).locator('.trait-value')).toHaveText('Legendary');
  });

  test('should close modal when clicking the close button', async ({ page }) => {
    await page.locator('#searchInput').fill('WGSHC4TYKYBS6EX5V5E377BQDLKWIIPBCFOLZQZIXCKHFIEKRPBFOMW25A');
    await page.locator('#searchBtn').click();

    await page.locator('#nftGrid .nft-card').first().click();
    await expect(page.locator('#modalOverlay')).toHaveClass(/active/);

    await page.locator('.modal-close').click();
    await expect(page.locator('#modalOverlay')).not.toHaveClass(/active/);
  });

  test('should close modal when pressing Escape', async ({ page }) => {
    await page.locator('#searchInput').fill('WGSHC4TYKYBS6EX5V5E377BQDLKWIIPBCFOLZQZIXCKHFIEKRPBFOMW25A');
    await page.locator('#searchBtn').click();

    await page.locator('#nftGrid .nft-card').first().click();
    await expect(page.locator('#modalOverlay')).toHaveClass(/active/);

    await page.keyboard.press('Escape');
    await expect(page.locator('#modalOverlay')).not.toHaveClass(/active/);
  });
});

test.describe('Gallery - Tab Switching', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');
  });

  test('should switch to Favorites tab and show empty state', async ({ page }) => {
    // Clear any localStorage favorites
    await page.evaluate(() => localStorage.removeItem('nft-favorites'));

    const favTab = page.locator('.tab-btn[data-tab="favorites"]');
    await favTab.click();

    // Favorites tab should be active
    await expect(favTab).toHaveClass(/active/);
    await expect(page.locator('.tab-btn[data-tab="browse"]')).not.toHaveClass(/active/);

    // Favorites tab content should be visible
    await expect(page.locator('#favoritesTab')).toBeVisible();
    await expect(page.locator('#browseTab')).toBeHidden();

    // Should show empty favorites message
    await expect(page.locator('#favStatus')).toContainText('No favorites yet');
  });

  test('should switch back to Browse tab', async ({ page }) => {
    // Go to favorites
    await page.locator('.tab-btn[data-tab="favorites"]').click();
    await expect(page.locator('#favoritesTab')).toBeVisible();

    // Go back to browse
    await page.locator('.tab-btn[data-tab="browse"]').click();
    await expect(page.locator('#browseTab')).toBeVisible();
    await expect(page.locator('#favoritesTab')).toBeHidden();
    await expect(page.locator('.tab-btn[data-tab="browse"]')).toHaveClass(/active/);
  });
});

test.describe('Gallery - Favorites', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await page.goto('/');
    // Clear favorites
    await page.evaluate(() => localStorage.removeItem('nft-favorites'));
  });

  test('should toggle favorite on an NFT card via the heart button', async ({ page }) => {
    await page.locator('#searchInput').fill('WGSHC4TYKYBS6EX5V5E377BQDLKWIIPBCFOLZQZIXCKHFIEKRPBFOMW25A');
    await page.locator('#searchBtn').click();

    const firstCard = page.locator('#nftGrid .nft-card').first();
    await expect(firstCard).toBeVisible();

    const favBtn = firstCard.locator('.fav-btn');
    await expect(favBtn).toBeVisible();

    // Click favorite button
    await favBtn.click();
    await expect(favBtn).toHaveClass(/active/);

    // Click again to unfavorite
    await favBtn.click();
    await expect(favBtn).not.toHaveClass(/active/);
  });

  test('should show favorited NFTs in the Favorites tab', async ({ page }) => {
    await page.locator('#searchInput').fill('WGSHC4TYKYBS6EX5V5E377BQDLKWIIPBCFOLZQZIXCKHFIEKRPBFOMW25A');
    await page.locator('#searchBtn').click();

    // Favorite the first NFT
    const firstCard = page.locator('#nftGrid .nft-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.locator('.fav-btn').click();

    // Switch to Favorites tab
    await page.locator('.tab-btn[data-tab="favorites"]').click();

    // Should show one favorite card
    const favCards = page.locator('#favGrid .nft-card');
    await expect(favCards).toHaveCount(1);
  });

  test('should persist favorites in localStorage', async ({ page }) => {
    await page.locator('#searchInput').fill('WGSHC4TYKYBS6EX5V5E377BQDLKWIIPBCFOLZQZIXCKHFIEKRPBFOMW25A');
    await page.locator('#searchBtn').click();

    // Favorite the first card
    const firstCard = page.locator('#nftGrid .nft-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.locator('.fav-btn').click();

    // Verify localStorage was set
    const favData = await page.evaluate(() => localStorage.getItem('nft-favorites'));
    expect(favData).toBeTruthy();
    const parsed = JSON.parse(favData!);
    expect(Object.keys(parsed).length).toBe(1);
  });
});

test.describe('Gallery - API Error Handling', () => {
  test('should display error message when API returns an error', async ({ page }) => {
    // Mock with error response
    await page.route('**/v2/assets/*', (route) => {
      const url = route.request().url();
      if (url.includes('/transactions')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ transactions: [] }),
        });
      }
      return route.fulfill({ status: 404, body: 'Not found' });
    });
    await page.route('**/v2/accounts/*/created-assets*', (route) =>
      route.fulfill({ status: 500, body: 'Server error' })
    );
    await page.route('**/ipfs.io/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG })
    );

    await page.goto('/');

    await page.locator('#searchInput').fill('WGSHC4TYKYBS6EX5V5E377BQDLKWIIPBCFOLZQZIXCKHFIEKRPBFOMW25A');
    await page.locator('#searchBtn').click();

    // Should show an error status message
    const statusArea = page.locator('#statusArea .status-msg');
    await expect(statusArea).toBeVisible();
    await expect(statusArea).toHaveClass(/error/);
  });
});

test.describe('Gallery - Load More', () => {
  test('should show Load More button when there are more results', async ({ page }) => {
    // Mock with next-token to indicate more results
    await page.route('**/v2/accounts/*/created-assets*', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ assets: MOCK_ASSETS, 'next-token': 'abc123' }),
      });
    });
    await page.route('**/v2/assets/*/transactions*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ transactions: [] }),
      })
    );
    await page.route('**/example.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG })
    );
    await page.route('**/ipfs.io/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG })
    );

    await page.goto('/');

    await page.locator('#searchInput').fill('WGSHC4TYKYBS6EX5V5E377BQDLKWIIPBCFOLZQZIXCKHFIEKRPBFOMW25A');
    await page.locator('#searchBtn').click();

    // Wait for cards to render
    await expect(page.locator('#nftGrid .nft-card').first()).toBeVisible();

    // Load More button should be visible
    const loadMoreBtn = page.locator('#loadMoreBtn');
    await expect(loadMoreBtn).toBeVisible();
    await expect(loadMoreBtn).toHaveText('Load More');
  });

  test('should hide Load More button when there are no more results', async ({ page }) => {
    // Mock with no next-token
    await page.route('**/v2/accounts/*/created-assets*', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ assets: MOCK_ASSETS, 'next-token': null }),
      });
    });
    await page.route('**/v2/assets/*/transactions*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ transactions: [] }),
      })
    );
    await page.route('**/example.com/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG })
    );
    await page.route('**/ipfs.io/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG })
    );

    await page.goto('/');

    await page.locator('#searchInput').fill('WGSHC4TYKYBS6EX5V5E377BQDLKWIIPBCFOLZQZIXCKHFIEKRPBFOMW25A');
    await page.locator('#searchBtn').click();

    await expect(page.locator('#nftGrid .nft-card').first()).toBeVisible();

    // Load More container should be hidden
    await expect(page.locator('#loadMoreContainer')).toBeHidden();
  });
});
