from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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
