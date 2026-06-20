from sqlalchemy.orm import Session
from . import models, schemas
from fastapi import HTTPException
from decimal import Decimal

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


# --- OPERAÇÕES CRUD DE PEDIDO ---
def get_pedido(db: Session, pedido_id: int):
    return db.query(models.Pedido).filter(models.Pedido.id == pedido_id).first()

def get_pedidos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Pedido).offset(skip).limit(limit).all()

def create_pedido(db: Session, pedido_data: schemas.PedidoCreate):
    # Validar se o usuário existe
    db_usuario = db.query(models.Usuario).filter(models.Usuario.id == pedido_data.usuario_id).first()
    if not db_usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    if not db_usuario.ativo:
        raise HTTPException(status_code=400, detail="Usuário inativo não pode realizar pedidos")

    # Criar cabeçalho do pedido
    db_pedido = models.Pedido(
        usuario_id=pedido_data.usuario_id,
        status="pendente",
        total=Decimal('0.00')
    )
    db.add(db_pedido)
    db.flush() # Gera o ID do pedido antes de commitar

    total_acumulado = Decimal('0.00')
    
    # Processar itens e verificar estoque
    for item in pedido_data.itens:
        # Obter produto
        db_produto = db.query(models.Produto).filter(models.Produto.id == item.produto_id).first()
        if not db_produto:
            raise HTTPException(status_code=404, detail=f"Produto ID {item.produto_id} não encontrado")
            
        # Verificar estoque
        if db_produto.estoque < item.quantidade:
            raise HTTPException(
                status_code=400, 
                detail=f"Estoque insuficiente para o produto '{db_produto.nome}'. Disponível: {db_produto.estoque}, Solicitado: {item.quantidade}"
            )
            
        # Reduzir estoque do produto (disparará o trigger de auditoria no Postgres!)
        db_produto.estoque -= item.quantidade
        
        # Calcular preço (usa o preço real do banco para evitar fraudes do client-side)
        preco_item = db_produto.preco * item.quantidade
        total_acumulado += preco_item
        
        # Adicionar o item do pedido
        db_item = models.ItemPedido(
            pedido_id=db_pedido.id,
            produto_id=item.produto_id,
            quantidade=item.quantidade,
            preco_unitario=db_produto.preco
        )
        db.add(db_item)

    db_pedido.total = total_acumulado
    db.commit()
    db.refresh(db_pedido)
    return db_pedido


# --- OPERAÇÕES CRUD DE LOGS ---
def get_logs_auditoria(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.LogAuditoria).order_by(models.LogAuditoria.data_evento.desc()).offset(skip).limit(limit).all()


# --- OPERAÇÕES CRUD DE USUÁRIO ---
import hashlib

def get_usuarios(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Usuario).offset(skip).limit(limit).all()

def create_usuario(db: Session, usuario: schemas.UsuarioCreate):
    pwd_hash = hashlib.sha256(usuario.senha_raw.encode('utf-8')).hexdigest()
    db_usuario = models.Usuario(
        nome=usuario.nome,
        email=usuario.email,
        senha_hash=pwd_hash,
        funcao=usuario.funcao,
        ativo=usuario.ativo
    )
    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)
    return db_usuario

