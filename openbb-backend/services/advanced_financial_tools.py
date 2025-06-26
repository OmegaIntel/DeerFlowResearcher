"""
Advanced financial analysis tools and calculators for OpenBB Copilot
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from scipy import stats
from sklearn.linear_model import LinearRegression
import warnings
warnings.filterwarnings('ignore')


class AdvancedValuationTools:
    """Advanced valuation models and calculations"""
    
    @staticmethod
    def calculate_dcf_valuation(
        cash_flows: List[float],
        growth_rate: float,
        terminal_growth_rate: float,
        discount_rate: float,
        shares_outstanding: float
    ) -> Dict[str, float]:
        """
        Calculate DCF (Discounted Cash Flow) valuation
        """
        if not cash_flows or discount_rate <= 0:
            return {"error": "Invalid inputs for DCF calculation"}
            
        try:
            # Project future cash flows (5 years)
            projected_cf = []
            last_cf = cash_flows[-1]
            
            for i in range(1, 6):
                projected_cf.append(last_cf * (1 + growth_rate) ** i)
                
            # Calculate terminal value
            terminal_cf = projected_cf[-1] * (1 + terminal_growth_rate)
            terminal_value = terminal_cf / (discount_rate - terminal_growth_rate)
            
            # Discount all cash flows
            pv_cf = sum(cf / (1 + discount_rate) ** i for i, cf in enumerate(projected_cf, 1))
            pv_terminal = terminal_value / (1 + discount_rate) ** 5
            
            # Calculate enterprise value and equity value
            enterprise_value = pv_cf + pv_terminal
            price_per_share = enterprise_value / shares_outstanding if shares_outstanding > 0 else 0
            
            return {
                "enterprise_value": enterprise_value,
                "present_value_cf": pv_cf,
                "terminal_value": terminal_value,
                "price_per_share": price_per_share,
                "projected_cash_flows": projected_cf
            }
        except Exception as e:
            return {"error": str(e)}
            
    @staticmethod
    def calculate_relative_valuation(
        company_metrics: Dict[str, float],
        peer_metrics: List[Dict[str, float]]
    ) -> Dict[str, Any]:
        """
        Calculate relative valuation compared to peers
        """
        if not peer_metrics:
            return {"error": "No peer data available"}
            
        try:
            valuation_multiples = ['pe_ratio', 'pb_ratio', 'ps_ratio', 'ev_ebitda']
            results = {}
            
            for multiple in valuation_multiples:
                if multiple in company_metrics:
                    company_value = company_metrics[multiple]
                    peer_values = [p.get(multiple, 0) for p in peer_metrics if p.get(multiple, 0) > 0]
                    
                    if peer_values:
                        peer_median = np.median(peer_values)
                        peer_mean = np.mean(peer_values)
                        percentile = stats.percentileofscore(peer_values, company_value)
                        
                        results[multiple] = {
                            "company": company_value,
                            "peer_median": peer_median,
                            "peer_mean": peer_mean,
                            "percentile": percentile,
                            "premium_discount": ((company_value - peer_median) / peer_median * 100) if peer_median > 0 else 0,
                            "valuation_signal": "undervalued" if percentile < 30 else "overvalued" if percentile > 70 else "fair"
                        }
                        
            return results
        except Exception as e:
            return {"error": str(e)}


class AdvancedRatioAnalysis:
    """Advanced financial ratio analysis and trends"""
    
    @staticmethod
    def calculate_altman_z_score(financial_data: Dict) -> Dict[str, float]:
        """
        Calculate Altman Z-Score for bankruptcy prediction
        """
        try:
            # Extract required values
            working_capital = financial_data.get('totalCurrentAssets', 0) - financial_data.get('totalCurrentLiabilities', 0)
            total_assets = financial_data.get('totalAssets', 1)
            retained_earnings = financial_data.get('retainedEarnings', 0)
            ebit = financial_data.get('ebit', financial_data.get('operatingIncome', 0))
            market_value_equity = financial_data.get('marketCap', 0)
            total_liabilities = financial_data.get('totalLiabilities', 0)
            revenue = financial_data.get('revenue', 0)
            
            # Calculate Z-Score components
            if total_assets > 0:
                a = (working_capital / total_assets) * 1.2
                b = (retained_earnings / total_assets) * 1.4
                c = (ebit / total_assets) * 3.3
                d = (market_value_equity / total_liabilities) * 0.6 if total_liabilities > 0 else 0
                e = (revenue / total_assets) * 1.0
                
                z_score = a + b + c + d + e
                
                # Interpretation
                if z_score > 2.99:
                    zone = "Safe Zone"
                    risk = "Low bankruptcy risk"
                elif z_score > 1.81:
                    zone = "Grey Zone"
                    risk = "Moderate bankruptcy risk"
                else:
                    zone = "Distress Zone"
                    risk = "High bankruptcy risk"
                    
                return {
                    "z_score": z_score,
                    "components": {
                        "working_capital_ratio": a,
                        "retained_earnings_ratio": b,
                        "ebit_ratio": c,
                        "market_value_ratio": d,
                        "sales_ratio": e
                    },
                    "zone": zone,
                    "risk_assessment": risk
                }
            else:
                return {"error": "Invalid financial data"}
                
        except Exception as e:
            return {"error": str(e)}
            
    @staticmethod
    def calculate_piotroski_f_score(
        current_data: Dict,
        previous_data: Dict
    ) -> Dict[str, Any]:
        """
        Calculate Piotroski F-Score for fundamental strength
        """
        try:
            score = 0
            criteria = {}
            
            # Profitability criteria (4 points)
            # 1. Positive ROA
            current_roa = current_data.get('netIncome', 0) / current_data.get('totalAssets', 1)
            if current_roa > 0:
                score += 1
                criteria['positive_roa'] = True
                
            # 2. Positive operating cash flow
            if current_data.get('operatingCashFlow', 0) > 0:
                score += 1
                criteria['positive_ocf'] = True
                
            # 3. Increasing ROA
            prev_roa = previous_data.get('netIncome', 0) / previous_data.get('totalAssets', 1)
            if current_roa > prev_roa:
                score += 1
                criteria['increasing_roa'] = True
                
            # 4. Quality of earnings (OCF > Net Income)
            if current_data.get('operatingCashFlow', 0) > current_data.get('netIncome', 0):
                score += 1
                criteria['quality_earnings'] = True
                
            # Leverage, liquidity, and source of funds (3 points)
            # 5. Decreasing leverage
            current_leverage = current_data.get('totalDebt', 0) / current_data.get('totalAssets', 1)
            prev_leverage = previous_data.get('totalDebt', 0) / previous_data.get('totalAssets', 1)
            if current_leverage < prev_leverage:
                score += 1
                criteria['decreasing_leverage'] = True
                
            # 6. Increasing current ratio
            current_ratio = current_data.get('totalCurrentAssets', 0) / current_data.get('totalCurrentLiabilities', 1)
            prev_ratio = previous_data.get('totalCurrentAssets', 0) / previous_data.get('totalCurrentLiabilities', 1)
            if current_ratio > prev_ratio:
                score += 1
                criteria['increasing_liquidity'] = True
                
            # 7. No new shares issued
            if current_data.get('sharesOutstanding', 0) <= previous_data.get('sharesOutstanding', float('inf')):
                score += 1
                criteria['no_dilution'] = True
                
            # Operating efficiency (2 points)
            # 8. Increasing gross margin
            current_gm = (current_data.get('grossProfit', 0) / current_data.get('revenue', 1)) if current_data.get('revenue', 0) > 0 else 0
            prev_gm = (previous_data.get('grossProfit', 0) / previous_data.get('revenue', 1)) if previous_data.get('revenue', 0) > 0 else 0
            if current_gm > prev_gm:
                score += 1
                criteria['increasing_margin'] = True
                
            # 9. Increasing asset turnover
            current_at = current_data.get('revenue', 0) / current_data.get('totalAssets', 1)
            prev_at = previous_data.get('revenue', 0) / previous_data.get('totalAssets', 1)
            if current_at > prev_at:
                score += 1
                criteria['increasing_efficiency'] = True
                
            # Interpretation
            if score >= 8:
                strength = "Very Strong"
            elif score >= 6:
                strength = "Strong"
            elif score >= 4:
                strength = "Moderate"
            else:
                strength = "Weak"
                
            return {
                "f_score": score,
                "max_score": 9,
                "strength": strength,
                "criteria_met": criteria,
                "recommendation": "Buy" if score >= 7 else "Hold" if score >= 4 else "Avoid"
            }
            
        except Exception as e:
            return {"error": str(e)}


class TrendAnalysisTools:
    """Advanced trend analysis and forecasting"""
    
    @staticmethod
    def perform_regression_analysis(
        data_points: List[Tuple[float, float]],
        forecast_periods: int = 4
    ) -> Dict[str, Any]:
        """
        Perform linear regression analysis and forecasting
        """
        if len(data_points) < 3:
            return {"error": "Insufficient data points for regression"}
            
        try:
            # Prepare data
            X = np.array([[i] for i in range(len(data_points))])
            y = np.array([point[1] for point in data_points])
            
            # Fit model
            model = LinearRegression()
            model.fit(X, y)
            
            # Calculate R-squared
            y_pred = model.predict(X)
            ss_res = np.sum((y - y_pred) ** 2)
            ss_tot = np.sum((y - np.mean(y)) ** 2)
            r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
            
            # Forecast
            future_X = np.array([[len(data_points) + i] for i in range(forecast_periods)])
            forecast = model.predict(future_X)
            
            # Calculate confidence intervals
            mse = np.mean((y - y_pred) ** 2)
            std_error = np.sqrt(mse)
            confidence_interval = 1.96 * std_error  # 95% confidence
            
            return {
                "slope": model.coef_[0],
                "intercept": model.intercept_,
                "r_squared": r_squared,
                "trend": "upward" if model.coef_[0] > 0 else "downward",
                "forecast": forecast.tolist(),
                "confidence_interval": confidence_interval,
                "historical_fit": y_pred.tolist()
            }
            
        except Exception as e:
            return {"error": str(e)}
            
    @staticmethod
    def detect_seasonality(
        time_series_data: List[float],
        period: int = 4
    ) -> Dict[str, Any]:
        """
        Detect seasonality patterns in financial data
        """
        if len(time_series_data) < period * 2:
            return {"error": "Insufficient data for seasonality analysis"}
            
        try:
            # Calculate seasonal indices
            seasonal_indices = []
            for i in range(period):
                seasonal_values = [time_series_data[j] for j in range(i, len(time_series_data), period)]
                if seasonal_values:
                    seasonal_indices.append(np.mean(seasonal_values))
                    
            # Normalize indices
            overall_mean = np.mean(time_series_data)
            if overall_mean > 0:
                seasonal_factors = [idx / overall_mean for idx in seasonal_indices]
            else:
                seasonal_factors = seasonal_indices
                
            # Calculate strength of seasonality
            seasonality_strength = np.std(seasonal_factors)
            
            return {
                "seasonal_factors": seasonal_factors,
                "seasonality_strength": seasonality_strength,
                "has_strong_seasonality": seasonality_strength > 0.1,
                "peak_period": seasonal_factors.index(max(seasonal_factors)) + 1,
                "trough_period": seasonal_factors.index(min(seasonal_factors)) + 1
            }
            
        except Exception as e:
            return {"error": str(e)}


class PortfolioAnalysisTools:
    """Portfolio and correlation analysis tools"""
    
    @staticmethod
    def calculate_correlation_matrix(
        ticker_data: Dict[str, List[float]]
    ) -> Dict[str, Any]:
        """
        Calculate correlation matrix between multiple tickers
        """
        if len(ticker_data) < 2:
            return {"error": "Need at least 2 tickers for correlation analysis"}
            
        try:
            # Create DataFrame
            df = pd.DataFrame(ticker_data)
            
            # Calculate returns
            returns = df.pct_change().dropna()
            
            # Calculate correlation matrix
            correlation_matrix = returns.corr()
            
            # Find highest and lowest correlations
            correlations = []
            for i in range(len(correlation_matrix.columns)):
                for j in range(i+1, len(correlation_matrix.columns)):
                    ticker1 = correlation_matrix.columns[i]
                    ticker2 = correlation_matrix.columns[j]
                    corr = correlation_matrix.iloc[i, j]
                    correlations.append({
                        "pair": f"{ticker1}-{ticker2}",
                        "correlation": corr
                    })
                    
            correlations.sort(key=lambda x: abs(x['correlation']), reverse=True)
            
            return {
                "correlation_matrix": correlation_matrix.to_dict(),
                "highest_correlation": correlations[0] if correlations else None,
                "lowest_correlation": correlations[-1] if correlations else None,
                "average_correlation": np.mean([c['correlation'] for c in correlations]) if correlations else 0,
                "diversification_score": 1 - np.mean([abs(c['correlation']) for c in correlations]) if correlations else 0
            }
            
        except Exception as e:
            return {"error": str(e)}
            
    @staticmethod
    def calculate_beta(
        stock_returns: List[float],
        market_returns: List[float]
    ) -> Dict[str, float]:
        """
        Calculate beta coefficient relative to market
        """
        if len(stock_returns) != len(market_returns) or len(stock_returns) < 20:
            return {"error": "Insufficient or mismatched return data"}
            
        try:
            # Calculate covariance and variance
            covariance = np.cov(stock_returns, market_returns)[0, 1]
            market_variance = np.var(market_returns)
            
            beta = covariance / market_variance if market_variance > 0 else 0
            
            # Interpret beta
            if beta > 1.5:
                risk_profile = "High Risk/High Return"
            elif beta > 1:
                risk_profile = "Above Average Risk"
            elif beta > 0.5:
                risk_profile = "Average Risk"
            else:
                risk_profile = "Low Risk/Defensive"
                
            return {
                "beta": beta,
                "risk_profile": risk_profile,
                "market_sensitivity": "High" if abs(beta) > 1.2 else "Moderate" if abs(beta) > 0.8 else "Low"
            }
            
        except Exception as e:
            return {"error": str(e)}