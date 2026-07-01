from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import schemas, crud, auth, models
from ..utils import format_db_error

router = APIRouter(tags=["Auditoria"])

# --- LOGS DE AUDITORIA DE SEGURANÇA ---
@router.get("/logs", response_model=List[schemas.LogAuditoriaResponse])
def read_logs(
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db),
        usuario_atual: models.Usuario = Depends(auth.require_role("administrador", "suporte")),
):
    try:
        return crud.get_logs_auditoria(db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))