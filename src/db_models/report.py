# src/db_models/report.py
from sqlalchemy import Column, String, TIMESTAMP, func, Text, Integer, JSON
from sqlalchemy_utils import UUIDType
from src.db_models.base import Base
import uuid


class Report(Base):
    __tablename__ = "reports"

    id = Column(UUIDType(binary=False), primary_key=True, default=uuid.uuid4)
    thread_id = Column(String(255), nullable=False, index=True)
    user_id = Column(
        String(255), nullable=True, index=True
    )  # Store UUID as string, no foreign key

    # Report content
    report_content = Column(Text, nullable=False)

    # Plan metadata
    plan_title = Column(String(500), nullable=True)
    plan_description = Column(Text, nullable=True)
    plan_iterations = Column(Integer, default=0)

    # Request context
    locale = Column(String(10), default="en-US")
    max_plan_iterations = Column(Integer, nullable=True)
    max_step_num = Column(Integer, nullable=True)
    auto_accepted_plan = Column(String(10), default="false")
    enable_background_investigation = Column(String(10), default="true")

    # Additional metadata
    observations = Column(JSON, nullable=True)  # Store as JSON array
    mcp_settings = Column(JSON, nullable=True)  # Store MCP settings if needed

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(
        TIMESTAMP,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )
