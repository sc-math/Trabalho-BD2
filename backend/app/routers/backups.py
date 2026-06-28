from fastapi import APIRouter, Depends, HTTPException
from typing import List
import os
import subprocess
import datetime
from .. import auth, models

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
        usuario_atual: models.Usuario = Depends(auth.require_role("administrador")),
):
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


@router.post("/backups/restore")
def trigger_restore(
        filename: str,
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
