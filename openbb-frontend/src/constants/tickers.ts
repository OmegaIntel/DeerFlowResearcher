export const TICKER_OPTIONS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'ADBE', name: 'Adobe Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'BAC', name: 'Bank of America Corp.' },
  { symbol: 'DIS', name: 'The Walt Disney Company' },
  { symbol: 'GOOG', name: 'Alphabet Inc.' },
  { symbol: 'HD', name: 'The Home Depot Inc.' },
  { symbol: 'JNJ', name: 'Johnson & Johnson' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  { symbol: 'MA', name: 'Mastercard Inc.' }
] as const;

export type TickerSymbol = typeof TICKER_OPTIONS[number]['symbol'];