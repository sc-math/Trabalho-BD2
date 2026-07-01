from sqlalchemy.orm import Session
from .. import models, schemas


# --- OPERAÇÕES CRUD DE PRODUTO ---
def get_produto(db: Session, produto_id: int):
    return db.query(models.Produto).filter(models.Produto.id == produto_id).first()


def get_produtos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Produto).offset(skip).limit(limit).all()


def create_produto(db: Session, produto: schemas.ProdutoCreate):
    db_produto = models.Produto(
        nome=produto.nome,
        descricao=produto.descricao,
        preco=produto.preco,
        estoque=produto.estoque,
        categoria_id=produto.categoria_id
    )
    db.add(db_produto)
    db.commit()
    db.refresh(db_produto)
    return db_produto


def update_produto(db: Session, produto_id: int, produto: schemas.ProdutoUpdate):
    db_produto = get_produto(db, produto_id)
    if not db_produto:
        return None

    # Atualizar apenas campos fornecidos
    update_data = produto.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_produto, key, value)

    db.commit()
    db.refresh(db_produto)
    return db_produto


def delete_produto(db: Session, produto_id: int):
    db_produto = get_produto(db, produto_id)
    if not db_produto:
        return None
    db.delete(db_produto)
    db.commit()
    return db_produto