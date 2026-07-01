from pydantic import BaseModel

## --- SCHEMAS DE AUTENTICAÇÃO (JWT) ---
class LoginRequest(BaseModel):
    email: str
    senha: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    funcao: str
    nome: str