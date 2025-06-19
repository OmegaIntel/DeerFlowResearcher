import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WidgetProvider, useWidgets } from './WidgetContext';

describe('WidgetContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <WidgetProvider>{children}</WidgetProvider>
  );

  it('should add widgets with dashboard ID', () => {
    const { result } = renderHook(() => useWidgets(), { wrapper });

    const widgetTypes = ['ticker-info', 'company-profile'];
    const pageId = 'overview';
    const dashboardId = 'test-dashboard-123';

    act(() => {
      result.current.addWidgets(widgetTypes, pageId, dashboardId);
    });

    // Find the newly added widgets (they'll have generated IDs)
    const newWidgets = result.current.widgets.filter(
      w => w.dashboardId === dashboardId && w.pageId === pageId
    );

    expect(newWidgets).toHaveLength(2);
    expect(newWidgets[0]).toMatchObject({
      type: 'ticker-info',
      pageId: 'overview',
      dashboardId: 'test-dashboard-123',
    });
    expect(newWidgets[1]).toMatchObject({
      type: 'company-profile',
      pageId: 'overview',
      dashboardId: 'test-dashboard-123',
    });

    // Verify IDs are unique
    expect(newWidgets[0].id).not.toBe(newWidgets[1].id);
  });

  it('should filter widgets by dashboard ID', () => {
    const { result } = renderHook(() => useWidgets(), { wrapper });

    const initialWidgetCount = result.current.widgets.length;

    // Add widgets to different dashboards
    act(() => {
      result.current.addWidgets(['price-chart'], 'overview', 'dashboard-1');
    });

    act(() => {
      result.current.addWidgets(['key-metrics'], 'overview', 'dashboard-2');
    });

    // Verify widgets were added
    expect(result.current.widgets.length).toBe(initialWidgetCount + 2);

    // Filter widgets for dashboard-1 (exclude default widgets)
    const dashboard1Widgets = result.current.widgets.filter(
      w => w.dashboardId === 'dashboard-1' && w.type === 'price-chart'
    );

    // Filter widgets for dashboard-2 (exclude default widgets)
    const dashboard2Widgets = result.current.widgets.filter(
      w => w.dashboardId === 'dashboard-2' && w.type === 'key-metrics'
    );

    expect(dashboard1Widgets).toHaveLength(1);
    expect(dashboard1Widgets[0].type).toBe('price-chart');

    expect(dashboard2Widgets).toHaveLength(1);
    expect(dashboard2Widgets[0].type).toBe('key-metrics');
  });

  it('should remove widget regardless of dashboard ID', () => {
    const { result } = renderHook(() => useWidgets(), { wrapper });

    // Add a widget
    act(() => {
      result.current.addWidgets(['test-widget'], 'overview', 'dashboard-test');
    });

    // Find the added widget
    const addedWidget = result.current.widgets.find(
      w => w.type === 'test-widget' && w.dashboardId === 'dashboard-test'
    );

    expect(addedWidget).toBeDefined();

    // Remove the widget
    act(() => {
      result.current.removeWidget(addedWidget!.id);
    });

    // Verify widget is removed
    const removedWidget = result.current.widgets.find(
      w => w.id === addedWidget!.id
    );

    expect(removedWidget).toBeUndefined();
  });

  it('should have default widgets with dashboard IDs', () => {
    const { result } = renderHook(() => useWidgets(), { wrapper });

    // Check that default widgets have dashboard IDs
    const defaultWidgets = result.current.widgets.filter(
      w => w.id.startsWith('default-')
    );

    expect(defaultWidgets.length).toBeGreaterThan(0);
    defaultWidgets.forEach(widget => {
      expect(widget.dashboardId).toBe('barnes-deal');
    });

    // Check template widgets
    const templateWidgets = result.current.widgets.filter(
      w => w.id.startsWith('template-')
    );

    expect(templateWidgets.length).toBeGreaterThan(0);
    templateWidgets.forEach(widget => {
      expect(widget.dashboardId).toBe('equity-analyst-template');
    });
  });
});