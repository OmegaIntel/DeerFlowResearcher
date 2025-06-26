/**
 * Safe date utilities to prevent "Invalid time value" errors
 */

export const safeDate = (dateInput: any): Date | null => {
  if (!dateInput) {
    console.warn('safeDate: Received null/undefined date input');
    return null;
  }
  
  try {
    // Check if it's already a Date object
    if (dateInput instanceof Date) {
      if (isNaN(dateInput.getTime())) {
        console.warn('safeDate: Invalid Date object', dateInput);
        return null;
      }
      return dateInput;
    }
    
    // Check for specific invalid strings
    if (typeof dateInput === 'string') {
      const trimmed = dateInput.trim();
      if (!trimmed || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'Invalid Date' || trimmed.toLowerCase() === 'invalid date') {
        console.warn('safeDate: Invalid date string', dateInput);
        return null;
      }
    }
    
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      console.warn('safeDate: Invalid date value', dateInput);
      return null;
    }
    return date;
  } catch (error) {
    console.error('safeDate: Error parsing date', dateInput, error);
    return null;
  }
};

export const safeDateString = (dateInput: any, format: 'date' | 'time' | 'datetime' = 'date'): string => {
  const date = safeDate(dateInput);
  if (!date) return 'N/A';
  
  try {
    switch (format) {
      case 'date':
        return date.toLocaleDateString('en-US');
      case 'time':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      case 'datetime':
        return date.toLocaleString('en-US');
      default:
        return date.toLocaleDateString('en-US');
    }
  } catch (error) {
    console.error('safeDateString: Error formatting date', error);
    return 'N/A';
  }
};

export const safeISOString = (dateInput: any): string => {
  const date = safeDate(dateInput);
  if (!date) return '';
  
  try {
    return date.toISOString();
  } catch (error) {
    console.error('safeISOString: Error converting to ISO string', error);
    return '';
  }
};

export const safeDateCalc = (days: number): string => {
  try {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('safeDateCalc: Error calculating date', error);
    return new Date().toISOString().split('T')[0];
  }
};