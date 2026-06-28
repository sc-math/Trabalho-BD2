from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import schemas, crud, auth, models

router = APIRouter(tags=["Autenticação"])

# --- LOGIN ---
@router.post("/auth/login", response_model=schemas.Token)
def login(dados: schemas.LoginRequest, db: Session = Depends(get_db)):
    usuario = crud.get_usuario_by_email(db, dados.email)

    if usuario is None or not auth.verify_password(dados.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos.")

    if not usuario.ativo:
        raise HTTPException(status_code=403, detail="Usuário inativo. Acesso bloqueado.")

    token = auth.create_access_token({
        "sub": str(usuario.id),
        "email": usuario.email,
        "funcao": usuario.funcao,
    })

    return schemas.Token(access_token=token, funcao=usuario.funcao, nome=usuario.nome)

@router.get("/auth/me")
def get_me(usuario_atual: models.Usuario = Depends(auth.get_current_user)):
    return {"id": usuario_atual.id, "email": usuario_atual.email, "funcao": usuario_atual.funcao}
