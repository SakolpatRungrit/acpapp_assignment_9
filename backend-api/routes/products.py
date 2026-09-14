from datetime import datetime
from typing import Optional

from database import database
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter()


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    stock: int


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None


class ProductResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    stock: int
    created_at: Optional[datetime] = None


def format_product_row(row):
    """
    Convert a database row into a plain dict, coercing `price` to float
    since asyncpg returns NUMERIC columns as Decimal, which is not
    JSON-serializable by default.
    """
    product = dict(row)
    product["price"] = float(product["price"])
    return product


@router.get("/products", response_model=list[ProductResponse])
async def list_products():
    rows = await database.fetch_all(
        "SELECT id, name, description, price, stock, created_at "
        "FROM products ORDER BY id ASC"
    )
    return [format_product_row(row) for row in rows]


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int):
    row = await database.fetch_one(
        "SELECT id, name, description, price, stock, created_at "
        "FROM products WHERE id = :id",
        {"id": product_id},
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )
    return format_product_row(row)


@router.post(
    "/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED
)
async def create_product(payload: ProductCreate):
    row = await database.fetch_one(
        """
        INSERT INTO products (name, description, price, stock)
        VALUES (:name, :description, :price, :stock)
        RETURNING id, name, description, price, stock, created_at
        """,
        payload.dict(),
    )
    return format_product_row(row)


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(product_id: int, payload: ProductUpdate):
    updates = {
        key: value
        for key, value in payload.dict(exclude_unset=True).items()
        if value is not None
    }

    if not updates:
        row = await database.fetch_one(
            "SELECT id, name, description, price, stock, created_at "
            "FROM products WHERE id = :id",
            {"id": product_id},
        )
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
            )
        return format_product_row(row)

    set_clause = ", ".join(f"{field} = :{field}" for field in updates)
    values = {**updates, "id": product_id}

    row = await database.fetch_one(
        f"""
        UPDATE products
        SET {set_clause}
        WHERE id = :id
        RETURNING id, name, description, price, stock, created_at
        """,
        values,
    )

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    return format_product_row(row)


@router.delete("/products/{product_id}")
async def delete_product(product_id: int):
    row = await database.fetch_one(
        "DELETE FROM products WHERE id = :id RETURNING id",
        {"id": product_id},
    )
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )
    return {"message": "Product deleted successfully", "id": product_id}


@router.post("/products/{product_id}/buy", response_model=ProductResponse)
async def buy_product(product_id: int):
    product = await database.fetch_one(
        "SELECT id, name, description, price, stock, created_at "
        "FROM products WHERE id = :id",
        {"id": product_id},
    )
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
        )

    if product["stock"] <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Product out of stock"
        )

    updated_row = await database.fetch_one(
        """
        UPDATE products
        SET stock = stock - 1
        WHERE id = :id
        RETURNING id, name, description, price, stock, created_at
        """,
        {"id": product_id},
    )

    return format_product_row(updated_row)
