from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.index import router as api_router
import os

app = FastAPI()

# Add CORS middleware globally
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Change to your frontend URL if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
