#!/bin/bash
# Script de Backup Completo do Cluster - Trabalho de Banco de Dados II
# Foco: Backup de todas as bases, roles, privilégios e estruturas globais (.sql.gz)

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0;0m'

BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backup_total_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="db_loja"
DB_USER="postgres"

# Garantir diretório de backups
mkdir -p "$BACKUP_DIR"

echo "Iniciando backup completo do cluster PostgreSQL (incluindo Roles, Privilégios e limpeza)..."

# 1. Executa o pg_dumpall com -c (clean) e comprime para gzip dentro do container (evita corrupção por redirection do host Windows)
docker exec -t ${CONTAINER_NAME} sh -c "pg_dumpall -c -U ${DB_USER} | gzip > /tmp/backup_total.sql.gz"

# 2. Copia o arquivo comprimido íntegro do container para a máquina host
docker cp "${CONTAINER_NAME}:/tmp/backup_total.sql.gz" "${BACKUP_FILE}"

# 3. Limpa o arquivo temporário no container
docker exec -t ${CONTAINER_NAME} rm /tmp/backup_total.sql.gz

if [ $? -eq 0 ] && [ -f "${BACKUP_FILE}" ]; then
    echo -e "${GREEN}===================================================${NC}"
    echo -e "${GREEN}SUCESSO: Backup completo do cluster concluído!${NC}"
    echo -e "Arquivo gerado: ${BACKUP_FILE}"
    echo -e "Tamanho: $(du -sh ${BACKUP_FILE} | cut -f1)"
    echo -e "Nota: Este backup contém a definição de Roles (role_admin, role_funcionario) e usuários."
    echo -e "${GREEN}===================================================${NC}"
else
    echo -e "${RED}===================================================${NC}"
    echo -e "${RED}ERRO: Falha ao gerar o backup do cluster com pg_dumpall.${NC}"
    echo -e "${RED}===================================================${NC}"
    exit 1
fi
