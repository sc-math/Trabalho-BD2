from pydantic import BaseModel, Field
from decimal import Decimal
from typing import Optional
from datetime import datetime

# --- SCHEMAS DE PRODUTO ---

class ProdutoBase(BaseModel):
    nome: str = Field(..., max_length=150)
    descricao: Optional[str] = None
    preco: Decimal = Field(..., gt=0)
    estoque: int = Field(..., ge=0)
    categoria_id: Optional[int] = None

class ProdutoCreate(ProdutoBase):
    pass

class ProdutoUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=150)
    descricao: Optional[str] = None
    preco: Optional[Decimal] = Field(None, gt=0)
    estoque: Optional[int] = Field(None, ge=0)
    categoria_id: Optional[int] = None

class ProdutoResponse(ProdutoBase):
    id: int
    data_cadastro: datetime

    class Config:
        from_attributes = True