from typing import Optional, Dict, Any, List
from datetime import date, datetime, timedelta
import random
import json

class MockDataService:
    """Mock service that returns sample financial data for development/testing"""
    
    def __init__(self):
        self.mock_data = self._initialize_mock_data()
    
    def _initialize_mock_data(self):
        """Initialize mock data for different tickers"""
        return {
            "AAPL": {
                "name": "Apple Inc.",
                "industry": "Technology",
                "sector": "Consumer Electronics",
                "exchange": "NASDAQ",
                "marketCap": 3000000000000,
                "employees": 164000,
                "website": "https://www.apple.com",
                "description": "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide."
            },
            "GOOGL": {
                "name": "Alphabet Inc.",
                "industry": "Technology",
                "sector": "Internet Services",
                "exchange": "NASDAQ",
                "marketCap": 1700000000000,
                "employees": 190000,
                "website": "https://www.alphabet.com",
                "description": "Alphabet Inc. provides various products and platforms in the United States and internationally."
            },
            "MSFT": {
                "name": "Microsoft Corporation",
                "industry": "Technology",
                "sector": "Software",
                "exchange": "NASDAQ",
                "marketCap": 2800000000000,
                "employees": 221000,
                "website": "https://www.microsoft.com",
                "description": "Microsoft Corporation develops and supports software, services, devices and solutions worldwide."
            }
        }
    
    async def get_price_historical(
        self, 
        symbol: str, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        interval: str = "1d"
    ) -> Dict[str, Any]:
        """Generate mock historical price data"""
        if not end_date:
            end_date = date.today()
        if not start_date:
            start_date = end_date - timedelta(days=30)
        
        # Generate mock price data
        data = []
        current_date = start_date
        base_price = 150.0 + random.uniform(-50, 50)
        
        while current_date <= end_date:
            if current_date.weekday() < 5:  # Only weekdays
                price_change = random.uniform(-2, 2)
                open_price = base_price + random.uniform(-1, 1)
                close_price = open_price + price_change
                high_price = max(open_price, close_price) + random.uniform(0, 1)
                low_price = min(open_price, close_price) - random.uniform(0, 1)
                
                data.append({
                    "date": current_date.isoformat(),
                    "open": round(open_price, 2),
                    "high": round(high_price, 2),
                    "low": round(low_price, 2),
                    "close": round(close_price, 2),
                    "volume": random.randint(10000000, 100000000)
                })
                base_price = close_price
            
            current_date += timedelta(days=1)
        
        return {
            "symbol": symbol,
            "data": data,
            "count": len(data)
        }
    
    async def get_fundamental_overview(self, symbol: str) -> Dict[str, Any]:
        """Get mock fundamental overview"""
        base_data = self.mock_data.get(symbol, self.mock_data["AAPL"])
        return {
            **base_data,
            "symbol": symbol,
            "pe": round(random.uniform(15, 35), 2),
            "eps": round(random.uniform(3, 10), 2),
            "dividendYield": round(random.uniform(0, 3), 2),
            "beta": round(random.uniform(0.8, 1.5), 2)
        }
    
    async def get_company_news(
        self,
        symbol: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 50,
        channels: str = "all"
    ) -> List[Dict[str, Any]]:
        """Generate mock news items"""
        news_templates = [
            f"{symbol} Reports Strong Q4 Earnings, Beats Expectations",
            f"Analysts Upgrade {symbol} Following Product Launch",
            f"{symbol} Announces New Partnership Deal",
            f"Market Watch: {symbol} Shares Rise on Positive Guidance",
            f"{symbol} CEO Discusses Future Growth Strategy",
            f"Breaking: {symbol} Unveils Revolutionary New Technology",
            f"{symbol} Expands Operations in Asian Markets",
            f"Institutional Investors Increase Stakes in {symbol}"
        ]
        
        news = []
        for i in range(min(limit, 10)):
            published_date = datetime.now() - timedelta(days=random.randint(0, 30))
            news.append({
                "title": random.choice(news_templates),
                "url": f"https://example.com/news/{symbol.lower()}-{i}",
                "published": published_date.isoformat(),
                "source": random.choice(["Reuters", "Bloomberg", "CNBC", "WSJ"]),
                "summary": f"Latest news about {symbol} stock performance and company updates."
            })
        
        return news
    
    async def get_share_statistics(self, symbol: str) -> Dict[str, Any]:
        """Get mock share statistics"""
        return {
            "symbol": symbol,
            "sharesOutstanding": random.randint(1000000000, 20000000000),
            "sharesFloat": random.randint(900000000, 19000000000),
            "sharesShort": random.randint(10000000, 100000000),
            "shortRatio": round(random.uniform(1, 5), 2),
            "shortPercentOfFloat": round(random.uniform(0.5, 5), 2),
            "institutionalOwnership": round(random.uniform(60, 90), 2),
            "freeFloat": round(random.uniform(0.85, 0.98), 2)
        }
    
    async def get_management_team(self, symbol: str) -> List[Dict[str, Any]]:
        """Get mock management team"""
        positions = [
            ("Chief Executive Officer", 5000000),
            ("Chief Financial Officer", 3000000),
            ("Chief Technology Officer", 2500000),
            ("Chief Operating Officer", 2800000),
            ("President", 3500000)
        ]
        
        names = [
            "John Smith", "Jane Doe", "Michael Johnson", 
            "Sarah Williams", "Robert Brown"
        ]
        
        return [
            {
                "name": names[i],
                "position": position,
                "title": position,
                "totalPay": pay + random.randint(-500000, 1000000),
                "age": random.randint(45, 65),
                "tenure": random.randint(2, 15)
            }
            for i, (position, pay) in enumerate(positions)
        ]
    
    async def get_revenue_geography(
        self, 
        symbol: str, 
        period: str = "annual"
    ) -> List[Dict[str, Any]]:
        """Get mock revenue by geography"""
        regions = ["Americas", "Europe", "China", "Japan", "Rest of Asia Pacific"]
        data = []
        
        for year in range(2019, 2024):
            total_revenue = random.randint(200000000000, 400000000000)
            remaining = total_revenue
            
            for i, region in enumerate(regions):
                if i == len(regions) - 1:
                    revenue = remaining
                else:
                    revenue = int(remaining * random.uniform(0.15, 0.35))
                    remaining -= revenue
                
                data.append({
                    "period": f"{year}-12-31",
                    "geography": region,
                    "revenue": revenue
                })
        
        return data
    
    async def get_revenue_segment(
        self, 
        symbol: str, 
        period: str = "annual"
    ) -> List[Dict[str, Any]]:
        """Get mock revenue by business segment"""
        segments = ["Products", "Services", "Wearables", "Other"]
        data = []
        
        for year in range(2019, 2024):
            total_revenue = random.randint(200000000000, 400000000000)
            remaining = total_revenue
            
            for i, segment in enumerate(segments):
                if i == len(segments) - 1:
                    revenue = remaining
                else:
                    revenue = int(remaining * random.uniform(0.15, 0.45))
                    remaining -= revenue
                
                data.append({
                    "period": f"{year}-12-31",
                    "segment": segment,
                    "revenue": revenue
                })
        
        return data
    
    async def get_valuation_metrics(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 100,
        with_ttm: bool = True
    ) -> List[Dict[str, Any]]:
        """Get mock valuation metrics"""
        data = []
        
        is_quarterly = period.lower() in ["quarter", "quarterly", "q"]
        
        if is_quarterly:
            # Generate quarterly data
            for i in range(min(limit, 20)):  # Up to 20 quarters (5 years)
                base_year = 2024
                quarter_offset = i
                year = base_year - (quarter_offset // 4)
                quarter = 4 - (quarter_offset % 4)
                
                # Quarter end dates
                quarter_dates = {
                    1: f"{year}-03-31",
                    2: f"{year}-06-30",
                    3: f"{year}-09-30",
                    4: f"{year}-12-31"
                }
                
                date = quarter_dates[quarter]
                
                data.append({
                    "period": f"Q{quarter}",
                    "date": date,
                    "peRatio": round(random.uniform(15, 35), 2),
                    "priceToSalesRatio": round(random.uniform(2, 8), 2),
                    "priceToBookRatio": round(random.uniform(1, 15), 2),
                    "enterpriseValueToSales": round(random.uniform(2, 10), 2),
                    "evToEbitda": round(random.uniform(10, 30), 2),
                    "dividendYield": round(random.uniform(0.5, 4), 2)
                })
        else:
            # Annual data
            for year in range(2024 - min(limit, 30), 2024):
                data.append({
                    "period": "FY",
                    "date": f"{year}-12-31",
                    "peRatio": round(random.uniform(15, 35), 2),
                    "priceToSalesRatio": round(random.uniform(2, 8), 2),
                    "priceToBookRatio": round(random.uniform(1, 15), 2),
                    "enterpriseValueToSales": round(random.uniform(2, 10), 2),
                    "evToEbitda": round(random.uniform(10, 30), 2),
                    "dividendYield": round(random.uniform(0.5, 4), 2)
                })
        
        if with_ttm:
            data.append({
                "period": "TTM",
                "date": datetime.now().date().isoformat(),
                "peRatio": round(random.uniform(15, 35), 2),
                "priceToSalesRatio": round(random.uniform(2, 8), 2),
                "priceToBookRatio": round(random.uniform(1, 15), 2),
                "enterpriseValueToSales": round(random.uniform(2, 10), 2),
                "evToEbitda": round(random.uniform(10, 30), 2),
                "dividendYield": round(random.uniform(0.5, 4), 2)
            })
        
        return data
    
    async def get_company_filings(self, symbol: str) -> List[Dict[str, Any]]:
        """Get mock company filings"""
        filing_types = ["10-K", "10-Q", "8-K", "DEF 14A"]
        filings = []
        
        for i in range(10):
            filing_date = datetime.now() - timedelta(days=random.randint(1, 365))
            filings.append({
                "date": filing_date.date().isoformat(),
                "type": random.choice(filing_types),
                "title": f"{random.choice(filing_types)} - {filing_date.strftime('%B %Y')}",
                "url": f"https://example.com/filing/{symbol}-{i}"
            })
        
        return sorted(filings, key=lambda x: x["date"], reverse=True)
    
    async def get_price_target(self, symbol: str) -> Dict[str, Any]:
        """Get mock analyst price targets"""
        current_price = 150 + random.uniform(-50, 50)
        
        return {
            "symbol": symbol,
            "currentPrice": round(current_price, 2),
            "targetMean": round(current_price * random.uniform(0.9, 1.2), 2),
            "targetMedian": round(current_price * random.uniform(0.95, 1.15), 2),
            "targetHigh": round(current_price * random.uniform(1.1, 1.4), 2),
            "targetLow": round(current_price * random.uniform(0.8, 0.95), 2),
            "numberOfAnalysts": random.randint(10, 30)
        }
    
    async def get_etf_info(self, symbol: str) -> Dict[str, Any]:
        """Get mock ETF information"""
        return {
            "symbol": symbol,
            "name": f"{symbol} ETF",
            "assetClass": "Equity",
            "totalAssets": random.randint(1000000000, 50000000000),
            "ytdReturn": round(random.uniform(-10, 30), 2),
            "expenseRatio": round(random.uniform(0.03, 0.75), 2),
            "holdings": random.randint(50, 500)
        }
    
    async def get_income_statement(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get mock income statement data"""
        data = []
        
        is_quarterly = period.lower() in ["quarter", "quarterly", "q"]
        
        for i in range(limit):
            if is_quarterly:
                # Generate quarterly data
                base_year = 2024
                quarter_offset = i
                year = base_year - (quarter_offset // 4)
                quarter = 4 - (quarter_offset % 4)
                
                # Quarter end dates
                quarter_dates = {
                    1: f"{year}-03-31",
                    2: f"{year}-06-30", 
                    3: f"{year}-09-30",
                    4: f"{year}-12-31"
                }
                
                date = quarter_dates[quarter]
                period_str = f"Q{quarter}"
                
                # Quarterly revenue (roughly 1/4 of annual)
                base_revenue = 75000000000 if symbol == "AAPL" else random.randint(12500000000, 100000000000)
                growth_factor = 1 + random.uniform(-0.05, 0.08)
                revenue = int(base_revenue * (growth_factor ** (i / 4)))
            else:
                # Annual data
                year = 2024 - i
                date = f"{year}-12-31"
                period_str = "FY"
                
                base_revenue = 300000000000 if symbol == "AAPL" else random.randint(50000000000, 400000000000)
                growth_factor = 1 + random.uniform(-0.1, 0.15)
                revenue = int(base_revenue * (growth_factor ** i))
            
            # Add SEC filing links
            if is_quarterly:
                cik = "0000320193" if symbol == "AAPL" else "0000796343" if symbol == "ADBE" else "0000789019"
                link = f"https://www.sec.gov/Archives/edgar/data/{cik}/{year}000{quarter}Q/form10q.htm"
                finalLink = link
            else:
                cik = "0000320193" if symbol == "AAPL" else "0000796343" if symbol == "ADBE" else "0000789019"
                link = f"https://www.sec.gov/Archives/edgar/data/{cik}/{year}000K/form10k.htm"
                finalLink = link
            
            data.append({
                "date": date,
                "symbol": symbol,
                "reportedCurrency": "USD",
                "cik": cik,
                "fillingDate": date,
                "acceptedDate": f"{date} 06:00:00",
                "calendarYear": year if not is_quarterly else str(year),
                "period": period_str,
                "revenue": revenue,
                "link": link,
                "finalLink": finalLink,
                "costOfRevenue": int(revenue * random.uniform(0.5, 0.7)),
                "grossProfit": int(revenue * random.uniform(0.3, 0.5)),
                "grossProfitRatio": random.uniform(0.3, 0.5),
                "researchAndDevelopmentExpenses": int(revenue * random.uniform(0.05, 0.15)),
                "sellingGeneralAndAdministrativeExpenses": int(revenue * random.uniform(0.05, 0.12)),
                "operatingExpenses": int(revenue * random.uniform(0.15, 0.25)),
                "costAndExpenses": int(revenue * random.uniform(0.6, 0.8)),
                "depreciationAndAmortization": int(revenue * random.uniform(0.02, 0.05)),
                "ebitda": int(revenue * random.uniform(0.25, 0.4)),
                "ebitdaratio": random.uniform(0.25, 0.4),
                "operatingIncome": int(revenue * random.uniform(0.2, 0.35)),
                "operatingIncomeRatio": random.uniform(0.2, 0.35),
                "totalOtherIncomeExpensesNet": int(revenue * random.uniform(-0.01, 0.02)),
                "incomeBeforeTax": int(revenue * random.uniform(0.2, 0.35)),
                "incomeBeforeTaxRatio": random.uniform(0.2, 0.35),
                "incomeTaxExpense": int(revenue * random.uniform(0.03, 0.08)),
                "netIncome": int(revenue * random.uniform(0.15, 0.3)),
                "netIncomeRatio": random.uniform(0.15, 0.3),
                "eps": round(random.uniform(4, 8), 2),
                "epsdiluted": round(random.uniform(4, 8), 2),
            })
        
        return data
    
    async def get_balance_sheet(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get mock balance sheet data"""
        data = []
        
        is_quarterly = period.lower() in ["quarter", "quarterly", "q"]
        
        for i in range(limit):
            if is_quarterly:
                # Generate quarterly data
                base_year = 2024
                quarter_offset = i
                year = base_year - (quarter_offset // 4)
                quarter = 4 - (quarter_offset % 4)
                
                quarter_dates = {
                    1: f"{year}-03-31",
                    2: f"{year}-06-30", 
                    3: f"{year}-09-30",
                    4: f"{year}-12-31"
                }
                
                date = quarter_dates[quarter]
                period_str = f"Q{quarter}"
            else:
                # Annual data
                year = 2024 - i
                date = f"{year}-12-31"
                period_str = "FY"
            
            base_assets = 350000000000 if symbol == "AAPL" else random.randint(50000000000, 500000000000)
            total_assets = int(base_assets * (1.05 ** (limit - i)))
            
            # Add SEC filing links
            if is_quarterly:
                cik = "0000320193" if symbol == "AAPL" else "0000796343" if symbol == "ADBE" else "0000789019"
                link = f"https://www.sec.gov/Archives/edgar/data/{cik}/{year}000{quarter}Q/form10q.htm"
                finalLink = link
            else:
                cik = "0000320193" if symbol == "AAPL" else "0000796343" if symbol == "ADBE" else "0000789019"
                link = f"https://www.sec.gov/Archives/edgar/data/{cik}/{year}000K/form10k.htm"
                finalLink = link
            
            data.append({
                "date": date,
                "symbol": symbol,
                "reportedCurrency": "USD",
                "cik": cik,
                "fillingDate": date,
                "acceptedDate": f"{date} 06:00:00",
                "calendarYear": year if not is_quarterly else str(year),
                "period": period_str,
                "link": link,
                "finalLink": finalLink,
                "totalAssets": total_assets,
                "totalCurrentAssets": int(total_assets * random.uniform(0.3, 0.5)),
                "cashAndCashEquivalents": int(total_assets * random.uniform(0.05, 0.15)),
                "shortTermInvestments": int(total_assets * random.uniform(0.05, 0.12)),
                "totalLiabilities": int(total_assets * random.uniform(0.6, 0.85)),
                "totalCurrentLiabilities": int(total_assets * random.uniform(0.2, 0.4)),
                "totalStockholdersEquity": int(total_assets * random.uniform(0.15, 0.4)),
            })
        
        return data
    
    async def get_cash_flow_statement(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get mock cash flow statement data"""
        data = []
        
        is_quarterly = period.lower() in ["quarter", "quarterly", "q"]
        
        for i in range(limit):
            if is_quarterly:
                # Generate quarterly data
                base_year = 2024
                quarter_offset = i
                year = base_year - (quarter_offset // 4)
                quarter = 4 - (quarter_offset % 4)
                
                quarter_dates = {
                    1: f"{year}-03-31",
                    2: f"{year}-06-30", 
                    3: f"{year}-09-30",
                    4: f"{year}-12-31"
                }
                
                date = quarter_dates[quarter]
                period_str = f"Q{quarter}"
                
                # Quarterly cash flow (roughly 1/4 of annual)
                base_ocf = 25000000000 if symbol == "AAPL" else random.randint(2500000000, 37500000000)
            else:
                # Annual data
                year = 2024 - i
                date = f"{year}-12-31"
                period_str = "FY"
                
                base_ocf = 100000000000 if symbol == "AAPL" else random.randint(10000000000, 150000000000)
            
            ocf = int(base_ocf * (1.03 ** (limit - i)))
            
            # Add SEC filing links
            if is_quarterly:
                cik = "0000320193" if symbol == "AAPL" else "0000796343" if symbol == "ADBE" else "0000789019"
                link = f"https://www.sec.gov/Archives/edgar/data/{cik}/{year}000{quarter}Q/form10q.htm"
                finalLink = link
            else:
                cik = "0000320193" if symbol == "AAPL" else "0000796343" if symbol == "ADBE" else "0000789019"
                link = f"https://www.sec.gov/Archives/edgar/data/{cik}/{year}000K/form10k.htm"
                finalLink = link
            
            data.append({
                "date": date,
                "symbol": symbol,
                "reportedCurrency": "USD",
                "cik": cik,
                "fillingDate": date,
                "acceptedDate": f"{date} 06:00:00",
                "calendarYear": year if not is_quarterly else str(year),
                "period": period_str,
                "link": link,
                "finalLink": finalLink,
                "operatingCashFlow": ocf,
                "netCashUsedForInvestingActivites": int(ocf * random.uniform(-0.5, -0.1)),
                "netCashUsedProvidedByFinancingActivities": int(ocf * random.uniform(-1.2, -0.5)),
                "freeCashFlow": int(ocf * random.uniform(0.8, 0.95)),
                "netChangeInCash": int(ocf * random.uniform(-0.1, 0.1)),
            })
        
        return data
    
    async def get_analyst_ratings(self, symbol: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get mock analyst ratings data"""
        analyst_names = [
            "Ebrahim Poonawala", "Mike Mayo", "John McDonald", "Steven Alexopoulos",
            "Scott Siefers", "Gerard Cassidy", "Betsy Graseck", "Erika Najarian",
            "Glenn Schorr", "Jason Goldberg", "David Konrad"
        ]
        
        firm_names = [
            "B of A Securities", "Wells Fargo", "Truist Securities", "TD Securities",
            "Piper Sandler", "RBC Capital", "Morgan Stanley", "Baird", "UBS",
            "Evercore ISI Group", "Barclays", "Keefe, Bruyette & Woods"
        ]
        
        ratings = ["Buy", "Overweight", "Hold", "Neutral", "Equal-Weight", "Market Perform", "Outperform"]
        
        data = []
        base_price = 250 + random.randint(-50, 50)
        
        for i in range(min(limit, 20)):
            days_ago = random.randint(1, 90)
            date = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')
            
            analyst = random.choice(analyst_names)
            firm = random.choice(firm_names)
            
            # Generate price targets
            adjusted_pt = base_price + random.randint(-30, 50)
            previous_pt = adjusted_pt - random.randint(-10, 20)
            
            # Calculate percentage
            percentage = random.randint(58, 73)
            
            # Generate ratings
            current_rating = random.choice(ratings)
            previous_rating = current_rating if random.random() > 0.2 else random.choice(ratings)
            
            data.append({
                'date': date,
                'analyst_name': analyst,
                'firm_name': firm,
                'adjusted_price_target': adjusted_pt,
                'adjusted_previous_price_target': previous_pt,
                'rating_change': 'Maintains',
                'current_rating': current_rating,
                'previous_rating': previous_rating,
                'percentage': percentage,
                'provider': 'mock'
            })
        
        # Sort by date descending
        return sorted(data, key=lambda x: x['date'], reverse=True)
    
    async def get_earnings_transcript(self, symbol: str, year: int, quarter: int) -> Dict[str, Any]:
        """Get mock earnings call transcript"""
        
        # Use symbol, year, quarter to create consistent but different random values
        random.seed(hash(f"{symbol}_{year}_{quarter}") % 2**32)
        
        # Company-specific data
        company_data = {
            "AAPL": {
                "ceo": "Tim Cook",
                "cfo": "Luca Maestri", 
                "revenue": random.randint(90, 120),
                "segments": {
                    "iPhone": random.randint(45, 65),
                    "Mac": random.randint(7, 11),
                    "iPad": random.randint(5, 9),
                    "Wearables": random.randint(8, 12),
                    "Services": random.randint(20, 25)
                }
            },
            "GOOGL": {
                "ceo": "Sundar Pichai",
                "cfo": "Ruth Porat",
                "revenue": random.randint(70, 90),
                "segments": {
                    "Google Search": random.randint(35, 45),
                    "YouTube Ads": random.randint(6, 9),
                    "Google Cloud": random.randint(8, 12),
                    "Other Bets": random.randint(1, 3)
                }
            },
            "MSFT": {
                "ceo": "Satya Nadella", 
                "cfo": "Amy Hood",
                "revenue": random.randint(50, 70),
                "segments": {
                    "Azure": random.randint(20, 28),
                    "Office 365": random.randint(15, 20),
                    "Windows": random.randint(5, 8),
                    "Gaming": random.randint(3, 6)
                }
            },
            "TSLA": {
                "ceo": "Elon Musk",
                "cfo": "Vaibhav Taneja",
                "revenue": random.randint(20, 30),
                "segments": {
                    "Automotive": random.randint(18, 26),
                    "Energy": random.randint(1, 3),
                    "Services": random.randint(1, 2)
                }
            }
        }
        
        # Get company info or use generic
        if symbol in company_data:
            company = company_data[symbol]
        else:
            company = {
                "ceo": "John Smith",
                "cfo": "Jane Doe", 
                "revenue": random.randint(10, 30),
                "segments": {
                    "Product Sales": random.randint(8, 20),
                    "Services": random.randint(2, 8)
                }
            }
        
        # Mock transcript content similar to the screenshot
        mock_transcript = f"""Operator:
Good afternoon. My name is Regina and I will be your conference operator today. At this time, I would like to welcome everyone to {symbol}'s Q{quarter} {year} Earnings Call. All lines have been placed on mute to prevent any background noise. After the speakers' remarks, there will be a question-and-answer session. [Operator Instructions] Thank you. Sarah Johnson, you may begin your conference.

Sarah Johnson:
Thank you. Good afternoon, everyone, and welcome to {symbol}'s conference call for Q{quarter} fiscal {year}. With me today from {symbol} are {company['ceo']}, Chief Executive Officer; and {company['cfo']}, Chief Financial Officer. I'd like to remind you that our call is being webcast live on {symbol}'s Investor Relations website. The webcast will be available for replay until the conference call to discuss our Q{quarter+1 if quarter < 4 else 1} {year if quarter < 4 else year+1} financial results. The content of today's call is {symbol}'s property. It can't be reproduced or transcribed without our prior written consent. During this call, we may make forward-looking statements based on current expectations. These are subject to a number of significant risks and uncertainties and our actual results may differ materially. For a discussion of factors that could affect our future financial results and business, please refer to the disclosure in today's earnings release, our most recent Forms 10-K and 10-Q and the reports that we may file on Form 8-K with the Securities and Exchange Commission. All our statements are made as of today, {datetime.now().strftime('%B %d, %Y')}, based on information currently available to us. Except as required by law, we assume no obligation to update any such statements. During this call, we will discuss non-GAAP financial measures. You can find a reconciliation of these non-GAAP financial measures to GAAP financial measures in our CFO commentary, which is posted on our website. With that let me turn the call over to {company['cfo'].split()[0]}.

{company['cfo']}:
Thanks, Sarah. Q{quarter} was {random.choice(['another strong', 'a solid', 'an outstanding', 'a record'])} quarter. Revenue of ${company['revenue']} billion was up {random.randint(8, 18)}% sequentially and up {random.randint(12, 25)}% year-over-year, {random.choice(['ahead of', 'in line with', 'slightly above'])} our outlook of ${company['revenue'] - random.randint(2, 8)} billion. Our strong revenue was driven by {random.choice(['robust demand', 'continued growth', 'strong performance'])} across {random.choice(['all our key products', 'our core business segments', 'multiple product categories'])}.""" + "".join([f" {segment} revenue was ${revenue} billion, {'up' if random.random() > 0.2 else 'down'} {random.randint(5, 20)}% {random.choice(['sequentially', 'year-over-year'])}." for segment, revenue in company['segments'].items()]) + f"""

Our gross margin was {random.randint(35, 50)}.{random.randint(0, 9)}%, {'up' if random.random() > 0.4 else 'down'} from {random.randint(30, 45)}.{random.randint(0, 9)}% in the previous quarter. Operating expenses were ${random.randint(8, 15)} billion, up {random.randint(3, 10)}% sequentially. We returned ${random.randint(3, 8)} billion to shareholders through dividends and share repurchases.

For Q{quarter+1 if quarter < 4 else 1}, we expect revenue to be ${random.randint(int(company['revenue']*0.9), int(company['revenue']*1.1))} billion, plus or minus 2%. With that, let me turn the call over to {company['ceo'].split()[0]}.

{company['ceo']}:
Thank you, {company['cfo'].split()[0]}, and good afternoon, everyone. Q{quarter} was {random.choice(['an exceptional', 'a transformative', 'a strong', 'another solid'])} quarter with {random.choice(['record revenue', 'strong performance', 'continued momentum'])} across our business. {random.choice(['We continue to see strong demand', 'Our strategy is working', 'We remain focused on execution'])} as we {random.choice(['invest in innovation', 'expand our market reach', 'drive operational excellence'])}.

{random.choice(['Looking ahead', 'As we move forward', 'In the coming quarters'])}, we remain {random.choice(['focused on', 'committed to', 'dedicated to'])} {random.choice(['delivering value to our customers', 'executing our strategy', 'driving sustainable growth'])} and {random.choice(['creating long-term value for shareholders', 'maintaining our competitive position', 'investing in our future'])}. {random.choice(['We are excited about the opportunities ahead', 'We remain optimistic about our prospects', 'We look forward to continuing our growth trajectory'])}.

With that, let's open it up for questions."""

        # Generate a realistic date for the earnings call (after quarter end)
        quarter_end_months = {1: 4, 2: 7, 3: 10, 4: 1}  # Earnings typically 1 month after quarter end
        month = quarter_end_months[quarter]
        if quarter == 4:  # Q4 earnings are announced in January of next year
            year += 1
        call_date = f"{year}-{month:02d}-{random.randint(15, 28)} {random.randint(14, 17)}:{random.randint(0, 59):02d}:00"
        
        # Reset random seed to avoid affecting other functions
        random.seed()
        
        return {
            "symbol": symbol,
            "quarter": quarter,
            "year": year,
            "date": call_date,
            "content": mock_transcript,
            "provider": "mock"
        }
    
    async def get_earnings_transcript_dates(self, symbol: str) -> List[Dict[str, Any]]:
        """Get mock earnings transcript dates"""
        dates = []
        current_year = datetime.now().year
        
        # Generate last 3 years of quarterly data
        for year in range(current_year - 2, current_year + 1):
            for quarter in [1, 2, 3, 4]:
                # Skip future quarters for current year
                if year == current_year:
                    current_quarter = (datetime.now().month - 1) // 3 + 1
                    if quarter > current_quarter:
                        continue
                
                call_date = f"{year}-{quarter*3:02d}-{random.randint(20, 28)}"
                dates.append({
                    "symbol": symbol,
                    "year": year,
                    "quarter": quarter,
                    "date": call_date
                })
        
        return sorted(dates, key=lambda x: (x['year'], x['quarter']), reverse=True)