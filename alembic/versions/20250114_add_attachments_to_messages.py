"""add attachments to chat messages

Revision ID: add_attachments_to_messages
Revises: c966c09ba5f6
Create Date: 2025-01-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = 'add_attachments_to_messages'
down_revision: Union[str, None] = 'c966c09ba5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add attachments column to chat_messages table
    op.add_column('chat_messages', sa.Column('attachments', sa.JSON(), nullable=True))


def downgrade() -> None:
    # Remove attachments column from chat_messages table
    op.drop_column('chat_messages', 'attachments')