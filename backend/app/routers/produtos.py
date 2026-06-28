from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import schemas, crud, auth, models
from ..utils import format_db_error

router = APIRouter(tags=["Produtos"])

# --- CRUD DE PRODUTOS ---
@router.get("/produtos", response_model=List[schemas.ProdutoResponse])
def read_produtos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    try:
        return crud.get_produtos(db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))

@router.post("/produtos", response_model=schemas.ProdutoResponse, status_code=status.HTTP_201_CREATED)
def create_produto(
        produto: schemas.ProdutoCreate,
        db: Session = Depends(get_db),
        usuario_atual: models.Usuario = Depends(auth.require_role("administrador", "suporte")),
):
    try:
        return crud.create_produto(db=db, produto=produto)
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))

@router.put("/produtos/{produto_id}", response_model=schemas.ProdutoResponse)
def update_produto(
        produto_id: int,
        produto: schemas.ProdutoUpdate,
        db: Session = Depends(get_db),
        usuario_atual: models.Usuario = Depends(auth.require_role("administrador", "suporte")),
):
    try:
        db_produto = crud.update_produto(db, produto_id=produto_id, produto=produto)
        if db_produto is None:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        return db_produto
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))

@router.delete("/produtos/{produto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_produto(
        produto_id: int,
        db: Session = Depends(get_db),
        usuario_atual: models.Usuario = Depends(auth.require_role("administrador")),
):
    try:
        db_produto = crud.delete_produto(db, produto_id=produto_id)
        if db_produto is None:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        return None
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))
