from pydantic import BaseModel, Field
from decimal import Decimal
from typing import List, Optional
from datetime import datetime

# --- SCHEMAS DE ITENS DE PEDIDO ---
class ItemPedidoBase(BaseModel):
    produto_id: int
    quantidade: int = Field(..., gt=0)
    preco_unitario: Decimal = Field(..., ge=0)

class ItemPedidoCreate(ItemPedidoBase):
    pass

class ItemPedidoResponse(ItemPedidoBase):
    id: int
    pedido_id: int

    class Config:
        from_attributes = True


# --- SCHEMAS DE PEDIDO ---
class PedidoBase(BaseModel):
    usuario_id: int
    status: str = Field(default="pendente")
    total: Decimal = Field(default=0.00, ge=0)

class PedidoCreate(BaseModel):
    usuario_id: int
    itens: List[ItemPedidoCreate]

class PedidoResponse(PedidoBase):
    id: int
    data_pedido: datetime
    itens: List[ItemPedidoResponse] = []

    class Config:
        from_attributes = True