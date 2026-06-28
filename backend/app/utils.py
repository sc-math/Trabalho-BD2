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