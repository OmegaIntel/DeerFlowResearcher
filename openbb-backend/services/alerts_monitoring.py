"""
Real-time alerts and monitoring service for OpenBB Copilot
Monitors financial metrics and triggers alerts based on conditions
"""

import asyncio
import json
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timedelta
from enum import Enum
import redis
import uuid
from dataclasses import dataclass, field
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# For webhook notifications
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False


class AlertType(str, Enum):
    """Types of alerts"""
    PRICE_THRESHOLD = "price_threshold"
    VOLUME_SPIKE = "volume_spike"
    METRIC_CHANGE = "metric_change"
    TECHNICAL_INDICATOR = "technical_indicator"
    NEWS_SENTIMENT = "news_sentiment"
    RISK_LEVEL = "risk_level"
    EARNINGS_RELEASE = "earnings_release"
    CUSTOM = "custom"


class AlertPriority(str, Enum):
    """Alert priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class NotificationChannel(str, Enum):
    """Notification channels"""
    EMAIL = "email"
    WEBHOOK = "webhook"
    IN_APP = "in_app"
    SMS = "sms"


@dataclass
class AlertCondition:
    """Defines conditions for triggering alerts"""
    metric: str
    operator: str  # >, <, >=, <=, ==, !=
    threshold: float
    check_interval: int = 300  # seconds
    
    def evaluate(self, value: float) -> bool:
        """Evaluate if condition is met"""
        if self.operator == '>':
            return value > self.threshold
        elif self.operator == '<':
            return value < self.threshold
        elif self.operator == '>=':
            return value >= self.threshold
        elif self.operator == '<=':
            return value <= self.threshold
        elif self.operator == '==':
            return abs(value - self.threshold) < 0.0001
        elif self.operator == '!=':
            return abs(value - self.threshold) >= 0.0001
        return False


@dataclass
class Alert:
    """Alert configuration"""
    alert_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    ticker: str = ""
    alert_type: AlertType = AlertType.PRICE_THRESHOLD
    conditions: List[AlertCondition] = field(default_factory=list)
    priority: AlertPriority = AlertPriority.MEDIUM
    channels: List[NotificationChannel] = field(default_factory=list)
    active: bool = True
    created_at: datetime = field(default_factory=datetime.now)
    last_triggered: Optional[datetime] = None
    trigger_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)
    cooldown_minutes: int = 15  # Prevent spam
    
    def can_trigger(self) -> bool:
        """Check if alert can be triggered (cooldown period)"""
        if not self.last_triggered:
            return True
        cooldown_delta = timedelta(minutes=self.cooldown_minutes)
        return datetime.now() - self.last_triggered > cooldown_delta


class AlertsMonitor:
    """Main alerts and monitoring service"""
    
    def __init__(self, redis_host: str = "localhost", redis_port: int = 6379):
        self.redis_client = None
        try:
            self.redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                decode_responses=True
            )
            self.redis_client.ping()
        except:
            print("Redis not available for alerts storage")
            
        self.alerts: Dict[str, Alert] = {}
        self.monitoring_tasks: Dict[str, asyncio.Task] = {}
        self.data_providers: Dict[str, Callable] = {}
        self.notification_handlers: Dict[NotificationChannel, Callable] = {
            NotificationChannel.EMAIL: self._send_email_notification,
            NotificationChannel.WEBHOOK: self._send_webhook_notification,
            NotificationChannel.IN_APP: self._send_in_app_notification
        }
    
    def register_data_provider(self, name: str, provider: Callable):
        """Register a data provider function"""
        self.data_providers[name] = provider
    
    async def create_alert(self, alert: Alert) -> str:
        """Create a new alert"""
        # Store alert
        self.alerts[alert.alert_id] = alert
        self._save_alert(alert)
        
        # Start monitoring if active
        if alert.active:
            await self._start_monitoring(alert)
        
        return alert.alert_id
    
    def _save_alert(self, alert: Alert):
        """Save alert to storage"""
        if self.redis_client:
            try:
                self.redis_client.setex(
                    f"alert:{alert.alert_id}",
                    86400 * 30,  # 30 days TTL
                    json.dumps({
                        'alert_id': alert.alert_id,
                        'name': alert.name,
                        'ticker': alert.ticker,
                        'alert_type': alert.alert_type,
                        'conditions': [
                            {
                                'metric': c.metric,
                                'operator': c.operator,
                                'threshold': c.threshold,
                                'check_interval': c.check_interval
                            } for c in alert.conditions
                        ],
                        'priority': alert.priority,
                        'channels': alert.channels,
                        'active': alert.active,
                        'created_at': alert.created_at.isoformat(),
                        'last_triggered': alert.last_triggered.isoformat() if alert.last_triggered else None,
                        'trigger_count': alert.trigger_count,
                        'metadata': alert.metadata,
                        'cooldown_minutes': alert.cooldown_minutes
                    })
                )
            except Exception as e:
                print(f"Failed to save alert: {e}")
    
    async def _start_monitoring(self, alert: Alert):
        """Start monitoring for an alert"""
        if alert.alert_id in self.monitoring_tasks:
            # Cancel existing task
            self.monitoring_tasks[alert.alert_id].cancel()
        
        # Create new monitoring task
        task = asyncio.create_task(self._monitor_alert(alert))
        self.monitoring_tasks[alert.alert_id] = task
    
    async def _monitor_alert(self, alert: Alert):
        """Monitor alert conditions"""
        while alert.active:
            try:
                # Check each condition
                all_conditions_met = True
                triggered_values = {}
                
                for condition in alert.conditions:
                    # Get current value from data provider
                    value = await self._get_metric_value(
                        alert.ticker,
                        condition.metric,
                        alert.alert_type
                    )
                    
                    if value is not None:
                        triggered_values[condition.metric] = value
                        if not condition.evaluate(value):
                            all_conditions_met = False
                            break
                    else:
                        all_conditions_met = False
                        break
                
                # Trigger alert if all conditions are met
                if all_conditions_met and alert.can_trigger():
                    await self._trigger_alert(alert, triggered_values)
                
                # Wait for check interval (use shortest interval)
                min_interval = min(c.check_interval for c in alert.conditions)
                await asyncio.sleep(min_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error monitoring alert {alert.alert_id}: {e}")
                await asyncio.sleep(60)  # Wait before retry
    
    async def _get_metric_value(
        self,
        ticker: str,
        metric: str,
        alert_type: AlertType
    ) -> Optional[float]:
        """Get current value of a metric"""
        # Map alert types to data providers
        provider_map = {
            AlertType.PRICE_THRESHOLD: "price_provider",
            AlertType.VOLUME_SPIKE: "volume_provider",
            AlertType.METRIC_CHANGE: "metrics_provider",
            AlertType.TECHNICAL_INDICATOR: "technical_provider",
            AlertType.RISK_LEVEL: "risk_provider"
        }
        
        provider_name = provider_map.get(alert_type)
        if provider_name and provider_name in self.data_providers:
            provider = self.data_providers[provider_name]
            try:
                data = await provider(ticker)
                return data.get(metric)
            except Exception as e:
                print(f"Error getting metric {metric} for {ticker}: {e}")
        
        return None
    
    async def _trigger_alert(self, alert: Alert, values: Dict[str, float]):
        """Trigger an alert"""
        # Update alert
        alert.last_triggered = datetime.now()
        alert.trigger_count += 1
        self._save_alert(alert)
        
        # Create notification
        notification = self._create_notification(alert, values)
        
        # Send through configured channels
        for channel in alert.channels:
            if channel in self.notification_handlers:
                handler = self.notification_handlers[channel]
                await handler(alert, notification)
    
    def _create_notification(self, alert: Alert, values: Dict[str, float]) -> Dict[str, Any]:
        """Create notification content"""
        return {
            'alert_id': alert.alert_id,
            'alert_name': alert.name,
            'ticker': alert.ticker,
            'priority': alert.priority,
            'triggered_at': datetime.now().isoformat(),
            'conditions': [
                {
                    'metric': c.metric,
                    'operator': c.operator,
                    'threshold': c.threshold,
                    'current_value': values.get(c.metric)
                } for c in alert.conditions
            ],
            'message': self._format_alert_message(alert, values)
        }
    
    def _format_alert_message(self, alert: Alert, values: Dict[str, float]) -> str:
        """Format alert message"""
        lines = [
            f"🚨 Alert: {alert.name}",
            f"Ticker: {alert.ticker}",
            f"Priority: {alert.priority.upper()}",
            "",
            "Triggered Conditions:"
        ]
        
        for condition in alert.conditions:
            value = values.get(condition.metric, 0)
            lines.append(
                f"- {condition.metric}: {value:.2f} {condition.operator} {condition.threshold:.2f}"
            )
        
        return "\n".join(lines)
    
    async def _send_email_notification(self, alert: Alert, notification: Dict[str, Any]):
        """Send email notification"""
        # This is a placeholder - implement with actual email service
        print(f"Email notification for alert {alert.alert_id}: {notification['message']}")
    
    async def _send_webhook_notification(self, alert: Alert, notification: Dict[str, Any]):
        """Send webhook notification"""
        if not HTTPX_AVAILABLE:
            print("httpx not available for webhook notifications")
            return
            
        webhook_url = alert.metadata.get('webhook_url')
        if webhook_url:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        webhook_url,
                        json=notification,
                        timeout=10.0
                    )
                    if response.status_code != 200:
                        print(f"Webhook failed with status {response.status_code}")
            except Exception as e:
                print(f"Webhook notification failed: {e}")
    
    async def _send_in_app_notification(self, alert: Alert, notification: Dict[str, Any]):
        """Send in-app notification"""
        # Store in Redis for frontend to poll
        if self.redis_client:
            try:
                # Store notification with TTL
                self.redis_client.setex(
                    f"notification:{notification['alert_id']}:{datetime.now().timestamp()}",
                    86400,  # 1 day TTL
                    json.dumps(notification)
                )
                
                # Add to user's notification list
                user_id = alert.metadata.get('user_id', 'default')
                self.redis_client.lpush(
                    f"user_notifications:{user_id}",
                    json.dumps({
                        'notification_id': f"{notification['alert_id']}:{datetime.now().timestamp()}",
                        'timestamp': notification['triggered_at']
                    })
                )
                # Trim to keep only last 100 notifications
                self.redis_client.ltrim(f"user_notifications:{user_id}", 0, 99)
                
            except Exception as e:
                print(f"Failed to store in-app notification: {e}")
    
    async def update_alert(self, alert_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing alert"""
        if alert_id not in self.alerts:
            return False
        
        alert = self.alerts[alert_id]
        
        # Update fields
        for key, value in updates.items():
            if hasattr(alert, key):
                setattr(alert, key, value)
        
        # Restart monitoring if needed
        if alert.active:
            await self._start_monitoring(alert)
        else:
            # Cancel monitoring
            if alert_id in self.monitoring_tasks:
                self.monitoring_tasks[alert_id].cancel()
                del self.monitoring_tasks[alert_id]
        
        self._save_alert(alert)
        return True
    
    async def delete_alert(self, alert_id: str) -> bool:
        """Delete an alert"""
        if alert_id not in self.alerts:
            return False
        
        # Cancel monitoring
        if alert_id in self.monitoring_tasks:
            self.monitoring_tasks[alert_id].cancel()
            del self.monitoring_tasks[alert_id]
        
        # Remove from storage
        del self.alerts[alert_id]
        
        if self.redis_client:
            try:
                self.redis_client.delete(f"alert:{alert_id}")
            except:
                pass
        
        return True
    
    def get_alerts(self, ticker: Optional[str] = None, active_only: bool = True) -> List[Alert]:
        """Get alerts, optionally filtered"""
        alerts = list(self.alerts.values())
        
        if ticker:
            alerts = [a for a in alerts if a.ticker == ticker]
        
        if active_only:
            alerts = [a for a in alerts if a.active]
        
        return alerts
    
    def get_alert_history(self, alert_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get alert trigger history"""
        if not self.redis_client:
            return []
        
        try:
            # Get notification history
            pattern = f"notification:{alert_id}:*"
            keys = self.redis_client.keys(pattern)
            
            notifications = []
            for key in keys[:limit]:
                data = self.redis_client.get(key)
                if data:
                    notifications.append(json.loads(data))
            
            # Sort by timestamp
            notifications.sort(key=lambda x: x['triggered_at'], reverse=True)
            return notifications
            
        except Exception as e:
            print(f"Failed to get alert history: {e}")
            return []


# Pre-configured alert templates
class AlertTemplates:
    """Common alert templates"""
    
    @staticmethod
    def price_breakout(ticker: str, price: float, above: bool = True) -> Alert:
        """Price breakout alert"""
        return Alert(
            name=f"{ticker} Price {'Above' if above else 'Below'} ${price:.2f}",
            ticker=ticker,
            alert_type=AlertType.PRICE_THRESHOLD,
            conditions=[
                AlertCondition(
                    metric="current_price",
                    operator=">" if above else "<",
                    threshold=price,
                    check_interval=60
                )
            ],
            priority=AlertPriority.HIGH,
            channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL]
        )
    
    @staticmethod
    def volume_spike(ticker: str, multiplier: float = 2.0) -> Alert:
        """Volume spike alert"""
        return Alert(
            name=f"{ticker} Volume Spike",
            ticker=ticker,
            alert_type=AlertType.VOLUME_SPIKE,
            conditions=[
                AlertCondition(
                    metric="volume_ratio",
                    operator=">",
                    threshold=multiplier,
                    check_interval=300
                )
            ],
            priority=AlertPriority.MEDIUM,
            channels=[NotificationChannel.IN_APP]
        )
    
    @staticmethod
    def rsi_oversold(ticker: str, rsi_threshold: float = 30) -> Alert:
        """RSI oversold alert"""
        return Alert(
            name=f"{ticker} RSI Oversold",
            ticker=ticker,
            alert_type=AlertType.TECHNICAL_INDICATOR,
            conditions=[
                AlertCondition(
                    metric="rsi",
                    operator="<",
                    threshold=rsi_threshold,
                    check_interval=900
                )
            ],
            priority=AlertPriority.MEDIUM,
            channels=[NotificationChannel.IN_APP]
        )
    
    @staticmethod
    def earnings_alert(ticker: str, days_before: int = 1) -> Alert:
        """Earnings release alert"""
        return Alert(
            name=f"{ticker} Earnings Release",
            ticker=ticker,
            alert_type=AlertType.EARNINGS_RELEASE,
            conditions=[
                AlertCondition(
                    metric="days_to_earnings",
                    operator="<=",
                    threshold=days_before,
                    check_interval=3600
                )
            ],
            priority=AlertPriority.HIGH,
            channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP],
            cooldown_minutes=1440  # Once per day
        )
    
    @staticmethod
    def risk_alert(ticker: str, z_score_threshold: float = 1.8) -> Alert:
        """Financial risk alert"""
        return Alert(
            name=f"{ticker} High Financial Risk",
            ticker=ticker,
            alert_type=AlertType.RISK_LEVEL,
            conditions=[
                AlertCondition(
                    metric="altman_z_score",
                    operator="<",
                    threshold=z_score_threshold,
                    check_interval=86400  # Daily
                )
            ],
            priority=AlertPriority.CRITICAL,
            channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP],
            cooldown_minutes=1440  # Once per day
        )