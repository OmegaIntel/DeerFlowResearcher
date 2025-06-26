"""
Advanced financial analysis tools for the OpenBB Copilot
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from langchain.tools import Tool
from pydantic import BaseModel, Field


class FinancialMetrics:
    """Calculate advanced financial metrics and ratios"""
    
    @staticmethod
    def calculate_growth_rates(data: List[Dict], metric: str, periods: int = 5) -> Dict[str, float]:
        """Calculate CAGR and year-over-year growth rates"""
        if not data or len(data) < 2:
            return {"error": "Insufficient data for growth calculation"}
            
        try:
            # Sort by date
            sorted_data = sorted(data, key=lambda x: x.get('date', ''))
            
            # Extract values
            values = [float(d.get(metric, 0)) for d in sorted_data if d.get(metric)]
            
            if len(values) < 2:
                return {"error": f"Insufficient {metric} data"}
                
            # Calculate YoY growth rates
            yoy_growth = []
            for i in range(1, len(values)):
                if values[i-1] != 0:
                    growth = ((values[i] - values[i-1]) / abs(values[i-1])) * 100
                    yoy_growth.append(growth)
                    
            # Calculate CAGR
            if len(values) >= 2 and values[0] > 0 and values[-1] > 0:
                years = len(values) - 1
                cagr = (pow(values[-1] / values[0], 1/years) - 1) * 100
            else:
                cagr = None
                
            return {
                "cagr": cagr,
                "average_growth": np.mean(yoy_growth) if yoy_growth else None,
                "latest_growth": yoy_growth[-1] if yoy_growth else None,
                "growth_volatility": np.std(yoy_growth) if yoy_growth else None,
                "growth_trend": "increasing" if yoy_growth and yoy_growth[-1] > yoy_growth[0] else "decreasing"
            }
        except Exception as e:
            return {"error": str(e)}
            
    @staticmethod
    def calculate_profitability_metrics(income_data: List[Dict], balance_data: List[Dict]) -> Dict:
        """Calculate advanced profitability metrics"""
        if not income_data or not balance_data:
            return {"error": "Missing financial data"}
            
        try:
            latest_income = income_data[0]
            latest_balance = balance_data[0]
            
            revenue = float(latest_income.get('revenue', 0))
            net_income = float(latest_income.get('netIncome', 0))
            total_assets = float(latest_balance.get('totalAssets', 1))
            total_equity = float(latest_balance.get('totalEquity', 1))
            
            # Basic profitability ratios
            metrics = {
                "net_profit_margin": (net_income / revenue * 100) if revenue > 0 else 0,
                "roa": (net_income / total_assets * 100) if total_assets > 0 else 0,
                "roe": (net_income / total_equity * 100) if total_equity > 0 else 0,
            }
            
            # DuPont Analysis
            if revenue > 0 and total_assets > 0 and total_equity > 0:
                asset_turnover = revenue / total_assets
                equity_multiplier = total_assets / total_equity
                
                metrics.update({
                    "dupont_roe": metrics["net_profit_margin"] / 100 * asset_turnover * equity_multiplier * 100,
                    "asset_turnover": asset_turnover,
                    "equity_multiplier": equity_multiplier
                })
                
            return metrics
        except Exception as e:
            return {"error": str(e)}
            
    @staticmethod
    def calculate_liquidity_metrics(balance_data: Dict) -> Dict:
        """Calculate liquidity and solvency ratios"""
        try:
            current_assets = float(balance_data.get('totalCurrentAssets', 0))
            current_liabilities = float(balance_data.get('totalCurrentLiabilities', 1))
            cash = float(balance_data.get('cashAndCashEquivalents', 0))
            inventory = float(balance_data.get('inventory', 0))
            total_debt = float(balance_data.get('totalDebt', 0))
            total_equity = float(balance_data.get('totalEquity', 1))
            
            return {
                "current_ratio": current_assets / current_liabilities if current_liabilities > 0 else 0,
                "quick_ratio": (current_assets - inventory) / current_liabilities if current_liabilities > 0 else 0,
                "cash_ratio": cash / current_liabilities if current_liabilities > 0 else 0,
                "debt_to_equity": total_debt / total_equity if total_equity > 0 else 0,
                "working_capital": current_assets - current_liabilities,
                "working_capital_ratio": (current_assets - current_liabilities) / current_assets if current_assets > 0 else 0
            }
        except Exception as e:
            return {"error": str(e)}


class TechnicalAnalysisTool:
    """Technical analysis for price data"""
    
    @staticmethod
    def calculate_momentum_indicators(price_data: List[Dict]) -> Dict:
        """Calculate RSI, moving averages, and momentum indicators"""
        if not price_data or len(price_data) < 20:
            return {"error": "Insufficient price data"}
            
        try:
            # Convert to pandas for easier calculation
            df = pd.DataFrame(price_data)
            if 'close' not in df.columns:
                return {"error": "No closing price data"}
                
            close_prices = df['close'].astype(float)
            
            # Simple Moving Averages
            sma_20 = close_prices.rolling(window=20).mean().iloc[-1]
            sma_50 = close_prices.rolling(window=50).mean().iloc[-1] if len(close_prices) >= 50 else None
            sma_200 = close_prices.rolling(window=200).mean().iloc[-1] if len(close_prices) >= 200 else None
            
            # RSI Calculation
            delta = close_prices.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs)).iloc[-1]
            
            # Price momentum
            current_price = close_prices.iloc[-1]
            price_1m_ago = close_prices.iloc[-20] if len(close_prices) >= 20 else None
            price_3m_ago = close_prices.iloc[-60] if len(close_prices) >= 60 else None
            
            return {
                "current_price": current_price,
                "sma_20": sma_20,
                "sma_50": sma_50,
                "sma_200": sma_200,
                "rsi_14": rsi,
                "price_vs_sma20": ((current_price - sma_20) / sma_20 * 100) if sma_20 else None,
                "momentum_1m": ((current_price - price_1m_ago) / price_1m_ago * 100) if price_1m_ago else None,
                "momentum_3m": ((current_price - price_3m_ago) / price_3m_ago * 100) if price_3m_ago else None,
                "trend_signal": "bullish" if current_price > sma_20 else "bearish",
                "rsi_signal": "oversold" if rsi < 30 else "overbought" if rsi > 70 else "neutral"
            }
        except Exception as e:
            return {"error": str(e)}


class ComparativeAnalysisTool:
    """Compare multiple companies or time periods"""
    
    @staticmethod
    def compare_companies(contexts: List[Any], metric_type: str) -> Dict:
        """Compare metrics across multiple companies"""
        comparison = {}
        
        for context in contexts:
            ticker = context.ticker
            
            if metric_type == "profitability":
                if context.widget_type.value == "income_statement":
                    data = context.data
                    if isinstance(data, list) and data:
                        latest = data[0]
                        comparison[ticker] = {
                            "revenue": latest.get('revenue', 0),
                            "gross_margin": (latest.get('grossProfit', 0) / latest.get('revenue', 1) * 100) if latest.get('revenue', 0) > 0 else 0,
                            "operating_margin": (latest.get('operatingIncome', 0) / latest.get('revenue', 1) * 100) if latest.get('revenue', 0) > 0 else 0,
                            "net_margin": (latest.get('netIncome', 0) / latest.get('revenue', 1) * 100) if latest.get('revenue', 0) > 0 else 0,
                        }
                        
            elif metric_type == "valuation":
                if context.widget_type.value == "valuation_multiples":
                    data = context.data
                    if isinstance(data, list) and data:
                        latest = data[0]
                        comparison[ticker] = {
                            "pe_ratio": latest.get('peRatio', 0),
                            "pb_ratio": latest.get('priceToBookRatio', 0),
                            "ev_ebitda": latest.get('evToEbitda', 0),
                            "ps_ratio": latest.get('priceToSalesRatio', 0)
                        }
                        
        return comparison
        
    @staticmethod
    def rank_companies(comparison: Dict, metric: str, ascending: bool = True) -> List[Tuple[str, float]]:
        """Rank companies by a specific metric"""
        rankings = []
        
        for ticker, metrics in comparison.items():
            if metric in metrics:
                rankings.append((ticker, metrics[metric]))
                
        return sorted(rankings, key=lambda x: x[1], reverse=not ascending)


class RiskAnalysisTool:
    """Analyze financial and market risks"""
    
    @staticmethod
    def calculate_risk_metrics(price_data: List[Dict], financial_data: Dict) -> Dict:
        """Calculate various risk metrics"""
        risk_metrics = {}
        
        # Price volatility
        if price_data and len(price_data) > 30:
            df = pd.DataFrame(price_data)
            if 'close' in df.columns:
                returns = df['close'].pct_change().dropna()
                risk_metrics['volatility_30d'] = returns.rolling(30).std().iloc[-1] * np.sqrt(252) * 100
                risk_metrics['max_drawdown_30d'] = (df['close'].rolling(30).max() - df['close']) / df['close'].rolling(30).max()
                risk_metrics['max_drawdown_30d'] = risk_metrics['max_drawdown_30d'].max() * 100
                
        # Financial risk
        if financial_data:
            total_debt = float(financial_data.get('totalDebt', 0))
            total_equity = float(financial_data.get('totalEquity', 1))
            current_assets = float(financial_data.get('totalCurrentAssets', 0))
            current_liabilities = float(financial_data.get('totalCurrentLiabilities', 1))
            ebitda = float(financial_data.get('ebitda', 0))
            
            risk_metrics.update({
                'debt_to_equity': total_debt / total_equity if total_equity > 0 else 0,
                'current_ratio': current_assets / current_liabilities if current_liabilities > 0 else 0,
                'debt_to_ebitda': total_debt / ebitda if ebitda > 0 else 0,
                'financial_leverage': (total_debt + total_equity) / total_equity if total_equity > 0 else 0
            })
            
            # Risk scoring
            risk_score = 0
            if risk_metrics.get('debt_to_equity', 0) > 2:
                risk_score += 2
            if risk_metrics.get('current_ratio', 0) < 1:
                risk_score += 2
            if risk_metrics.get('volatility_30d', 0) > 30:
                risk_score += 1
                
            risk_metrics['risk_level'] = 'high' if risk_score >= 3 else 'medium' if risk_score >= 2 else 'low'
            
        return risk_metrics


class ScenarioAnalysisTool:
    """Perform scenario and sensitivity analysis"""
    
    @staticmethod
    def revenue_sensitivity_analysis(financial_data: Dict, scenarios: Dict[str, float]) -> Dict:
        """Analyze impact of revenue changes on key metrics"""
        base_revenue = float(financial_data.get('revenue', 0))
        base_net_income = float(financial_data.get('netIncome', 0))
        base_operating_income = float(financial_data.get('operatingIncome', 0))
        
        if base_revenue == 0:
            return {"error": "No revenue data available"}
            
        # Assume operating leverage
        operating_leverage = base_operating_income / base_net_income if base_net_income != 0 else 1
        
        results = {}
        for scenario_name, revenue_change in scenarios.items():
            new_revenue = base_revenue * (1 + revenue_change)
            revenue_delta = new_revenue - base_revenue
            
            # Simplified assumption: variable costs are 60% of revenue
            variable_cost_ratio = 0.6
            contribution_margin = 1 - variable_cost_ratio
            
            new_operating_income = base_operating_income + (revenue_delta * contribution_margin)
            new_net_income = base_net_income + (revenue_delta * contribution_margin * 0.75)  # Assume 25% tax
            
            results[scenario_name] = {
                "revenue": new_revenue,
                "revenue_change_%": revenue_change * 100,
                "operating_income": new_operating_income,
                "net_income": new_net_income,
                "operating_margin": (new_operating_income / new_revenue * 100) if new_revenue > 0 else 0,
                "net_margin": (new_net_income / new_revenue * 100) if new_revenue > 0 else 0
            }
            
        return results


# Create tool instances for LangChain
financial_metrics_tool = Tool(
    name="calculate_financial_metrics",
    description="Calculate advanced financial metrics like growth rates, profitability ratios, and DuPont analysis",
    func=lambda x: FinancialMetrics.calculate_growth_rates(**x)
)

technical_analysis_tool = Tool(
    name="technical_analysis",
    description="Perform technical analysis on price data including moving averages, RSI, and momentum indicators",
    func=lambda x: TechnicalAnalysisTool.calculate_momentum_indicators(x)
)

comparative_analysis_tool = Tool(
    name="compare_companies",
    description="Compare financial metrics across multiple companies",
    func=lambda x: ComparativeAnalysisTool.compare_companies(**x)
)

risk_analysis_tool = Tool(
    name="analyze_risk",
    description="Analyze financial and market risks including volatility and leverage metrics",
    func=lambda x: RiskAnalysisTool.calculate_risk_metrics(**x)
)

scenario_analysis_tool = Tool(
    name="scenario_analysis",
    description="Perform scenario analysis on financial projections",
    func=lambda x: ScenarioAnalysisTool.revenue_sensitivity_analysis(**x)
)