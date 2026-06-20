from pydantic import BaseModel, Field
from decimal import Decimal
from typing import List, Optional
from datetime import datetime

# --- SCHEMAS DE CATEGORIA (AUXILIAR) ---
class CategoriaBase(BaseModel):
    nome: str
    descricao: Optional[str] = None

class CategoriaResponse(CategoriaBase):
    id: int
    data_criacao: datetime

    class Config:
        from_attributes = True

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

# --- SCHEMAS DE LOG DE AUDITORIA ---
class LogAuditoriaResponse(BaseModel):
    id: int
    usuario_id: Optional[int]
    evento: str
    tabela_afetada: str
    dados_antigos: Optional[dict] = None
    dados_novos: Optional[dict] = None
    detalhes: Optional[str] = None
    ip_origem: Optional[str] = None
    data_evento: datetime

    class Config:
        from_attributes = True

# --- SCHEMAS DE USUÁRIO ---
class UsuarioBase(BaseModel):
    nome: str = Field(..., max_length=150)
    email: str = Field(..., max_length=150)
    funcao: str = Field(default="cliente")
    ativo: bool = Field(default=True)

class UsuarioCreate(UsuarioBase):
    senha_raw: str = Field(..., min_length=6)

class UsuarioResponse(UsuarioBase):
    id: int
    data_criacao: datetime

    class Config:
        from_attributes = True

