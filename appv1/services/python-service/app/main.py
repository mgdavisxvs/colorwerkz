from fastapi import FastAPI
from .api import color_transfer, training

app = FastAPI(title="ColorWerkz Python Service", version="0.1.0")

@app.get("/health")
def health():
    return {"ok": True}

# Include routers (placeholders)
app.include_router(color_transfer.router)
app.include_router(training.router)
