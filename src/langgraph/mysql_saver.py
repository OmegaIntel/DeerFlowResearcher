from sqlalchemy import (
    Table,
    Column,
    String,
    Text,
    MetaData,
    insert,
    select,
    update,
    delete,
)
from sqlalchemy.engine import Engine
import json
import uuid


class MySQLCheckpointSaver:
    def __init__(self, engine: Engine, table_name: str = "checkpoints"):
        self.engine = engine
        self.table_name = table_name
        self.metadata = MetaData()
        self.table = Table(
            self.table_name,
            self.metadata,
            Column("id", String(255), primary_key=True),
            Column("thread_id", String(255), nullable=False),
            Column("checkpoint_id", String(255), nullable=False),
            Column("checkpoint_data", Text, nullable=False),
        )

    def get_next_version(self, config: dict, channel_name: str | None = None) -> str:
        """Generate a new checkpoint version using UUID. Channel name is unused but required."""
        return str(uuid.uuid4())

    async def aput(self, config: dict, state: dict) -> None:
        """Store full graph state."""
        thread_id = config["configurable"]["thread_id"]
        checkpoint_id = config["configurable"].get(
            "checkpoint_id", self.get_next_version(config)
        )
        state_json = json.dumps(state, ensure_ascii=False)

        stmt = (
            insert(self.table)
            .values(
                id=f"{thread_id}:{checkpoint_id}",
                thread_id=thread_id,
                checkpoint_id=checkpoint_id,
                checkpoint_data=state_json,
            )
            .prefix_with("IGNORE")
        )

        update_stmt = (
            update(self.table)
            .where(self.table.c.id == f"{thread_id}:{checkpoint_id}")
            .values(checkpoint_data=state_json)
        )

        with self.engine.begin() as conn:
            result = conn.execute(stmt)
            if result.rowcount == 0:
                conn.execute(update_stmt)

    async def aput_writes(self, config: dict, state: dict, writes: dict) -> None:
        """Store only the 'writes' part of the graph state."""
        await self.aput(config, writes)

    async def aget(self, config: dict) -> dict | None:
        """Fetch the latest state for a given thread/checkpoint ID."""
        thread_id = config["configurable"]["thread_id"]
        checkpoint_id = config["configurable"].get("checkpoint_id", "default")

        stmt = select(self.table.c.checkpoint_data).where(
            self.table.c.id == f"{thread_id}:{checkpoint_id}"
        )

        with self.engine.begin() as conn:
            result = conn.execute(stmt).fetchone()
            if result:
                return json.loads(result[0])
        return None

    async def adelete(self, config: dict) -> None:
        """Delete all checkpoints for a given thread_id."""
        thread_id = config["configurable"]["thread_id"]
        stmt = delete(self.table).where(self.table.c.thread_id == thread_id)

        with self.engine.begin() as conn:
            conn.execute(stmt)

    async def aget_state_history(self, config: dict) -> list[str]:
        """Return a list of available checkpoint IDs for a thread."""
        thread_id = config["configurable"]["thread_id"]
        stmt = (
            select(self.table.c.checkpoint_id)
            .where(self.table.c.thread_id == thread_id)
            .order_by(self.table.c.checkpoint_id)
        )

        with self.engine.begin() as conn:
            result = conn.execute(stmt).fetchall()
            return [row[0] for row in result]

    async def aget_tuple(self, config: dict) -> dict | None:
        thread_id = config["configurable"]["thread_id"]
        checkpoint_id = config["configurable"].get("checkpoint_id", "default")

        stmt = select(self.table.c.checkpoint_data, self.table.c.checkpoint_id).where(
            self.table.c.id == f"{thread_id}:{checkpoint_id}"
        )

        with self.engine.begin() as conn:
            result = conn.execute(stmt).fetchone()
            if result:
                state = json.loads(result[0])
                version = result[1]
                return {
                    "values": state,
                    "config": config,
                    "next": (),
                    "metadata": {},
                    "parent_config": None,
                    "tasks": (),
                    "created_at": None,
                    "checkpoint": version,
                }

        return None
