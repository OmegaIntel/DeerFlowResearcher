import { test, expect } from '@playwright/test';

test.describe('Financials Page Scrolling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    // Navigate to a stock dashboard
    await page.getByPlaceholder('Search for a symbol...').fill('AAPL');
    await page.getByPlaceholder('Search for a symbol...').press('Enter');
    // Wait for dashboard to load
    await page.waitForSelector('text=Apple Inc.');
    // Navigate to Financials tab
    await page.getByText('Financials').click();
  });

  test('should have sticky index column when scrolling horizontally', async ({ page }) => {
    // Wait for the financial table to load
    await page.waitForSelector('text=Revenue');
    
    // Get the initial position of the index column
    const indexHeader = page.locator('th:has-text("Index")');
    const revenueCell = page.locator('td:has-text("Revenue")').first();
    
    // Verify sticky styling
    await expect(indexHeader).toHaveClass(/sticky.*left-0.*z-20/);
    await expect(revenueCell).toHaveClass(/sticky.*left-0.*z-20/);
    
    // Scroll the table container horizontally
    const tableContainer = page.locator('.overflow-auto').first();
    await tableContainer.evaluate(el => el.scrollLeft = 500);
    
    // Check that the index column is still visible at the left edge
    const indexHeaderBox = await indexHeader.boundingBox();
    const revenueCellBox = await revenueCell.boundingBox();
    
    expect(indexHeaderBox?.x).toBeLessThan(100); // Should be near left edge
    expect(revenueCellBox?.x).toBeLessThan(100); // Should be near left edge
    
    // Take screenshot to verify no overlapping
    await page.screenshot({ 
      path: 'financials-scrolled.png',
      fullPage: false 
    });
  });

  test('should show different headers for quarterly view', async ({ page }) => {
    // Wait for the financial table to load
    await page.waitForSelector('text=Revenue');
    
    // Initially should show years
    await expect(page.locator('th:has-text("2024")')).toBeVisible();
    await expect(page.locator('th:has-text("2023")')).toBeVisible();
    
    // Switch to QTR view
    await page.getByText('QTR').click();
    
    // Should show quarterly headers
    await expect(page.locator('th:has-text("Q3 2024")')).toBeVisible();
    await expect(page.locator('th:has-text("Q2 2024")')).toBeVisible();
    
    // Revenue values should be different
    const revenueValues = await page.locator('td:has-text("Revenue") ~ td').first().textContent();
    expect(revenueValues).toContain('94,372'); // Quarterly value
  });

  test('should maintain proper background color for sticky columns', async ({ page }) => {
    // Wait for the financial table to load
    await page.waitForSelector('text=Revenue');
    
    // Get all sticky cells
    const stickyCells = page.locator('td.sticky.left-0');
    const count = await stickyCells.count();
    
    // Check alternating background colors
    for (let i = 0; i < Math.min(count, 5); i++) {
      const cell = stickyCells.nth(i);
      if (i % 2 === 0) {
        await expect(cell).toHaveClass(/bg-openbb-bg-widget/);
      } else {
        await expect(cell).toHaveClass(/bg-openbb-bg-secondary/);
      }
    }
  });

  test('should not have overlapping issues with shadow', async ({ page }) => {
    // Wait for the financial table to load
    await page.waitForSelector('text=Revenue');
    
    // Scroll horizontally
    const tableContainer = page.locator('.overflow-auto').first();
    await tableContainer.evaluate(el => el.scrollLeft = 300);
    
    // Check that sticky columns have shadow styling
    const indexHeader = page.locator('th:has-text("Index")');
    await expect(indexHeader).toHaveClass(/shadow-\[2px_0_4px_rgba\(0,0,0,0\.1\)\]/);
    
    // Take a screenshot to visually verify
    await page.screenshot({ 
      path: 'financials-no-overlap.png',
      fullPage: false 
    });
  });
});