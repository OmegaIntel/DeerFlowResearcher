from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="OpenBB Backend API - Simplified"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "OpenBB Backend API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "backend"}

@app.get("/api/test")
def test_endpoint():
    return {
        "database": "AWS RDS MySQL",
        "cache": "Local Redis",
        "status": "operational"
    }