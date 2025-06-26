"""
API endpoints for alerts and monitoring
"""

from fastapi import APIRouter, HTTPException, Body, BackgroundTasks
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from services.alerts_monitoring import (
    AlertsMonitor,
    Alert,
    AlertType,
    AlertPriority,
    NotificationChannel,
    AlertCondition,
    AlertTemplates
)

router = APIRouter()

# Initialize alerts monitor
alerts_monitor = AlertsMonitor()


class CreateAlertRequest(BaseModel):
    name: str
    ticker: str
    alert_type: AlertType
    conditions: List[Dict[str, Any]]
    priority: AlertPriority = AlertPriority.MEDIUM
    channels: List[NotificationChannel] = [NotificationChannel.IN_APP]
    metadata: Dict[str, Any] = Field(default_factory=dict)
    cooldown_minutes: int = 15


class UpdateAlertRequest(BaseModel):
    name: Optional[str] = None
    active: Optional[bool] = None
    conditions: Optional[List[Dict[str, Any]]] = None
    priority: Optional[AlertPriority] = None
    channels: Optional[List[NotificationChannel]] = None
    cooldown_minutes: Optional[int] = None


class AlertResponse(BaseModel):
    alert_id: str
    name: str
    ticker: str
    alert_type: AlertType
    active: bool
    priority: AlertPriority
    channels: List[NotificationChannel]
    created_at: datetime
    last_triggered: Optional[datetime]
    trigger_count: int


class AlertTemplateRequest(BaseModel):
    template: str  # price_breakout, volume_spike, rsi_oversold, etc.
    ticker: str
    params: Dict[str, Any] = Field(default_factory=dict)


@router.post("/alerts", response_model=AlertResponse)
async def create_alert(
    request: CreateAlertRequest = Body(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Create a new alert"""
    try:
        # Convert conditions
        conditions = []
        for cond in request.conditions:
            conditions.append(AlertCondition(
                metric=cond['metric'],
                operator=cond['operator'],
                threshold=cond['threshold'],
                check_interval=cond.get('check_interval', 300)
            ))
        
        # Create alert
        alert = Alert(
            name=request.name,
            ticker=request.ticker,
            alert_type=request.alert_type,
            conditions=conditions,
            priority=request.priority,
            channels=request.channels,
            metadata=request.metadata,
            cooldown_minutes=request.cooldown_minutes
        )
        
        # Create alert in background
        alert_id = await alerts_monitor.create_alert(alert)
        
        return AlertResponse(
            alert_id=alert_id,
            name=alert.name,
            ticker=alert.ticker,
            alert_type=alert.alert_type,
            active=alert.active,
            priority=alert.priority,
            channels=alert.channels,
            created_at=alert.created_at,
            last_triggered=alert.last_triggered,
            trigger_count=alert.trigger_count
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/alerts/template", response_model=AlertResponse)
async def create_alert_from_template(
    request: AlertTemplateRequest = Body(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Create alert from template"""
    try:
        # Get template
        template_map = {
            'price_breakout': AlertTemplates.price_breakout,
            'volume_spike': AlertTemplates.volume_spike,
            'rsi_oversold': AlertTemplates.rsi_oversold,
            'earnings_alert': AlertTemplates.earnings_alert,
            'risk_alert': AlertTemplates.risk_alert
        }
        
        if request.template not in template_map:
            raise HTTPException(status_code=400, detail="Invalid template")
        
        # Create alert from template
        template_func = template_map[request.template]
        alert = template_func(request.ticker, **request.params)
        
        # Create alert
        alert_id = await alerts_monitor.create_alert(alert)
        
        return AlertResponse(
            alert_id=alert_id,
            name=alert.name,
            ticker=alert.ticker,
            alert_type=alert.alert_type,
            active=alert.active,
            priority=alert.priority,
            channels=alert.channels,
            created_at=alert.created_at,
            last_triggered=alert.last_triggered,
            trigger_count=alert.trigger_count
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(ticker: Optional[str] = None, active_only: bool = True):
    """Get all alerts"""
    try:
        alerts = alerts_monitor.get_alerts(ticker=ticker, active_only=active_only)
        
        return [
            AlertResponse(
                alert_id=alert.alert_id,
                name=alert.name,
                ticker=alert.ticker,
                alert_type=alert.alert_type,
                active=alert.active,
                priority=alert.priority,
                channels=alert.channels,
                created_at=alert.created_at,
                last_triggered=alert.last_triggered,
                trigger_count=alert.trigger_count
            )
            for alert in alerts
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/{alert_id}", response_model=AlertResponse)
async def get_alert(alert_id: str):
    """Get specific alert"""
    try:
        alert = alerts_monitor.alerts.get(alert_id)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return AlertResponse(
            alert_id=alert.alert_id,
            name=alert.name,
            ticker=alert.ticker,
            alert_type=alert.alert_type,
            active=alert.active,
            priority=alert.priority,
            channels=alert.channels,
            created_at=alert.created_at,
            last_triggered=alert.last_triggered,
            trigger_count=alert.trigger_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/alerts/{alert_id}", response_model=AlertResponse)
async def update_alert(alert_id: str, request: UpdateAlertRequest = Body(...)):
    """Update an alert"""
    try:
        updates = request.dict(exclude_unset=True)
        
        # Convert conditions if provided
        if 'conditions' in updates:
            conditions = []
            for cond in updates['conditions']:
                conditions.append(AlertCondition(
                    metric=cond['metric'],
                    operator=cond['operator'],
                    threshold=cond['threshold'],
                    check_interval=cond.get('check_interval', 300)
                ))
            updates['conditions'] = conditions
        
        success = await alerts_monitor.update_alert(alert_id, updates)
        if not success:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        alert = alerts_monitor.alerts[alert_id]
        
        return AlertResponse(
            alert_id=alert.alert_id,
            name=alert.name,
            ticker=alert.ticker,
            alert_type=alert.alert_type,
            active=alert.active,
            priority=alert.priority,
            channels=alert.channels,
            created_at=alert.created_at,
            last_triggered=alert.last_triggered,
            trigger_count=alert.trigger_count
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: str):
    """Delete an alert"""
    try:
        success = await alerts_monitor.delete_alert(alert_id)
        if not success:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return {"message": "Alert deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/{alert_id}/history")
async def get_alert_history(alert_id: str, limit: int = 100):
    """Get alert trigger history"""
    try:
        history = alerts_monitor.get_alert_history(alert_id, limit=limit)
        return {"alert_id": alert_id, "history": history}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Data provider examples (these would be implemented with real data sources)
async def example_price_provider(ticker: str) -> Dict[str, float]:
    """Example price data provider"""
    # This would fetch real price data
    return {
        "current_price": 150.0,
        "day_change": 2.5,
        "day_change_percent": 1.7
    }


async def example_volume_provider(ticker: str) -> Dict[str, float]:
    """Example volume data provider"""
    # This would fetch real volume data
    return {
        "volume": 1000000,
        "avg_volume": 800000,
        "volume_ratio": 1.25
    }


# Register data providers
alerts_monitor.register_data_provider("price_provider", example_price_provider)
alerts_monitor.register_data_provider("volume_provider", example_volume_provider)