# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT


import logging


from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Routes from API folders
from src.api.api_register_user import router as register_user_router
from src.api.api_generate_token import user_generate_token_router
from src.api.api_get_current_user import current_user_router
from src.api.api_verify_user import verify_user_router
from src.api.api_report import report_router
from src.api.chat import chat_router
from src.api import tts, podcast, ppt, prose, mcp
import src.db as db  # Import the db module to ensure database initialization

logger = logging.getLogger(__name__)

app = FastAPI(
    title="DeerFlow API",
    description="API for Deer",
    version="0.1.0",
)

app.include_router(register_user_router)
app.include_router(user_generate_token_router)
app.include_router(current_user_router)
app.include_router(verify_user_router)
app.include_router(chat_router)
app.include_router(tts.router)
app.include_router(podcast.router)
app.include_router(ppt.router)
app.include_router(prose.router)
app.include_router(mcp.router)
app.include_router(report_router)


@app.on_event("startup")
async def startup_event():
    logger.info("Initializing database...")
    db.init_db()
    logger.info("Database initialized.")


# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)
