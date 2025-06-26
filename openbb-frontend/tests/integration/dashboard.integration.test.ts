import { test, expect } from '@playwright/test';

test.describe('OpenBB Dashboard Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should load dashboard with default widgets', async ({ page }) => {
    // Check if main dashboard elements are present
    await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
    
    // Check for default widgets
    await expect(page.locator('[data-testid="ticker-info-widget"]')).toBeVisible();
    await expect(page.locator('[data-testid="company-profile-widget"]')).toBeVisible();
    await expect(page.locator('[data-testid="price-performance-widget"]')).toBeVisible();
  });

  test('should change ticker and update all widgets', async ({ page }) => {
    // Wait for ticker input to be available
    const tickerInput = page.locator('[data-testid="ticker-input"]');
    await expect(tickerInput).toBeVisible();
    
    // Change ticker from AAPL to TSLA
    await tickerInput.fill('TSLA');
    await tickerInput.press('Enter');
    
    // Wait for widgets to update
    await page.waitForTimeout(2000);
    
    // Check if widgets updated with new ticker
    await expect(page.locator('text=TSLA')).toBeVisible();
    
    // Verify specific widget content updated
    const companyProfile = page.locator('[data-testid="company-profile-widget"]');
    await expect(companyProfile).toContainText('TSLA');
  });

  test('should open widget settings and change data provider', async ({ page }) => {
    // Hover over a widget to reveal settings
    const tickerWidget = page.locator('[data-testid="ticker-info-widget"]');
    await tickerWidget.hover();
    
    // Click the settings button
    const settingsButton = page.locator('[data-testid="widget-settings-button"]').first();
    await settingsButton.click();
    
    // Wait for settings modal to appear
    await expect(page.locator('[data-testid="widget-settings-modal"]')).toBeVisible();
    
    // Check provider selection dropdown
    const providerDropdown = page.locator('[data-testid="provider-select"]');
    await providerDropdown.click();
    
    // Select a different provider
    await page.locator('text=Polygon').click();
    
    // Save settings
    await page.locator('text=Save Settings').click();
    
    // Verify modal closes
    await expect(page.locator('[data-testid="widget-settings-modal"]')).not.toBeVisible();
  });

  test('should add new widget using widget selector', async ({ page }) => {
    // Click the add widget button
    const addWidgetButton = page.locator('[data-testid="add-widget-button"]');
    await addWidgetButton.click();
    
    // Wait for widget selection dialog
    await expect(page.locator('[data-testid="widget-selection-dialog"]')).toBeVisible();
    
    // Select Options Flow widget
    await page.locator('[data-testid="widget-option-options-flow"]').click();
    
    // Add the widget
    await page.locator('text=Add Widget').click();
    
    // Verify widget was added to dashboard
    await expect(page.locator('[data-testid="options-flow-widget"]')).toBeVisible();
  });

  test('should remove widget from dashboard', async ({ page }) => {
    // Add a widget first (assuming we have one)
    const addWidgetButton = page.locator('[data-testid="add-widget-button"]');
    await addWidgetButton.click();
    await page.locator('[data-testid="widget-option-balance-sheet"]').click();
    await page.locator('text=Add Widget').click();
    
    // Wait for widget to appear
    await expect(page.locator('[data-testid="balance-sheet-widget"]')).toBeVisible();
    
    // Hover over the widget to reveal remove button
    const balanceSheetWidget = page.locator('[data-testid="balance-sheet-widget"]');
    await balanceSheetWidget.hover();
    
    // Click remove button
    const removeButton = page.locator('[data-testid="remove-widget-button"]').last();
    await removeButton.click();
    
    // Verify widget was removed
    await expect(page.locator('[data-testid="balance-sheet-widget"]')).not.toBeVisible();
  });

  test('should test Options Flow widget functionality', async ({ page }) => {
    // Add Options Flow widget
    const addWidgetButton = page.locator('[data-testid="add-widget-button"]');
    await addWidgetButton.click();
    await page.locator('[data-testid="widget-option-options-flow"]').click();
    await page.locator('text=Add Widget').click();
    
    // Wait for Options Flow widget to load
    await expect(page.locator('[data-testid="options-flow-widget"]')).toBeVisible();
    
    // Check for options flow content
    await expect(page.locator('text=Options Flow')).toBeVisible();
    
    // Test filter functionality
    const filterButton = page.locator('[data-testid="options-filter-button"]');
    await filterButton.click();
    
    // Select bullish filter
    await page.locator('text=Bullish Only').click();
    
    // Verify filter applied
    await expect(page.locator('[data-testid="options-list"]')).toBeVisible();
    
    // Test refresh functionality
    const refreshButton = page.locator('[data-testid="options-refresh-button"]');
    await refreshButton.click();
    
    // Wait for refresh to complete
    await page.waitForTimeout(1000);
  });

  test('should test technical indicators integration', async ({ page }) => {
    // Navigate to technical analysis page/section
    await page.locator('text=Technical Analysis').click();
    
    // Add SMA indicator widget
    const addWidgetButton = page.locator('[data-testid="add-widget-button"]');
    await addWidgetButton.click();
    await page.locator('[data-testid="widget-option-sma-indicator"]').click();
    await page.locator('text=Add Widget').click();
    
    // Check if SMA widget loaded
    await expect(page.locator('[data-testid="sma-widget"]')).toBeVisible();
    
    // Test indicator settings
    const smaWidget = page.locator('[data-testid="sma-widget"]');
    await smaWidget.hover();
    
    const settingsButton = page.locator('[data-testid="widget-settings-button"]').last();
    await settingsButton.click();
    
    // Change time period
    const timePeriodInput = page.locator('[data-testid="time-period-input"]');
    await timePeriodInput.fill('50');
    
    // Save settings
    await page.locator('text=Save Settings').click();
    
    // Verify widget updated
    await expect(page.locator('text=SMA (50)')).toBeVisible();
  });

  test('should test multi-provider failover', async ({ page }) => {
    // Simulate provider failure by intercepting API calls
    await page.route('**/api/v1/equity/price/quote*provider=alpha_vantage*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Provider unavailable' })
      });
    });
    
    // Add a quote widget with Alpha Vantage provider
    const tickerWidget = page.locator('[data-testid="ticker-info-widget"]');
    await tickerWidget.hover();
    
    const settingsButton = page.locator('[data-testid="widget-settings-button"]').first();
    await settingsButton.click();
    
    // Select Alpha Vantage provider (which will fail)
    const providerDropdown = page.locator('[data-testid="provider-select"]');
    await providerDropdown.click();
    await page.locator('text=Alpha Vantage').click();
    await page.locator('text=Save Settings').click();
    
    // Wait for failover to occur
    await page.waitForTimeout(3000);
    
    // Verify widget still shows data (from fallback provider)
    await expect(page.locator('[data-testid="ticker-info-widget"]')).toContainText('$');
  });

  test('should test responsive design on different screen sizes', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if dashboard adapts to mobile
    await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
    
    // Verify widgets stack properly
    const widgets = page.locator('[data-testid*="widget"]');
    const count = await widgets.count();
    expect(count).toBeGreaterThan(0);
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
  });

  test('should test data refresh across widgets', async ({ page }) => {
    // Get initial data from a widget
    const priceWidget = page.locator('[data-testid="price-performance-widget"]');
    const initialPrice = await priceWidget.locator('[data-testid="current-price"]').textContent();
    
    // Trigger global refresh
    const refreshButton = page.locator('[data-testid="global-refresh-button"]');
    await refreshButton.click();
    
    // Wait for refresh to complete
    await page.waitForTimeout(2000);
    
    // Verify widgets updated (price might be same, but timestamp should change)
    const updatedWidget = page.locator('[data-testid="price-performance-widget"]');
    await expect(updatedWidget).toBeVisible();
  });

  test('should test error handling and user feedback', async ({ page }) => {
    // Test with invalid ticker
    const tickerInput = page.locator('[data-testid="ticker-input"]');
    await tickerInput.fill('INVALIDTICKER');
    await tickerInput.press('Enter');
    
    // Wait for error state
    await page.waitForTimeout(2000);
    
    // Check for error messages
    await expect(page.locator('text=No data available')).toBeVisible();
    
    // Test network error scenario
    await page.route('**/api/v1/equity/**', route => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Service temporarily unavailable' })
      });
    });
    
    // Trigger a refresh
    await page.locator('[data-testid="global-refresh-button"]').click();
    
    // Check for network error handling
    await expect(page.locator('text=Service temporarily unavailable')).toBeVisible();
  });

  test('should test performance with multiple widgets', async ({ page }) => {
    // Add multiple widgets to test performance
    const widgetTypes = [
      'options-flow',
      'balance-sheet',
      'income-statement',
      'cash-flow-statement',
      'insider-trading'
    ];
    
    for (const widgetType of widgetTypes) {
      const addWidgetButton = page.locator('[data-testid="add-widget-button"]');
      await addWidgetButton.click();
      await page.locator(`[data-testid="widget-option-${widgetType}"]`).click();
      await page.locator('text=Add Widget').click();
      
      // Wait for widget to load
      await page.waitForTimeout(500);
    }
    
    // Measure page load performance
    const startTime = Date.now();
    await page.reload();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Ensure page loads within reasonable time (5 seconds)
    expect(loadTime).toBeLessThan(5000);
    
    // Verify all widgets are still functional
    for (const widgetType of widgetTypes) {
      await expect(page.locator(`[data-testid="${widgetType}-widget"]`)).toBeVisible();
    }
  });
});