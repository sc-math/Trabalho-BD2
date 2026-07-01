import bcrypt
import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from . import models
from .database import get_db

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY não está definida. Configure no .env antes de iniciar a aplicação."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

def hash_password(senha_raw: str) -> str:
    senha_bytes = senha_raw.encode("utf-8")
    salt = bcrypt.gensalt()
    hash_bytes = bcrypt.hashpw(senha_bytes, salt)
    return hash_bytes.decode("utf-8")

def verify_password(senha_raw: str, senha_hash: str) -> bool:
    try:
        return bcrypt.checkpw(senha_raw.encode("utf-8"), senha_hash.encode("utf-8"))
    except (ValueError, AttributeError):
        return False        # Hash em formato incompatível

def create_access_token(dados: dict) -> str:
    payload = dados.copy()
    expira_em = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload["exp"] = expira_em
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(
        token: str = Depends(oauth2_scheme),
        db: Session = Depends(get_db),
) -> models.Usuario:
    try:
        payload = decode_access_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")

    usuario_id = payload.get("sub")
    usuario = db.query(models.Usuario).filter(models.Usuario.id == int(usuario_id)).first()

    if usuario is None:
        raise HTTPException(status_code=401, detail="Usuário do token não existe mais.")
    if not usuario.ativo:
        raise HTTPException(status_code=403, detail="Usuário inativo. Acesso bloqueado.")

    return usuario

def require_role(*papeis_permitidos: str):
    def checker(usuario: models.Usuario = Depends(get_current_user)) -> models.Usuario:
        if usuario.funcao not in papeis_permitidos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Papel '{usuario.funcao}' não tem permissão para esta operação.",
            )
        return usuario
    return checker

if __name__ == "__main__":
    h1 = hash_password("senha123")
    h2 = hash_password("senha123")
    print("hash 1:", h1)
    print("hash 2:", h2)
    print("são iguais?", h1==h2)
    print("verify correta:", verify_password("senha123", h1))
    print("verify errada:", verify_password("outra123", h1))

    print("\n--- Testando JWT ---")
    token = create_access_token({"sub": "1", "email": "admin@lojavirtual.com", "funcao": "administrador"})
    print("token gerado:", token)

    payload = decode_access_token(token)
    print("payload decodificado:", payload)

    token_adulterado = token[:-5] + "AAAAA"
    try:
        decode_access_token(token_adulterado)
        print("ATENÇÃO: token adulterado foi aceito (bug!)")
    except JWTError as e:
        print("token adulterado rejeitado corretamente:", e)


