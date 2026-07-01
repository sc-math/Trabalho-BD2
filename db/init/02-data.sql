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
-- Senhas fictícias com hash bcrypt simulado (exemplo: 'senha123')
INSERT INTO usuarios (nome, email, senha_hash, funcao, ativo) VALUES
('Carlos Administrador', 'admin@lojavirtual.com', '$2b$12$uMMNyQRSOytcsCeBpX0uQeM9GRLXSjQHOsA2qEzI266drvYy3xtWS', 'administrador', true),
('Ana Suporte', 'suporte@lojavirtual.com', '$2b$12$g25/Oobq3lM0Kq6yTZP2eu29apevF7vgR52dW4biTzdUVCsPrhA0S', 'suporte', true),
('Bruno Cliente', 'bruno@cliente.com', '$2b$12$Nk5Lp3mUSJElIUDgORwpWesgj.6iZMuRdoMGLmPPg7xVLAiG9pKUW', 'cliente', true),
('Julia Costa', 'julia@cliente.com', '$2b$12$sj2AAqn20CiynyhShwUxOeEUEEaTeie5W4Y3MMc/oPmmPTC6.6wB6', 'cliente', true),
('Marcos Souza', 'marcos@cliente.com', '$2b$12$Fo4EhHd3nRHbDKo5k0lBteFNvnf6wPS0cZzvZC48gPs3Rwi.kXfyC', 'cliente', false); -- Usuário inativo para testes de segurança

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
