from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
import os
import subprocess
import datetime
from ..database import get_db
from .. import auth, models, crud

router = APIRouter(tags=["Disaster Recovery"])


# =====================================================================
# ENDPOINTS ADMINISTRATIVOS DE DISASTER RECOVERY (BACKUP/RESTORE)
# =====================================================================

@router.get("/backups", response_model=List[str])
def list_backups(
        usuario_atual: models.Usuario = Depends(auth.require_role("administrador")),
):
    """Lista todos os arquivos de backup disponíveis no volume do host."""
    backup_dir = "/app/backups"
    if not os.path.exists(backup_dir):
        return []
    files = [f for f in os.listdir(backup_dir) if f.endswith(".dump") or f.endswith(".sql.gz")]
    return sorted(files, reverse=True)


@router.post("/backups/logical")
def trigger_logical_backup(
        request: Request,
        db: Session = Depends(get_db),
        usuario_atual: models.Usuario = Depends(auth.require_role("administrador")),
):
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
        crud.create_log(
            db, evento="BACKUP_LOGICO", tabela_afetada="sistema",
            usuario_id=usuario_atual.id,
            detalhes=f"Backup lógico '{filename}' gerado por {usuario_atual.email}.",
            ip_origem=request.client.host,
        )
        return {
            "status": "sucesso",
            "mensagem": f"Backup lógico individual '{filename}' gerado com sucesso!",
            "arquivo": filename,
            "tamanho_bytes": os.path.getsize(filepath) if os.path.exists(filepath) else 0
        }
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Erro no pg_dump: {e.stderr or e.stdout}")


@router.post("/backups/complete")
def trigger_complete_backup(
        request: Request,
        db: Session = Depends(get_db),
        usuario_atual: models.Usuario = Depends(auth.require_role("administrador")),
):
    """Gera um backup completo do cluster (.sql.gz) contendo as roles e usuários com limpeza (clean) no restore."""
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_total_{timestamp}.sql.gz"
    filepath = f"/app/backups/{filename}"

    os.makedirs("/app/backups", exist_ok=True)

    pg_pass = os.getenv("POSTGRES_PASSWORD", "postgres_super_secure_pass_987")
    # Adicionamos -c para limpar (drop) objetos antes de criar, garantindo integridade no restore
    cmd = f"pg_dumpall -c -h db -U postgres | gzip > {filepath}"

    env = os.environ.copy()
    env["PGPASSWORD"] = pg_pass

    try:
        subprocess.run(cmd, env=env, shell=True, capture_output=True, text=True, check=True)
        crud.create_log(
            db, evento="BACKUP_COMPLETO", tabela_afetada="sistema",
            usuario_id=usuario_atual.id,
            detalhes=f"Backup completo do cluster '{filename}' gerado por {usuario_atual.email}.",
            ip_origem=request.client.host,
        )
        return {
            "status": "sucesso",
            "mensagem": f"Backup total do cluster '{filename}' gerado com sucesso!",
            "arquivo": filename,
            "tamanho_bytes": os.path.getsize(filepath) if os.path.exists(filepath) else 0
        }
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Erro no pg_dumpall: {e.stderr or e.stdout}")


@router.post("/backups/restore")
def trigger_restore(
        filename: str,
        request: Request,
        db: Session = Depends(get_db),
        usuario_atual: models.Usuario = Depends(auth.require_role("administrador")),
):
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
            drop_cmd = ["psql", "-h", "db", "-U", "postgres", "-d", "postgres", "-c",
                        "DROP DATABASE IF EXISTS lojavirtual;"]
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

        crud.create_log(
            db, evento="RESTORE", tabela_afetada="sistema",
            usuario_id=usuario_atual.id,
            detalhes=f"Backup '{filename}' restaurado por {usuario_atual.email}.",
            ip_origem=request.client.host,
        )
        return {"status": "sucesso", "mensagem": f"Backup '{filename}' restaurado com total integridade!"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Erro de comando do Postgres: {e.stderr or e.stdout}")


@router.post("/db-status/drop")
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

        drop_cmd = ["psql", "-h", "db", "-U", "postgres", "-d", "postgres", "-c",
                    "DROP DATABASE IF EXISTS lojavirtual;"]
        subprocess.run(drop_cmd, env=env, check=True, capture_output=True)

        return {"status": "sucesso",
                "mensagem": "Banco de dados lojavirtual dropado com sucesso. Status de Desastre Simulado!"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao dropar banco: {e.stderr or e.stdout}")


@router.get("/backups/emergency/list", response_model=List[str])
def emergency_list_backups():
    """Lista todos os arquivos de backup sem precisar de banco de dados ativo ou autenticação."""
    backup_dir = "/app/backups"
    if not os.path.exists(backup_dir):
        return []
    files = [f for f in os.listdir(backup_dir) if f.endswith(".dump") or f.endswith(".sql.gz")]
    return sorted(files, reverse=True)


@router.post("/backups/emergency/restore")
def emergency_restore(
        filename: str,
        request: Request,
):
    """Restaura um backup mesmo com o banco offline/derrubado, sem get_db ou token JWT."""
    filepath = f"/app/backups/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Arquivo de backup não encontrado.")

    pg_pass = os.getenv("POSTGRES_PASSWORD", "postgres_super_secure_pass_987")
    env = os.environ.copy()
    env["PGPASSWORD"] = pg_pass

    try:
        # Fechar conexões ativas antes do drop/restauração
        terminate_cmd = [
            "psql", "-h", "db", "-U", "postgres", "-d", "postgres", "-c",
            "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'lojavirtual' AND pid <> pg_backend_pid();"
        ]
        subprocess.run(terminate_cmd, env=env, capture_output=True)

        if filename.endswith(".dump"):
            drop_cmd = ["psql", "-h", "db", "-U", "postgres", "-d", "postgres", "-c", "DROP DATABASE IF EXISTS lojavirtual;"]
            create_cmd = ["psql", "-h", "db", "-U", "postgres", "-d", "postgres", "-c", "CREATE DATABASE lojavirtual;"]
            subprocess.run(drop_cmd, env=env, check=True, capture_output=True)
            subprocess.run(create_cmd, env=env, check=True, capture_output=True)

            restore_cmd = [
                "pg_restore", "-h", "db", "-U", "postgres", "-d", "lojavirtual", filepath
            ]
            subprocess.run(restore_cmd, env=env, check=True, capture_output=True)

        elif filename.endswith(".sql.gz"):
            restore_cmd = f"gunzip -c {filepath} | psql -h db -U postgres"
            subprocess.run(restore_cmd, env=env, shell=True, check=True, capture_output=True)

        else:
            raise HTTPException(status_code=400, detail="Formato de arquivo inválido. Use .dump ou .sql.gz")

        return {"status": "sucesso", "mensagem": f"Backup '{filename}' restaurado com sucesso em modo de emergência!"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Erro de comando do Postgres: {e.stderr or e.stdout}")


@router.post("/backups/emergency/reset")
def emergency_reset(
        request: Request,
):
    """Recria o banco de dados 'lojavirtual' e roda os scripts de inicialização (schema, dados e security)."""
    pg_pass = os.getenv("POSTGRES_PASSWORD", "postgres_super_secure_pass_987")
    env = os.environ.copy()
    env["PGPASSWORD"] = pg_pass

    try:
        # Fechar conexões ativas
        terminate_cmd = [
            "psql", "-h", "db", "-U", "postgres", "-d", "postgres", "-c",
            "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'lojavirtual' AND pid <> pg_backend_pid();"
        ]
        subprocess.run(terminate_cmd, env=env, capture_output=True)

        # Drop e Create
        drop_cmd = ["psql", "-h", "db", "-U", "postgres", "-d", "postgres", "-c", "DROP DATABASE IF EXISTS lojavirtual;"]
        subprocess.run(drop_cmd, env=env, check=True, capture_output=True)

        create_cmd = ["psql", "-h", "db", "-U", "postgres", "-d", "postgres", "-c", "CREATE DATABASE lojavirtual;"]
        subprocess.run(create_cmd, env=env, check=True, capture_output=True)

        # Executar os scripts na ordem
        init_files = [
            "/app/db/init/01-schema.sql",
            "/app/db/init/02-data.sql",
            "/app/db/init/03-security.sql"
        ]

        for file_path in init_files:
            if not os.path.exists(file_path):
                raise HTTPException(status_code=500, detail=f"Script de inicialização não encontrado no container: {file_path}")
            
            cmd = ["psql", "-h", "db", "-U", "postgres", "-d", "lojavirtual", "-f", file_path]
            res = subprocess.run(cmd, env=env, capture_output=True, text=True)
            if res.returncode != 0:
                raise HTTPException(status_code=500, detail=f"Erro ao executar {file_path}: {res.stderr or res.stdout}")

        return {"status": "sucesso", "mensagem": "Banco de dados inicializado do zero com sucesso!"}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Erro ao reconstruir banco: {e.stderr or e.stdout}")

