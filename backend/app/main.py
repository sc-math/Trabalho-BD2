from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
import os
import subprocess
import datetime
from .database import get_db
from . import schemas, crud

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

# Handler utilitário para capturar e encapsular exceções do SQLAlchemy/Postgres
def format_db_error(e: Exception) -> str:
    err_str = str(e)
    # Tenta extrair a mensagem de erro limpa do Postgres
    if "permission denied" in err_str.lower():
        return "ERRO POSTGRESQL (42501): Permissão Negada (Permission Denied) para esta operação."
    if "foreign key constraint" in err_str.lower():
        return "ERRO POSTGRESQL (23503): Violação de Chave Estrangeira. Ação de integridade referencial bloqueada."
    if "unique constraint" in err_str.lower():
        return "ERRO POSTGRESQL (23505): Violação de Unicidade. Este registro (e-mail/nome) já existe no banco."
    if "chk_preco" in err_str.lower():
        return "ERRO POSTGRESQL: Restrição CHECK violada. O preço do produto deve ser estritamente maior que zero."
    if "chk_quantidade" in err_str.lower():
        return "ERRO POSTGRESQL: Restrição CHECK violada. A quantidade do item deve ser maior que zero."
    if "chk_preco_unitario" in err_str.lower():
        return "ERRO POSTGRESQL: Restrição CHECK violada. O preço unitário do item deve ser maior que zero."
    return f"ERRO BANCO DE DADOS: {err_str}"

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

# --- CRUD DE PRODUTOS ---
@app.get("/produtos", response_model=List[schemas.ProdutoResponse])
def read_produtos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    try:
        return crud.get_produtos(db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))

@app.post("/produtos", response_model=schemas.ProdutoResponse, status_code=status.HTTP_201_CREATED)
def create_produto(produto: schemas.ProdutoCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_produto(db=db, produto=produto)
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))

@app.put("/produtos/{produto_id}", response_model=schemas.ProdutoResponse)
def update_produto(produto_id: int, produto: schemas.ProdutoUpdate, db: Session = Depends(get_db)):
    try:
        db_produto = crud.update_produto(db, produto_id=produto_id, produto=produto)
        if db_produto is None:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        return db_produto
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))

@app.delete("/produtos/{produto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_produto(produto_id: int, db: Session = Depends(get_db)):
    try:
        db_produto = crud.delete_produto(db, produto_id=produto_id)
        if db_produto is None:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        return None
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))

# --- CRUD DE PEDIDOS ---
@app.get("/pedidos", response_model=List[schemas.PedidoResponse])
def read_pedidos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    try:
        return crud.get_pedidos(db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))

@app.post("/pedidos", response_model=schemas.PedidoResponse, status_code=status.HTTP_201_CREATED)
def create_pedido(pedido: schemas.PedidoCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_pedido(db=db, pedido_data=pedido)
    except Exception as e:
        # Erros HTTP lançados diretamente pelo crud.py
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=403, detail=format_db_error(e))

# --- CRUD DE USUÁRIOS (REQUISITO DA PARTE 2/3) ---
@app.get("/usuarios", response_model=List[schemas.UsuarioResponse])
def read_usuarios(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    try:
        return crud.get_usuarios(db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))

@app.post("/usuarios", response_model=schemas.UsuarioResponse, status_code=status.HTTP_201_CREATED)
def create_usuario(usuario: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_usuario(db=db, usuario=usuario)
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))

# --- LOGS DE AUDITORIA DE SEGURANÇA ---
@app.get("/logs", response_model=List[schemas.LogAuditoriaResponse])
def read_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    try:
        return crud.get_logs_auditoria(db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=403, detail=format_db_error(e))

# =====================================================================
# ENDPOINTS ADMINISTRATIVOS DE DISASTER RECOVERY (BACKUP/RESTORE)
# =====================================================================

@app.get("/backups", response_model=List[str])
def list_backups():
    """Lista todos os arquivos de backup disponíveis no volume do host."""
    backup_dir = "/app/backups"
    if not os.path.exists(backup_dir):
        return []
    files = [f for f in os.listdir(backup_dir) if f.endswith(".dump") or f.endswith(".sql.gz")]
    return sorted(files, reverse=True)

@app.post("/backups/logical")
def trigger_logical_backup():
    """Gera um backup lógico comprimido (.dump) conectando diretamente no banco 'db'."""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_lojavirtual_{timestamp}.dump"
    filepath = f"/app/backups/{filename}"
    
    # Criar a pasta se não existir
    os.makedirs("/app/backups", exist_ok=True)
    
    pg_pass = os.getenv("POSTGRES_PASSWORD", "postgres_super_secure_pass_987")
    cmd = [
        "pg_dump",
        "-h", "db",
        "-U", "postgres",
        "-d", "lojavirtual",
        "-F", "c",
        "-f", filepath
    ]
    
    env = os.environ.copy()
    env["PGPASSWORD"] = pg_pass
    
    try:
        subprocess.run(cmd, env=env, capture_output=True, text=True, check=True)
        return {
            "status": "sucesso",
            "mensagem": f"Backup lógico individual '{filename}' gerado com sucesso!",
            "arquivo": filename,
            "tamanho_bytes": os.path.getsize(filepath) if os.path.exists(filepath) else 0
        }
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Erro no pg_dump: {e.stderr or e.stdout}")

@app.post("/backups/complete")
def trigger_complete_backup():
    """Gera um backup completo do cluster (.sql.gz) contendo as roles e usuários."""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_cluster_{timestamp}.sql.gz"
    filepath = f"/app/backups/{filename}"
    
    os.makedirs("/app/backups", exist_ok=True)
    
    pg_pass = os.getenv("POSTGRES_PASSWORD", "postgres_super_secure_pass_987")
    # sh -c é necessário para executar o pipe para gzip
    cmd = f"pg_dumpall -h db -U postgres | gzip > {filepath}"
    
    env = os.environ.copy()
    env["PGPASSWORD"] = pg_pass
    
    try:
        subprocess.run(cmd, env=env, shell=True, capture_output=True, text=True, check=True)
        return {
            "status": "sucesso",
            "mensagem": f"Backup completo do cluster '{filename}' gerado com sucesso!",
            "arquivo": filename,
            "tamanho_bytes": os.path.getsize(filepath) if os.path.exists(filepath) else 0
        }
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Erro no pg_dumpall: {e.stderr or e.stdout}")

@app.post("/backups/restore")
def trigger_restore(filename: str):
    """Executa a restauração lógica ou completa de banco de dados diretamente via rede."""
    filepath = f"/app/backups/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Arquivo de backup não encontrado.")
        
    pg_pass = os.getenv("POSTGRES_PASSWORD", "postgres_super_secure_pass_987")
    env = os.environ.copy()
    env["PGPASSWORD"] = pg_pass
    
    try:
        # Fechar conexões ativas antes de dropar
        terminate_cmd = [
            "psql", "-h", "db", "-U", "postgres", "-d", "postgres", "-c",
            "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'lojavirtual' AND pid <> pg_backend_pid();"
        ]
        subprocess.run(terminate_cmd, env=env, check=True, capture_output=True)
        
        if filename.endswith(".dump"):
            # Reconstruir base limpa
            drop_cmd = ["psql", "-h", "db", "-U", "postgres", "-d", "postgres", "-c", "DROP DATABASE IF EXISTS lojavirtual;"]
            create_cmd = ["psql", "-h", "db", "-U", "postgres", "-d", "postgres", "-c", "CREATE DATABASE lojavirtual;"]
            subprocess.run(drop_cmd, env=env, check=True, capture_output=True)
            subprocess.run(create_cmd, env=env, check=True, capture_output=True)
            
            # Restaurar pg_restore
            restore_cmd = [
                "pg_restore", "-h", "db", "-U", "postgres", "-d", "lojavirtual", filepath
            ]
            subprocess.run(restore_cmd, env=env, check=True, capture_output=True)
            
        elif filename.endswith(".sql.gz"):
            # Restaurar pg_dumpall
            restore_cmd = f"gunzip -c {filepath} | psql -h db -U postgres"
            subprocess.run(restore_cmd, env=env, shell=True, check=True, capture_output=True)
            
        else:
            raise HTTPException(status_code=400, detail="Formato de arquivo inválido. Use arquivos .dump ou .sql.gz")
            
        return {"status": "sucesso", "mensagem": f"Backup '{filename}' restaurado com total integridade!"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Erro de comando do Postgres: {e.stderr or e.stdout}")

@app.post("/db-status/drop")
def trigger_drop_db():
    """Simula uma queda catastrófica do banco (Cenário de Desastre 2) derrubando a base lojavirtual."""
    pg_pass = os.getenv("POSTGRES_PASSWORD", "postgres_super_secure_pass_987")
    env = os.environ.copy()
    env["PGPASSWORD"] = pg_pass
    
    try:
        # Terminar sessões e dropar
        terminate_cmd = [
            "psql", "-h", "db", "-U", "postgres", "-d", "postgres", "-c",
            "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'lojavirtual' AND pid <> pg_backend_pid();"
        ]
        subprocess.run(terminate_cmd, env=env, check=True, capture_output=True)
        
        drop_cmd = ["psql", "-h", "db", "-U", "postgres", "-d", "postgres", "-c", "DROP DATABASE IF EXISTS lojavirtual;"]
        subprocess.run(drop_cmd, env=env, check=True, capture_output=True)
        
        return {"status": "sucesso", "mensagem": "Banco de dados lojavirtual dropado com sucesso. Status de Desastre Simulado!"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao dropar banco: {e.stderr or e.stdout}")
