from contextlib import asynccontextmanager

from database import connect_db, disconnect_db, setup_db
from fastapi import FastAPI
from routes.auth import router as auth_router
from routes.products import router as products_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await setup_db()
    yield
    await disconnect_db()


app = FastAPI(title="ACP App API", lifespan=lifespan)
app.include_router(auth_router, prefix="/api")
app.include_router(products_router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "ACP App API"}
