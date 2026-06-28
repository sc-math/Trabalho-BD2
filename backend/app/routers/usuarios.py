from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import schemas, crud, auth, models
from ..utils import format_db_error

router = APIRouter(tags=["Usuários"])

# --- CRUD DE USUÁRIOS (REQUISITO DA PARTE 2/3) ---
@router.get("/usuarios", response_model=List[schemas.UsuarioResponse])
def read_usuarios(
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db),
        usuario_atual: models.Usuario = Depends(auth.require_role("administrador", "suporte")),
):
    try:
        return crud.get_usuarios(db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))

@router.post("/usuarios", response_model=schemas.UsuarioResponse, status_code=status.HTTP_201_CREATED)
def create_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    usuario.funcao = "cliente"
    try:
        return crud.create_usuario(db=db, usuario=usuario)
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))

@router.post("/usuarios/staff", response_model=schemas.UsuarioResponse, status_code=status.HTTP_201_CREATED)
def create_usuario_staff(
        usuario: schemas.UsuarioCreate,
        db: Session = Depends(get_db),
        usuario_atual: models.Usuario = Depends(auth.require_role("administrador")),
):
    try:
        return crud.create_usuario(db=db, usuario=usuario)
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))