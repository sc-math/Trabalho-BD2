from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import schemas, crud, auth, models
from ..utils import format_db_error

router = APIRouter(tags=["Pedidos"])

# --- CRUD DE PEDIDOS ---
@router.get("/pedidos", response_model=List[schemas.PedidoResponse])
def read_pedidos(
        skip: int = 0,
        limit: int = 100,
        db: Session = Depends(get_db),
        usuario_atual: models.Usuario = Depends(auth.require_role("administrador", "suporte")),
):
    try:
        return crud.get_pedidos(db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))

@router.post("/pedidos", response_model=schemas.PedidoResponse, status_code=status.HTTP_201_CREATED)
def create_pedido(
        pedido: schemas.PedidoCreate,
        request: Request,
        db: Session = Depends(get_db),
        usuario_atual: models.Usuario = Depends(auth.get_current_user),
):
    if usuario_atual.funcao == "cliente" and pedido.usuario_id != usuario_atual.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clientes só podem registrar pedidos em nome de si mesmos.",
        )
    try:
        novo_pedido = crud.create_pedido(db=db, pedido_data=pedido)
        crud.create_log(
            db,
            evento="INSERT",
            tabela_afetada="pedidos",
            usuario_id=usuario_atual.id,
            detalhes=f"Pedido #{novo_pedido.id} registrado por {usuario_atual.email} (total: R$ {novo_pedido.total}).",
            ip_origem=request.client.host,
        )
        return novo_pedido
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=403, detail=format_db_error(e))
