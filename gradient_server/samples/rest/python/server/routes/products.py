import json
from fastapi import APIRouter, Query
from pathlib import Path
from typing import List

router = APIRouter()

PRODUCTS_PATH = Path(__file__).parent.parent / "data" / "products.json"

@router.get("/products", summary="List products", response_model=List[dict])
async def list_products(q: str = Query(None, description="Search query")):
    """Return a filtered list of products matching the query (if provided)."""
    with PRODUCTS_PATH.open() as f:
        products = json.load(f)
    if q:
        products = [p for p in products if q.lower() in p.get("name", "").lower()]
    return products
