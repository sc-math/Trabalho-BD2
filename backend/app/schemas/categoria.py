from pydantic import BaseModel
from typing import Optional
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