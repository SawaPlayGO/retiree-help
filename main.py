from contextlib import asynccontextmanager

from fastapi import FastAPI
import uvicorn
from src.config import settings
from src.routers import auth_router
from src.routers import user_router
from src.routers import order_router
from src.database import db_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI"""
    if settings.database_url == "None":
        raise RuntimeError(
            "DATABASE_URL is not set. Please set it in the environment variables."
        )
    db_manager.init_db()
    yield


app = FastAPI(
    title="Retiree Help API",
    description="API for managing help orders between retirees",
    version="0.0.1",
    lifespan=lifespan,
)

app.include_router(auth_router.router)
app.include_router(user_router.router)
app.include_router(order_router.router)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
