import { test, expect } from '@playwright/test';

test.describe('Financials Page Fixes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByPlaceholder('Search for a symbol...').fill('AAPL');
    await page.getByPlaceholder('Search for a symbol...').press('Enter');
    await page.waitForSelector('text=Apple Inc.');
    await page.getByText('Financials').click();
    await page.waitForSelector('text=Financial Statements');
  });

  test('should show different data for FY vs QTR views', async ({ page }) => {
    // Check FY view data
    await page.waitForSelector('text=Revenue');
    const fyRevenueRow = page.locator('tr:has-text("Revenue")');
    const fyFirstValue = await fyRevenueRow.locator('td').nth(1).textContent();
    
    // Switch to QTR view
    await page.getByText('QTR', { exact: true }).click();
    await page.waitForTimeout(500); // Wait for re-render
    
    // Check QTR view data
    const qtrRevenueRow = page.locator('tr:has-text("Revenue")');
    const qtrFirstValue = await qtrRevenueRow.locator('td').nth(1).textContent();
    
    // Values should be different
    expect(fyFirstValue).toBeTruthy();
    expect(qtrFirstValue).toBeTruthy();
    expect(fyFirstValue).not.toBe(qtrFirstValue);
    
    // FY should have annual values (larger)
    expect(fyFirstValue).toContain('391,035'); // Annual revenue
    // QTR should have quarterly values (smaller)
    expect(qtrFirstValue).toContain('94,372'); // Quarterly revenue
  });

  test('should show quarterly headers in QTR view', async ({ page }) => {
    // Initially in FY view - should show years
    await expect(page.locator('th:has-text("2024")')).toBeVisible();
    await expect(page.locator('th:has-text("2023")')).toBeVisible();
    
    // Should NOT have quarterly headers
    await expect(page.locator('th:has-text("Q3 2024")')).not.toBeVisible();
    
    // Switch to QTR view
    await page.getByText('QTR', { exact: true }).click();
    await page.waitForTimeout(500);
    
    // Should now show quarterly headers
    await expect(page.locator('th:has-text("Q3 2024")')).toBeVisible();
    await expect(page.locator('th:has-text("Q2 2024")')).toBeVisible();
    await expect(page.locator('th:has-text("Q1 2024")')).toBeVisible();
    
    // Should NOT show year-only headers
    const yearOnly2024 = page.locator('th').filter({ hasText: /^2024$/ });
    await expect(yearOnly2024).not.toBeVisible();
  });

  test('should keep Index column fixed when scrolling horizontally', async ({ page }) => {
    await page.waitForSelector('text=Revenue');
    
    // Get the table container
    const tableContainer = page.locator('.overflow-auto').first();
    
    // Get initial positions
    const indexHeader = page.locator('th:has-text("Index")');
    const revenueCell = page.locator('td:has-text("Revenue")').first();
    
    // Get initial bounding boxes
    const initialHeaderBox = await indexHeader.boundingBox();
    const initialRevenueBox = await revenueCell.boundingBox();
    
    // Scroll horizontally
    await tableContainer.evaluate(el => el.scrollLeft = 500);
    await page.waitForTimeout(100); // Wait for scroll
    
    // Get new bounding boxes
    const scrolledHeaderBox = await indexHeader.boundingBox();
    const scrolledRevenueBox = await revenueCell.boundingBox();
    
    // Index column should remain at the same x position
    expect(scrolledHeaderBox?.x).toBe(initialHeaderBox?.x);
    expect(scrolledRevenueBox?.x).toBe(initialRevenueBox?.x);
    
    // Verify sticky classes are applied
    await expect(indexHeader).toHaveClass(/sticky.*left-0.*z-30/);
    await expect(revenueCell).toHaveClass(/sticky.*left-0.*z-20/);
  });

  test('should not have overlapping text when scrolling', async ({ page }) => {
    await page.waitForSelector('text=Revenue');
    
    const tableContainer = page.locator('.overflow-auto').first();
    
    // Scroll to various positions and take screenshots
    const scrollPositions = [0, 200, 400, 600];
    
    for (const position of scrollPositions) {
      await tableContainer.evaluate((el, pos) => el.scrollLeft = pos, position);
      await page.waitForTimeout(100);
      
      // Check that index column has proper styling
      const indexCells = page.locator('td.sticky.left-0');
      const count = await indexCells.count();
      
      for (let i = 0; i < Math.min(count, 3); i++) {
        const cell = indexCells.nth(i);
        await expect(cell).toHaveClass(/min-w-\[200px\]/);
        await expect(cell).toHaveClass(/shadow-\[4px_0_8px_-2px_rgba\(0,0,0,0\.1\)\]/);
      }
    }
    
    // Take final screenshot at max scroll
    await tableContainer.evaluate(el => el.scrollLeft = el.scrollWidth);
    await page.screenshot({ 
      path: 'financials-max-scroll.png',
      clip: await tableContainer.boundingBox() || undefined
    });
  });

  test('should maintain proper z-index layering', async ({ page }) => {
    await page.waitForSelector('text=Revenue');
    
    // Check z-index values
    const indexHeader = page.locator('th:has-text("Index")');
    await expect(indexHeader).toHaveClass(/z-30/); // Header should have higher z-index
    
    const indexCells = page.locator('td.sticky.left-0');
    const firstCell = indexCells.first();
    await expect(firstCell).toHaveClass(/z-20/); // Body cells should have lower z-index
  });
});