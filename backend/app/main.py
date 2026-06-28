from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from .database import get_db
from .utils import format_db_error
from .routers import auth_routes, produtos, pedidos, usuarios, logs, backups
app = FastAPI(
    title="E-Commerce Security API - Trabalho BD II",
    description="Backend dinâmico com suporte a simulação de Roles, Auditoria e Disaster Recovery.",
    version="3.0.0"
)

# Configurar CORS para permitir chamadas do frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(produtos.router)
app.include_router(pedidos.router)
app.include_router(usuarios.router)
app.include_router(logs.router)
app.include_router(backups.router)

@app.get("/")
def read_root():
    return {
        "status": "Backend dinâmico rodando!",
        "mensagem": "Trabalho BD II - UFES",
        "seguranca": "Conexões dinâmicas via Header X-DB-Role ativadas."
    }

@app.get("/db-status")
def db_status(db: Session = Depends(get_db)):
    """Retorna detalhes da conexão atual do banco de dados (provando o funcionamento da Role)."""
    try:
        user_info = db.execute(text("SELECT current_user, session_user;")).fetchone()
        version_info = db.execute(text("SELECT version();")).fetchone()
        
        tables_query = db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)).fetchall()
        tables = [row[0] for row in tables_query]
        
        return {
            "status_conexao": "OK",
            "usuario_banco_atual": user_info[0] if user_info else "desconhecido",
            "usuario_sessao": user_info[1] if user_info else "desconhecido",
            "postgres_version": version_info[0] if version_info else "desconhecido",
            "tabelas_acessiveis": tables
        }
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))