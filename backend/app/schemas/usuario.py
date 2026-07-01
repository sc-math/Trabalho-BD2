from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

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