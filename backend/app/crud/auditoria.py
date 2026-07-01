from sqlalchemy.orm import Session
from .. import models


# --- OPERAÇÕES CRUD DE LOGS ---
def get_logs_auditoria(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.LogAuditoria).order_by(models.LogAuditoria.data_evento.desc()).offset(skip).limit(limit).all()

def create_log(db: Session, evento: str, tabela_afetada: str, usuario_id: int = None,
                detalhes: str = None, ip_origem: str = None):
    """
    Insere uma linha de log manualmente, a partir do FastAPI.

    Complementa (não substitui) a trigger do Postgres: a trigger sabe
    capturar o ANTES/DEPOIS de uma linha automaticamente (dados_antigos/
    dados_novos), mas não sabe quem é o usuário da aplicação nem o IP de
    origem — essas duas informações só existem aqui, na camada do FastAPI,
    onde o JWT já foi decodificado.
    """
    db_log = models.LogAuditoria(
        usuario_id=usuario_id,
        evento=evento,
        tabela_afetada=tabela_afetada,
        detalhes=detalhes,
        ip_origem=ip_origem,
    )
    db.add(db_log)
    db.commit()