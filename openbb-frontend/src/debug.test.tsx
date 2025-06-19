import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('Debug Test', () => {
  it('should render dashboard with widgets', async () => {
    render(<App />);

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByText('Dashboard Barnes Deal')).toBeInTheDocument();
    });

    // Debug: Log all text content
    console.log('=== All text content ===');
    console.log(document.body.textContent);
    
    // Debug: Log all elements with data-testid
    console.log('=== Elements with data-testid ===');
    const testIdElements = document.querySelectorAll('[data-testid]');
    testIdElements.forEach(el => {
      console.log(`${el.getAttribute('data-testid')}: ${el.textContent?.substring(0, 100)}`);
    });

    // Check if main content is rendered
    const mainContent = document.querySelector('main');
    console.log('=== Main content found ===', !!mainContent);
    if (mainContent) {
      console.log('Main content HTML:', mainContent.innerHTML.substring(0, 500));
    }
  });
});