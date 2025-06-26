"""
Sophisticated quantitative models for OpenBB Copilot
Including Monte Carlo, Options Greeks, and ML predictions
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from scipy import stats
from scipy.stats import norm
import warnings
warnings.filterwarnings('ignore')

# For ML models
try:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False


class MonteCarloSimulation:
    """Monte Carlo simulation for risk modeling and price forecasting"""
    
    @staticmethod
    def simulate_price_paths(
        current_price: float,
        volatility: float,
        drift: float,
        time_horizon: int,  # days
        num_simulations: int = 10000,
        time_steps: int = 252  # daily steps
    ) -> Dict[str, Any]:
        """
        Simulate future price paths using Geometric Brownian Motion
        """
        try:
            dt = time_horizon / time_steps / 252  # Convert to years
            
            # Initialize price paths
            price_paths = np.zeros((num_simulations, time_steps + 1))
            price_paths[:, 0] = current_price
            
            # Generate random shocks
            np.random.seed(42)  # For reproducibility
            shocks = np.random.normal(0, 1, (num_simulations, time_steps))
            
            # Simulate paths
            for t in range(1, time_steps + 1):
                price_paths[:, t] = price_paths[:, t-1] * np.exp(
                    (drift - 0.5 * volatility**2) * dt + 
                    volatility * np.sqrt(dt) * shocks[:, t-1]
                )
            
            # Calculate statistics
            final_prices = price_paths[:, -1]
            
            # VaR and CVaR calculations
            var_95 = np.percentile(final_prices, 5)
            var_99 = np.percentile(final_prices, 1)
            cvar_95 = np.mean(final_prices[final_prices <= var_95])
            cvar_99 = np.mean(final_prices[final_prices <= var_99])
            
            # Probability calculations
            prob_above_current = np.mean(final_prices > current_price)
            prob_gain_10pct = np.mean(final_prices > current_price * 1.1)
            prob_loss_10pct = np.mean(final_prices < current_price * 0.9)
            
            return {
                "current_price": current_price,
                "expected_price": np.mean(final_prices),
                "median_price": np.median(final_prices),
                "std_dev": np.std(final_prices),
                "min_price": np.min(final_prices),
                "max_price": np.max(final_prices),
                "percentiles": {
                    "5th": np.percentile(final_prices, 5),
                    "25th": np.percentile(final_prices, 25),
                    "75th": np.percentile(final_prices, 75),
                    "95th": np.percentile(final_prices, 95)
                },
                "value_at_risk": {
                    "var_95": current_price - var_95,
                    "var_99": current_price - var_99,
                    "cvar_95": current_price - cvar_95,
                    "cvar_99": current_price - cvar_99
                },
                "probabilities": {
                    "above_current": prob_above_current,
                    "gain_10pct": prob_gain_10pct,
                    "loss_10pct": prob_loss_10pct
                },
                "simulation_params": {
                    "volatility": volatility,
                    "drift": drift,
                    "time_horizon_days": time_horizon,
                    "num_simulations": num_simulations
                }
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    @staticmethod
    def portfolio_optimization(
        returns_data: pd.DataFrame,
        risk_free_rate: float = 0.02,
        num_portfolios: int = 10000
    ) -> Dict[str, Any]:
        """
        Monte Carlo simulation for portfolio optimization
        """
        try:
            # Calculate expected returns and covariance
            mean_returns = returns_data.mean()
            cov_matrix = returns_data.cov()
            num_assets = len(mean_returns)
            
            # Initialize arrays
            portfolio_returns = np.zeros(num_portfolios)
            portfolio_volatility = np.zeros(num_portfolios)
            portfolio_sharpe = np.zeros(num_portfolios)
            all_weights = np.zeros((num_portfolios, num_assets))
            
            # Simulate random portfolios
            np.random.seed(42)
            for i in range(num_portfolios):
                # Generate random weights
                weights = np.random.random(num_assets)
                weights /= np.sum(weights)  # Normalize
                all_weights[i, :] = weights
                
                # Calculate portfolio metrics
                portfolio_returns[i] = np.sum(weights * mean_returns * 252)  # Annualized
                portfolio_volatility[i] = np.sqrt(np.dot(weights.T, np.dot(cov_matrix * 252, weights)))
                portfolio_sharpe[i] = (portfolio_returns[i] - risk_free_rate) / portfolio_volatility[i]
            
            # Find optimal portfolios
            max_sharpe_idx = portfolio_sharpe.argmax()
            min_vol_idx = portfolio_volatility.argmin()
            
            # Efficient frontier points
            efficient_portfolios = []
            target_returns = np.linspace(portfolio_returns.min(), portfolio_returns.max(), 50)
            
            for target in target_returns:
                # Find portfolio with minimum volatility for target return
                valid_idx = np.where(np.abs(portfolio_returns - target) < 0.01)[0]
                if len(valid_idx) > 0:
                    min_vol_for_target = valid_idx[portfolio_volatility[valid_idx].argmin()]
                    efficient_portfolios.append({
                        "return": portfolio_returns[min_vol_for_target],
                        "volatility": portfolio_volatility[min_vol_for_target],
                        "weights": all_weights[min_vol_for_target, :].tolist()
                    })
            
            return {
                "optimal_sharpe_portfolio": {
                    "weights": dict(zip(returns_data.columns, all_weights[max_sharpe_idx, :])),
                    "expected_return": portfolio_returns[max_sharpe_idx],
                    "volatility": portfolio_volatility[max_sharpe_idx],
                    "sharpe_ratio": portfolio_sharpe[max_sharpe_idx]
                },
                "minimum_variance_portfolio": {
                    "weights": dict(zip(returns_data.columns, all_weights[min_vol_idx, :])),
                    "expected_return": portfolio_returns[min_vol_idx],
                    "volatility": portfolio_volatility[min_vol_idx],
                    "sharpe_ratio": portfolio_sharpe[min_vol_idx]
                },
                "efficient_frontier": efficient_portfolios[:10],  # Sample points
                "risk_return_profile": {
                    "min_return": portfolio_returns.min(),
                    "max_return": portfolio_returns.max(),
                    "min_volatility": portfolio_volatility.min(),
                    "max_volatility": portfolio_volatility.max()
                }
            }
            
        except Exception as e:
            return {"error": str(e)}


class OptionsGreeks:
    """Black-Scholes options pricing and Greeks calculations"""
    
    @staticmethod
    def black_scholes(
        S: float,  # Current stock price
        K: float,  # Strike price
        T: float,  # Time to maturity (years)
        r: float,  # Risk-free rate
        sigma: float,  # Volatility
        option_type: str = 'call'
    ) -> Dict[str, float]:
        """
        Calculate Black-Scholes option price and Greeks
        """
        try:
            # Calculate d1 and d2
            d1 = (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
            d2 = d1 - sigma * np.sqrt(T)
            
            if option_type.lower() == 'call':
                # Call option
                price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
                delta = norm.cdf(d1)
                theta = (-S * norm.pdf(d1) * sigma / (2 * np.sqrt(T)) - 
                        r * K * np.exp(-r * T) * norm.cdf(d2)) / 365
            else:
                # Put option
                price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
                delta = -norm.cdf(-d1)
                theta = (-S * norm.pdf(d1) * sigma / (2 * np.sqrt(T)) + 
                        r * K * np.exp(-r * T) * norm.cdf(-d2)) / 365
            
            # Common Greeks
            gamma = norm.pdf(d1) / (S * sigma * np.sqrt(T))
            vega = S * norm.pdf(d1) * np.sqrt(T) / 100  # Per 1% change in volatility
            rho = K * T * np.exp(-r * T) * (norm.cdf(d2) if option_type.lower() == 'call' else norm.cdf(-d2)) / 100
            
            # Calculate implied leverage
            leverage = (S / price) * delta if price > 0 else 0
            
            # Probability of profit
            if option_type.lower() == 'call':
                prob_itm = norm.cdf(d2)  # Probability of being in-the-money
            else:
                prob_itm = norm.cdf(-d2)
            
            return {
                "price": price,
                "delta": delta,
                "gamma": gamma,
                "theta": theta,
                "vega": vega,
                "rho": rho,
                "leverage": leverage,
                "probability_itm": prob_itm,
                "intrinsic_value": max(S - K, 0) if option_type.lower() == 'call' else max(K - S, 0),
                "time_value": price - (max(S - K, 0) if option_type.lower() == 'call' else max(K - S, 0)),
                "moneyness": S / K
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    @staticmethod
    def implied_volatility(
        market_price: float,
        S: float,
        K: float,
        T: float,
        r: float,
        option_type: str = 'call'
    ) -> float:
        """
        Calculate implied volatility using Newton-Raphson method
        """
        try:
            # Initial guess
            sigma = 0.2
            tolerance = 1e-5
            max_iterations = 100
            
            for i in range(max_iterations):
                # Calculate option price and vega
                greeks = OptionsGreeks.black_scholes(S, K, T, r, sigma, option_type)
                price = greeks['price']
                vega = greeks['vega'] * 100  # Adjust for percentage
                
                # Newton-Raphson update
                price_diff = market_price - price
                if abs(price_diff) < tolerance:
                    return sigma
                
                sigma = sigma + price_diff / vega
                
                # Ensure sigma stays positive
                sigma = max(sigma, 0.001)
                
            return sigma
            
        except Exception as e:
            return 0.0
    
    @staticmethod
    def options_strategy_analysis(
        positions: List[Dict[str, Any]],
        underlying_price_range: Tuple[float, float],
        current_price: float
    ) -> Dict[str, Any]:
        """
        Analyze complex options strategies (spreads, straddles, etc.)
        """
        try:
            # Generate price points for analysis
            price_points = np.linspace(underlying_price_range[0], underlying_price_range[1], 100)
            
            # Calculate P&L at each price point
            total_pnl = np.zeros_like(price_points)
            total_cost = 0
            
            for position in positions:
                quantity = position.get('quantity', 1)
                position_type = position.get('position_type', 'long')  # long or short
                cost = position.get('cost', 0)
                
                # Add to total cost
                if position_type == 'long':
                    total_cost += cost * quantity
                else:
                    total_cost -= cost * quantity
                
                # Calculate payoff at each price point
                for i, S in enumerate(price_points):
                    if position.get('type') == 'stock':
                        # Stock position
                        payoff = (S - position.get('purchase_price', current_price)) * quantity
                    else:
                        # Option position
                        K = position.get('strike', 0)
                        if position.get('option_type', 'call').lower() == 'call':
                            payoff = max(S - K, 0) - cost
                        else:
                            payoff = max(K - S, 0) - cost
                        
                        payoff *= quantity
                        if position_type == 'short':
                            payoff = -payoff
                    
                    total_pnl[i] += payoff
            
            # Find key points
            max_profit = np.max(total_pnl)
            max_loss = np.min(total_pnl)
            breakeven_points = []
            
            for i in range(len(price_points) - 1):
                if total_pnl[i] * total_pnl[i + 1] < 0:
                    # Sign change indicates breakeven
                    breakeven = price_points[i] + (price_points[i + 1] - price_points[i]) * (
                        -total_pnl[i] / (total_pnl[i + 1] - total_pnl[i])
                    )
                    breakeven_points.append(breakeven)
            
            # Current position P&L
            current_idx = np.argmin(np.abs(price_points - current_price))
            current_pnl = total_pnl[current_idx]
            
            return {
                "max_profit": max_profit,
                "max_loss": max_loss,
                "breakeven_points": breakeven_points,
                "current_pnl": current_pnl,
                "total_cost": total_cost,
                "profit_probability": np.mean(total_pnl > 0),
                "risk_reward_ratio": abs(max_profit / max_loss) if max_loss < 0 else float('inf'),
                "strategy_type": OptionsGreeks._identify_strategy(positions),
                "price_range_analysis": {
                    "prices": price_points.tolist()[::10],  # Sample every 10th point
                    "pnl": total_pnl.tolist()[::10]
                }
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    @staticmethod
    def _identify_strategy(positions: List[Dict]) -> str:
        """Identify common options strategies"""
        if len(positions) == 1:
            return "Single Option"
        elif len(positions) == 2:
            # Check for common two-leg strategies
            if all(p.get('option_type') == 'call' for p in positions):
                strikes = [p.get('strike', 0) for p in positions]
                if strikes[0] < strikes[1]:
                    return "Bull Call Spread"
                else:
                    return "Bear Call Spread"
            elif all(p.get('option_type') == 'put' for p in positions):
                return "Put Spread"
            elif positions[0].get('option_type') != positions[1].get('option_type'):
                if positions[0].get('strike') == positions[1].get('strike'):
                    return "Straddle"
                else:
                    return "Strangle"
        elif len(positions) == 4:
            return "Iron Condor or Butterfly"
        
        return "Complex Strategy"


class MLPricePrediction:
    """Machine Learning models for price prediction"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = []
    
    def prepare_features(self, price_data: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare technical features for ML model
        """
        try:
            df = price_data.copy()
            
            # Price-based features
            df['returns'] = df['close'].pct_change()
            df['log_returns'] = np.log(df['close'] / df['close'].shift(1))
            
            # Moving averages
            for period in [5, 10, 20, 50]:
                df[f'sma_{period}'] = df['close'].rolling(window=period).mean()
                df[f'sma_{period}_ratio'] = df['close'] / df[f'sma_{period}']
            
            # Volatility features
            df['volatility_20'] = df['returns'].rolling(window=20).std()
            df['volatility_60'] = df['returns'].rolling(window=60).std()
            
            # RSI
            delta = df['close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            df['rsi'] = 100 - (100 / (1 + rs))
            
            # MACD
            exp1 = df['close'].ewm(span=12, adjust=False).mean()
            exp2 = df['close'].ewm(span=26, adjust=False).mean()
            df['macd'] = exp1 - exp2
            df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
            
            # Volume features
            if 'volume' in df.columns:
                df['volume_ratio'] = df['volume'] / df['volume'].rolling(window=20).mean()
                df['price_volume'] = df['close'] * df['volume']
            
            # Lag features
            for lag in [1, 2, 3, 5, 10]:
                df[f'returns_lag_{lag}'] = df['returns'].shift(lag)
            
            # Drop NaN values
            df = df.dropna()
            
            # Select feature columns
            feature_cols = [col for col in df.columns if col not in ['close', 'open', 'high', 'low', 'date', 'volume']]
            self.feature_names = feature_cols
            
            return df[feature_cols]
            
        except Exception as e:
            raise Exception(f"Feature preparation error: {str(e)}")
    
    def train_model(
        self, 
        price_data: pd.DataFrame,
        target_days: int = 5,
        test_size: float = 0.2
    ) -> Dict[str, Any]:
        """
        Train Random Forest model for price prediction
        """
        if not ML_AVAILABLE:
            return {"error": "ML libraries not available. Install scikit-learn."}
        
        try:
            # Prepare features
            features_df = self.prepare_features(price_data)
            
            # Create target (future returns)
            target = price_data['close'].pct_change(target_days).shift(-target_days)
            target = target.loc[features_df.index]
            
            # Remove NaN targets
            valid_idx = ~target.isna()
            X = features_df[valid_idx]
            y = target[valid_idx]
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, shuffle=False
            )
            
            # Scale features
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Train model
            self.model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                n_jobs=-1
            )
            self.model.fit(X_train_scaled, y_train)
            
            # Evaluate
            train_score = self.model.score(X_train_scaled, y_train)
            test_score = self.model.score(X_test_scaled, y_test)
            
            # Feature importance
            feature_importance = pd.DataFrame({
                'feature': self.feature_names,
                'importance': self.model.feature_importances_
            }).sort_values('importance', ascending=False)
            
            # Make predictions
            predictions = self.model.predict(X_test_scaled)
            
            # Calculate metrics
            rmse = np.sqrt(np.mean((predictions - y_test) ** 2))
            mae = np.mean(np.abs(predictions - y_test))
            
            # Directional accuracy
            direction_accuracy = np.mean((predictions > 0) == (y_test > 0))
            
            return {
                "model_trained": True,
                "train_r2_score": train_score,
                "test_r2_score": test_score,
                "rmse": rmse,
                "mae": mae,
                "direction_accuracy": direction_accuracy,
                "feature_importance": feature_importance.head(10).to_dict('records'),
                "target_days": target_days,
                "training_samples": len(X_train),
                "test_samples": len(X_test)
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def predict_future(
        self,
        current_features: pd.DataFrame,
        num_scenarios: int = 100
    ) -> Dict[str, Any]:
        """
        Generate future price predictions with uncertainty
        """
        if self.model is None:
            return {"error": "Model not trained"}
        
        try:
            # Scale features
            features_scaled = self.scaler.transform(current_features)
            
            # Get base prediction
            base_prediction = self.model.predict(features_scaled)[0]
            
            # Generate prediction scenarios using tree predictions
            tree_predictions = []
            for tree in self.model.estimators_[:num_scenarios]:
                tree_predictions.append(tree.predict(features_scaled)[0])
            
            tree_predictions = np.array(tree_predictions)
            
            # Calculate prediction statistics
            prediction_mean = np.mean(tree_predictions)
            prediction_std = np.std(tree_predictions)
            
            # Calculate confidence intervals
            confidence_intervals = {
                "90%": (np.percentile(tree_predictions, 5), np.percentile(tree_predictions, 95)),
                "95%": (np.percentile(tree_predictions, 2.5), np.percentile(tree_predictions, 97.5)),
                "99%": (np.percentile(tree_predictions, 0.5), np.percentile(tree_predictions, 99.5))
            }
            
            # Probability calculations
            prob_positive = np.mean(tree_predictions > 0)
            prob_above_5pct = np.mean(tree_predictions > 0.05)
            prob_below_neg5pct = np.mean(tree_predictions < -0.05)
            
            return {
                "base_prediction": base_prediction,
                "expected_return": prediction_mean,
                "prediction_std": prediction_std,
                "confidence_intervals": confidence_intervals,
                "probabilities": {
                    "positive_return": prob_positive,
                    "return_above_5pct": prob_above_5pct,
                    "return_below_neg5pct": prob_below_neg5pct
                },
                "prediction_distribution": {
                    "min": np.min(tree_predictions),
                    "25th_percentile": np.percentile(tree_predictions, 25),
                    "median": np.median(tree_predictions),
                    "75th_percentile": np.percentile(tree_predictions, 75),
                    "max": np.max(tree_predictions)
                }
            }
            
        except Exception as e:
            return {"error": str(e)}