-- Script DML de Inserção de Dados (data.sql)
-- Trabalho de Banco de Dados II: "Implementação de Estratégias de Segurança e Recuperação"
-- Contexto: Loja Virtual

-- 1. INSERINDO CATEGORIAS
INSERT INTO categorias (nome, descricao) VALUES
('Eletrônicos', 'Dispositivos eletrônicos, smartphones, computadores e acessórios.'),
('Vestuário', 'Roupas masculinas, femininas e calçados.'),
('Livros', 'Livros físicos e e-books de diversas áreas do conhecimento.'),
('Casa e Decoração', 'Móveis, luminárias, itens de decoração e utilidades domésticas.'),
('Esportes', 'Artigos esportivos, vestuário fitness e equipamentos.');

-- 2. INSERINDO PRODUTOS
INSERT INTO produtos (categoria_id, nome, descricao, preco, estoque) VALUES
(1, 'Smartphone Galaxy S23', 'Smartphone Samsung Galaxy S23 256GB 5G Tela 6.1.', 4299.00, 45),
(1, 'Notebook Dell Inspiron', 'Notebook Dell Inspiron 15 Intel Core i5 8GB 512GB SSD.', 3799.00, 15),
(1, 'Fone de Ouvido Bluetooth JBL', 'Fone de Ouvido JBL Tune 510BT Bluetooth Preto.', 249.90, 80),
(2, 'Camiseta Básica Algodão', 'Camiseta básica masculina 100% algodão cor preta.', 49.90, 150),
(2, 'Calça Jeans Premium', 'Calça jeans masculina modelagem slim cor azul escuro.', 139.90, 90),
(3, 'Banco de Dados Prático', 'Livro sobre modelagem, SQL e otimização de bancos de dados relacionais.', 89.90, 40),
(3, 'O Programador Pragmático', 'Livro clássico sobre desenvolvimento profissional de software.', 120.00, 25),
(4, 'Luminária de Mesa LED', 'Luminária articulada com regulagem de brilho e temperatura de cor.', 79.90, 35),
(5, 'Bola de Futebol de Campo', 'Bola oficial de futebol de campo costurada à mão.', 99.90, 60);

-- 3. INSERINDO USUÁRIOS
-- Senhas: todos os usuários usam 'senha123' (hash bcrypt gerado pelo módulo auth.py da aplicação)
INSERT INTO usuarios (nome, email, senha_hash, funcao, ativo) VALUES
('Carlos Administrador', 'admin@lojavirtual.com', '$2b$12$imHHyylE1FSaAxuOR8fTmeoYAN9lmKxBsXhN2C9aO6fqHWS6gpHKm', 'administrador', true),
('Ana Suporte', 'suporte@lojavirtual.com', '$2b$12$/Tl2oADsA2pW0JO3iSq0butmaycfHg6RFhVNgU1T4HSWy9FVeduba', 'suporte', true),
('Bruno Cliente', 'bruno@cliente.com', '$2b$12$5tTca3j1WoajL7E.G9H6K.2vu7XNLQ1u6c3KcdLVKRVT/vEqO06Am', 'cliente', true),
('Julia Costa', 'julia@cliente.com', '$2b$12$OOvf.yutE9wDWuJMYS2Nfe.apTT3.nJMXLf8J1OGxeGAvz6wpHahK', 'cliente', true),
('Marcos Souza', 'marcos@cliente.com', '$2b$12$a4WEIiYpfNYDyVtKmU4Re.RaAEJ7LDojQh03Nm6KKWB7BXh3Fulbe', 'cliente', false); -- Usuário inativo para testes de segurança

-- 4. INSERINDO PEDIDOS
INSERT INTO pedidos (usuario_id, status, total) VALUES
(3, 'pago', 4548.90),    -- Pedido 1
(4, 'pendente', 209.80), -- Pedido 2
(3, 'enviado', 229.80);   -- Pedido 3

-- 5. INSERINDO ITENS DE PEDIDO
-- Pedido 1 (Bruno): 1 Smartphone Galaxy S23 (4299.00) + 1 Fone de Ouvido JBL (249.90) = 4548.90
INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES
(1, 1, 1, 4299.00),
(1, 3, 1, 249.90);

-- Pedido 2 (Julia): 1 Livro Banco de Dados Prático (89.90) + 1 Livro O Programador Pragmático (120.00) = 209.80
INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES
(2, 6, 1, 89.90),
(2, 7, 1, 120.00);

-- Pedido 3 (Bruno): 2 Camisetas Básicas (49.90 cada) + 1 Calça Jeans (139.90) = 239.70 (Ajustado no total do pedido para 229.80 com cupom/desconto simulado, ou itens exatos)
-- Vamos ajustar o total do pedido para bater com a soma exata: 2 * 49.90 + 139.90 = 239.70
UPDATE pedidos SET total = 239.70 WHERE id = 3;
INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES
(3, 4, 2, 49.90),
(3, 5, 1, 139.90);

-- 6. INSERINDO LOGS DE AUDITORIA INICIAIS (Segurança)
INSERT INTO logs_auditoria (usuario_id, evento, tabela_afetada, detalhes, ip_origem) VALUES
(1, 'SISTEMA_INICIALIZADO', 'sistema', 'Banco de dados populado e sistema de e-commerce pronto.', '127.0.0.1'),
(1, 'LOGIN_SUCESSO', 'usuarios', 'Administrador Carlos realizou login no painel administrativo.', '192.168.1.10'),
(3, 'LOGIN_SUCESSO', 'usuarios', 'Cliente Bruno realizou login.', '192.168.1.15'),
(5, 'LOGIN_BLOQUEADO', 'usuarios', 'Tentativa de login falhou. Usuário Marcos Souza está inativo.', '192.168.1.20');

-- 7. TESTANDO O TRIGGER DE AUDITORIA AUTOMÁTICA
-- Atualizando preço e estoque de um produto para disparar o trigger e registrar o log automaticamente
UPDATE produtos SET preco = 4199.00, estoque = 40 WHERE id = 1;
UPDATE produtos SET preco = 3699.00, estoque = 10 WHERE id = 2;
