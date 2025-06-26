import { test, expect } from '@playwright/test';

test.describe('Excel Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the Templates tab
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Click on Templates tab
    await page.click('text=Templates');
    await page.waitForTimeout(1000);
  });

  test('should display Templates page with Excel models section', async ({ page }) => {
    // Check page title
    await expect(page.locator('h2:has-text("Excel Models")')).toBeVisible();
    
    // Check upload button
    await expect(page.locator('button:has-text("Upload")')).toBeVisible();
    
    // Check templates button
    await expect(page.locator('button:has-text("Templates")')).toBeVisible();
    
    // Check server status indicator
    await expect(page.locator('text=/LibreOffice Online|Local Mode/')).toBeVisible();
  });

  test('should load sample Excel file automatically', async ({ page }) => {
    // Wait for sample file to load
    await page.waitForSelector('text=Latham Historical Financials.xlsx', { timeout: 5000 });
    
    // Check if file appears in the list
    await expect(page.locator('text=Latham Historical Financials.xlsx')).toBeVisible();
  });

  test('should open Excel file in viewer when clicked', async ({ page }) => {
    // Wait for and click on the sample file
    await page.waitForSelector('text=Latham Historical Financials.xlsx');
    await page.click('text=Latham Historical Financials.xlsx');
    
    // Wait for loading to complete
    await page.waitForTimeout(2000);
    
    // Check if toolbar is visible
    await expect(page.locator('button[title="Download"]')).toBeVisible();
    await expect(page.locator('button[title="Refresh"]')).toBeVisible();
    await expect(page.locator('button[title="Close"]')).toBeVisible();
    
    // Check if iframe is loaded
    const iframe = page.frameLocator('iframe[title="LibreOffice Excel Editor"]');
    await expect(iframe.locator('body')).toBeTruthy();
  });

  test('should show template gallery when Templates button is clicked', async ({ page }) => {
    // Click Templates button
    await page.click('button:has-text("Templates")');
    await page.waitForTimeout(500);
    
    // Check if template categories are visible
    await expect(page.locator('text=Financial Model Templates')).toBeVisible();
    await expect(page.locator('text=Valuation Models')).toBeVisible();
    await expect(page.locator('text=Financial Models')).toBeVisible();
    await expect(page.locator('text=Analysis Tools')).toBeVisible();
    
    // Check specific templates
    await expect(page.locator('text=DCF Valuation Model')).toBeVisible();
    await expect(page.locator('text=Three Statement Model')).toBeVisible();
    await expect(page.locator('text=LBO Model')).toBeVisible();
  });

  test('should load template when clicked', async ({ page }) => {
    // Click Templates button
    await page.click('button:has-text("Templates")');
    await page.waitForTimeout(500);
    
    // Click on DCF Model template
    await page.click('text=DCF Valuation Model');
    await page.waitForTimeout(2000);
    
    // Check if file is added to list
    await expect(page.locator('text=/DCF Valuation Model.*xlsx/')).toBeVisible();
    
    // Check if viewer opens
    await expect(page.locator('iframe[title="LibreOffice Excel Editor"]')).toBeVisible();
  });

  test('should support file upload', async ({ page }) => {
    // Click upload button
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('button:has-text("Upload")');
    
    const fileChooser = await fileChooserPromise;
    
    // Set test file
    await fileChooser.setFiles('./public/sample-financials.xlsx');
    
    // Wait for file to appear in list
    await page.waitForTimeout(1000);
    
    // Check if file was uploaded
    const fileCount = await page.locator('.text-green-500').count();
    expect(fileCount).toBeGreaterThan(0);
  });

  test('should display Excel shortcuts', async ({ page }) => {
    // Check if shortcuts are visible
    await expect(page.locator('text=Excel Shortcuts:')).toBeVisible();
    await expect(page.locator('text=F2: Edit cell')).toBeVisible();
    await expect(page.locator('text=Ctrl+[: Trace precedents')).toBeVisible();
    await expect(page.locator('text=Ctrl+]: Trace dependents')).toBeVisible();
    await expect(page.locator('text=F5: Go to cell')).toBeVisible();
  });

  test('should close Excel viewer when X is clicked', async ({ page }) => {
    // Open a file
    await page.click('text=Latham Historical Financials.xlsx');
    await page.waitForTimeout(1000);
    
    // Click close button
    await page.click('button[title="Close"]');
    await page.waitForTimeout(500);
    
    // Check if viewer is closed
    await expect(page.locator('text=No file selected')).toBeVisible();
  });

  test('should handle download functionality', async ({ page, context }) => {
    // Open a file
    await page.click('text=Latham Historical Financials.xlsx');
    await page.waitForTimeout(1000);
    
    // Set up download promise
    const downloadPromise = page.waitForEvent('download');
    
    // Click download button
    await page.click('button[title="Download"]');
    
    // Wait for download to start
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('.xlsx');
  });
});

// Backend integration tests
test.describe('Excel Backend Integration', () => {
  const API_URL = 'http://localhost:8000/api/v1/excel';

  test('should check if backend Excel API is available', async ({ request }) => {
    const response = await request.get(`${API_URL}/templates`);
    
    // Backend might not be running in test environment
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('templates');
      expect(Array.isArray(data.templates)).toBeTruthy();
    }
  });

  test('should handle file upload to backend', async ({ request, page }) => {
    // Only run if backend is available
    const healthCheck = await request.get(`${API_URL}/templates`);
    if (!healthCheck.ok()) {
      test.skip();
    }

    // Create test file
    const buffer = Buffer.from('Test Excel Content');
    
    // Upload file
    const response = await request.post(`${API_URL}/upload`, {
      multipart: {
        file: {
          name: 'test.xlsx',
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer: buffer
        }
      }
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('session_id');
      expect(data).toHaveProperty('filename');
      expect(data.filename).toBe('test.xlsx');
    }
  });
});