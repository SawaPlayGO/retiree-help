from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from src.backend.config import settings
from src.backend.routers import auth_router
from src.backend.routers import user_router
from src.backend.routers import order_router
from src.backend.routers import bid_router
from src.backend.routers import image_router
from src.backend.database import db_manager, s3_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI"""
    if settings.database_url == "None":
        raise RuntimeError(
            "DATABASE_URL is not set. Please set it in the environment variables."
        )
    db_manager.init_db()
    s3_manager.init_bucket()
    yield


app = FastAPI(
    title="Retiree Help API",
    description="API for managing help orders between retirees",
    version="0.0.1",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(user_router.router)
app.include_router(order_router.router)
app.include_router(bid_router.router)
app.include_router(image_router.router)

if __name__ == "__main__":
    uvicorn.run("src.backend.main:app", host="0.0.0.0", port=8000, reload=True)
