import React, { useState, useEffect } from 'react';

const BACKEND_URL = 'http://localhost:8000';

function App() {
    const [authUser, setAuthUser] = useState(null);
    const [authToken, setAuthToken] = useState(null);

    const [modo, setModo] = useState('login');

    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [nome, setNome] = useState('');

    const [erro, setErro] = useState(null);
    const [carregando, setCarregando] = useState(false);

    const [produtos, setProdutos] = useState([]);
    const [quantidades, setQuantidades] = useState({});

    const [carrinho, setCarrinho] = useState([]);
    const [carrinhoAberto, setCarrinhoAberto] = useState(false);
    const [finalizando, setFinalizando] = useState(false);
    const [mensagemPedido, setMensagemPedido] = useState(null);

    // --- Área de staff (suporte/administrador) ---
    const ehStaff = authUser && authUser.funcao !== 'cliente';
    const [painelStaff, setPainelStaff] = useState('nenhum'); // 'nenhum' | 'novoProduto' | 'todosPedidos'

    const [novoProduto, setNovoProduto] = useState({ nome: '', descricao: '', preco: '', estoque: '', categoria_id: '1' });
    const [mensagemStaff, setMensagemStaff] = useState(null);
    const [enviandoProduto, setEnviandoProduto] = useState(false);

    const [todosPedidos, setTodosPedidos] = useState([]);
    const [carregandoPedidos, setCarregandoPedidos] = useState(false);

    const buscarProdutos = async () => {
        try {
            const resp = await fetch(`${BACKEND_URL}/produtos`);
            const data = await resp.json();
            setProdutos(data);
        } catch (err) {
            console.error('Erro ao buscar produtos:', err);
        }
    };

    useEffect(() => {
        buscarProdutos();
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErro(null);
        setCarregando(true);
        try {
            const respLogin = await fetch(`${BACKEND_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha }),
            });
            const dataLogin = await respLogin.json();
            if (!respLogin.ok) {
                throw new Error(dataLogin.detail || 'Não foi possível entrar.');
            }

            const respMe = await fetch(`${BACKEND_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${dataLogin.access_token}` },
            });
            const dataMe = await respMe.json();

            setAuthToken(dataLogin.access_token);
            setAuthUser({ id: dataMe.id, nome: dataLogin.nome, funcao: dataLogin.funcao, email });
        } catch (err) {
            setErro(err.message);
        } finally {
            setCarregando(false);
        }
    };

    const handleCadastro = async (e) => {
        e.preventDefault();
        setErro(null);
        setCarregando(true);
        try {
            const resp = await fetch(`${BACKEND_URL}/usuarios`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, senha_raw: senha }),
            });
            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data.detail || 'Não foi possível cadastrar.');
            }
            setModo('login');
            setSenha('');
            alert(`Conta criada para ${data.nome}! Agora faça login.`);
        } catch (err) {
            setErro(err.message);
        } finally {
            setCarregando(false);
        }
    };

    const handleLogout = () => {
        setAuthUser(null);
        setAuthToken(null);
        setCarrinho([]);
        setCarrinhoAberto(false);
        setMensagemPedido(null);
        setPainelStaff('nenhum');
        setTodosPedidos([]);
    };

    const getQuantidade = (produtoId) => quantidades[produtoId] || 1;

    const handleQuantidadeChange = (produtoId, valor) => {
        setQuantidades({ ...quantidades, [produtoId]: valor });
    };

    const adicionarAoCarrinho = (produto) => {
        const quantidade = getQuantidade(produto.id);
        setCarrinho((atual) => {
            const existente = atual.find((item) => item.produto.id === produto.id);
            if (existente) {
                return atual.map((item) =>
                    item.produto.id === produto.id
                        ? { ...item, quantidade: item.quantidade + quantidade }
                        : item
                );
            }
            return [...atual, { produto, quantidade }];
        });
        setCarrinhoAberto(true);
    };

    const removerDoCarrinho = (produtoId) => {
        setCarrinho((atual) => atual.filter((item) => item.produto.id !== produtoId));
    };

    const totalCarrinho = carrinho.reduce(
        (soma, item) => soma + item.produto.preco * item.quantidade,
        0
    );

    const handleFinalizarPedido = async () => {
        setMensagemPedido(null);
        setFinalizando(true);
        try {
            const resp = await fetch(`${BACKEND_URL}/pedidos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    usuario_id: authUser.id,
                    itens: carrinho.map((item) => ({
                        produto_id: item.produto.id,
                        quantidade: item.quantidade,
                        preco_unitario: item.produto.preco,
                    })),
                }),
            });
            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data.detail || 'Não foi possível concluir o pedido.');
            }
            setMensagemPedido({ tipo: 'sucesso', texto: `Pedido #${data.id} registrado! Total: ${formatPreco(data.total)}` });
            setCarrinho([]);
            setCarrinhoAberto(false);
            buscarProdutos();
        } catch (err) {
            setMensagemPedido({ tipo: 'erro', texto: err.message });
        } finally {
            setFinalizando(false);
        }
    };

    // --- Funções exclusivas de staff (suporte/administrador) ---

    const handleCadastrarProduto = async (e) => {
        e.preventDefault();
        setMensagemStaff(null);
        setEnviandoProduto(true);
        try {
            const resp = await fetch(`${BACKEND_URL}/produtos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    nome: novoProduto.nome,
                    descricao: novoProduto.descricao,
                    preco: parseFloat(novoProduto.preco),
                    estoque: parseInt(novoProduto.estoque),
                    categoria_id: parseInt(novoProduto.categoria_id),
                }),
            });
            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data.detail || 'Não foi possível cadastrar o produto.');
            }
            setMensagemStaff({ tipo: 'sucesso', texto: `Produto "${data.nome}" cadastrado!` });
            setNovoProduto({ nome: '', descricao: '', preco: '', estoque: '', categoria_id: '1' });
            buscarProdutos();
        } catch (err) {
            setMensagemStaff({ tipo: 'erro', texto: err.message });
        } finally {
            setEnviandoProduto(false);
        }
    };

    const abrirTodosPedidos = async () => {
        setPainelStaff('todosPedidos');
        setCarregandoPedidos(true);
        try {
            const resp = await fetch(`${BACKEND_URL}/pedidos`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data.detail || 'Não foi possível carregar os pedidos.');
            }
            setTodosPedidos(data);
        } catch (err) {
            setMensagemStaff({ tipo: 'erro', texto: err.message });
        } finally {
            setCarregandoPedidos(false);
        }
    };

    const formatPreco = (valor) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

    const nomeDoProduto = (produtoId) => {
        const produto = produtos.find((p) => p.id === produtoId);
        return produto ? produto.nome : `Produto #${produtoId}`;
    };

    const totalItensCarrinho = carrinho.reduce((soma, item) => soma + item.quantidade, 0);

    return (
        <div style={estilos.pagina}>
            <header style={estilos.cabecalho}>
                <h1 style={estilos.titulo}>Loja Virtual</h1>

                {authUser ? (
                    <div style={estilos.areaUsuario}>
                        {!ehStaff && (
                            <button onClick={() => setCarrinhoAberto(!carrinhoAberto)} style={estilos.botaoCarrinho}>
                                🛒 Carrinho ({totalItensCarrinho})
                            </button>
                        )}
                        <span>Olá, {authUser.nome} ({authUser.funcao})</span>
                        <button onClick={handleLogout} style={estilos.botaoSair}>Sair</button>
                    </div>
                ) : (
                    <div style={estilos.areaLogin}>
                        <div style={estilos.abas}>
                            <button onClick={() => setModo('login')} style={modo === 'login' ? estilos.abaAtiva : estilos.aba}>
                                Entrar
                            </button>
                            <button onClick={() => setModo('cadastro')} style={modo === 'cadastro' ? estilos.abaAtiva : estilos.aba}>
                                Criar conta
                            </button>
                        </div>

                        {erro && <p style={estilos.erro}>{erro}</p>}

                        {modo === 'login' ? (
                            <form onSubmit={handleLogin} style={estilos.form}>
                                <input
                                    type="email"
                                    placeholder="E-mail"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    style={estilos.input}
                                />
                                <input
                                    type="password"
                                    placeholder="Senha"
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    required
                                    style={estilos.input}
                                />
                                <button type="submit" disabled={carregando} style={estilos.botao}>
                                    {carregando ? 'Entrando...' : 'Entrar'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleCadastro} style={estilos.form}>
                                <input
                                    type="text"
                                    placeholder="Nome completo"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    required
                                    style={estilos.input}
                                />
                                <input
                                    type="email"
                                    placeholder="E-mail"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    style={estilos.input}
                                />
                                <input
                                    type="password"
                                    placeholder="Senha (mínimo 6 caracteres)"
                                    value={senha}
                                    onChange={(e) => setSenha(e.target.value)}
                                    required
                                    minLength={6}
                                    style={estilos.input}
                                />
                                <button type="submit" disabled={carregando} style={estilos.botao}>
                                    {carregando ? 'Criando...' : 'Criar conta'}
                                </button>
                            </form>
                        )}
                    </div>
                )}
            </header>

            {!ehStaff && authUser && carrinhoAberto && (
                <div style={estilos.painelCarrinho}>
                    <h2 style={estilos.tituloSecao}>Seu Carrinho</h2>

                    {carrinho.length === 0 ? (
                        <p style={estilos.vazio}>Carrinho vazio.</p>
                    ) : (
                        <>
                            {carrinho.map((item) => (
                                <div key={item.produto.id} style={estilos.linhaCarrinho}>
                  <span style={estilos.linhaCarrinhoNome}>
                    {item.produto.nome} × {item.quantidade}
                  </span>
                                    <span>{formatPreco(item.produto.preco * item.quantidade)}</span>
                                    <button onClick={() => removerDoCarrinho(item.produto.id)} style={estilos.botaoRemover}>
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <div style={estilos.linhaTotal}>
                                <strong>Total: {formatPreco(totalCarrinho)}</strong>
                            </div>
                            <button onClick={handleFinalizarPedido} disabled={finalizando} style={estilos.botaoFinalizar}>
                                {finalizando ? 'Finalizando...' : 'Finalizar Pedido'}
                            </button>
                        </>
                    )}
                </div>
            )}

            {ehStaff && (
                <div style={estilos.painelStaff}>
                    <h2 style={estilos.tituloSecao}>Painel do Funcionário</h2>

                    <div style={estilos.abas}>
                        <button
                            onClick={() => setPainelStaff(painelStaff === 'novoProduto' ? 'nenhum' : 'novoProduto')}
                            style={painelStaff === 'novoProduto' ? estilos.abaAtiva : estilos.aba}
                        >
                            Cadastrar Produto
                        </button>
                        <button
                            onClick={() => (painelStaff === 'todosPedidos' ? setPainelStaff('nenhum') : abrirTodosPedidos())}
                            style={painelStaff === 'todosPedidos' ? estilos.abaAtiva : estilos.aba}
                        >
                            Ver Todos os Pedidos
                        </button>
                    </div>

                    {mensagemStaff && (
                        <p style={mensagemStaff.tipo === 'sucesso' ? estilos.sucesso : estilos.erro}>
                            {mensagemStaff.texto}
                        </p>
                    )}

                    {painelStaff === 'novoProduto' && (
                        <form onSubmit={handleCadastrarProduto} style={estilos.formStaff}>
                            <input
                                type="text"
                                placeholder="Nome do produto"
                                value={novoProduto.nome}
                                onChange={(e) => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                                required
                                style={estilos.input}
                            />
                            <input
                                type="text"
                                placeholder="Descrição"
                                value={novoProduto.descricao}
                                onChange={(e) => setNovoProduto({ ...novoProduto, descricao: e.target.value })}
                                style={estilos.input}
                            />
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Preço"
                                value={novoProduto.preco}
                                onChange={(e) => setNovoProduto({ ...novoProduto, preco: e.target.value })}
                                required
                                style={estilos.input}
                            />
                            <input
                                type="number"
                                placeholder="Estoque"
                                value={novoProduto.estoque}
                                onChange={(e) => setNovoProduto({ ...novoProduto, estoque: e.target.value })}
                                required
                                style={estilos.input}
                            />
                            <button type="submit" disabled={enviandoProduto} style={estilos.botao}>
                                {enviandoProduto ? 'Cadastrando...' : 'Cadastrar Produto'}
                            </button>
                        </form>
                    )}

                    {painelStaff === 'todosPedidos' && (
                        <div>
                            {carregandoPedidos ? (
                                <p style={estilos.vazio}>Carregando pedidos...</p>
                            ) : todosPedidos.length === 0 ? (
                                <p style={estilos.vazio}>Nenhum pedido registrado ainda.</p>
                            ) : (
                                todosPedidos.map((pedido) => (
                                    <div key={pedido.id} style={estilos.cardPedido}>
                                        <div style={estilos.linhaCarrinho}>
                                            <strong>Pedido #{pedido.id}</strong>
                                            <span>Cliente ID: {pedido.usuario_id}</span>
                                            <span>Status: {pedido.status}</span>
                                            <strong>{formatPreco(pedido.total)}</strong>
                                        </div>
                                        {pedido.itens.map((item) => (
                                            <p key={item.id} style={estilos.itemPedido}>
                                                {nomeDoProduto(item.produto_id)} — {item.quantidade}x {formatPreco(item.preco_unitario)}
                                            </p>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            <main style={estilos.main}>
                <h2 style={estilos.tituloSecao}>Catálogo de Produtos</h2>

                {!ehStaff && mensagemPedido && (
                    <p style={mensagemPedido.tipo === 'sucesso' ? estilos.sucesso : estilos.erro}>
                        {mensagemPedido.texto}
                    </p>
                )}

                {produtos.length === 0 ? (
                    <p style={estilos.vazio}>Nenhum produto encontrado (ou o backend ainda não respondeu).</p>
                ) : (
                    <div style={estilos.grade}>
                        {produtos.map((produto) => (
                            <div key={produto.id} style={estilos.cardProduto}>
                                <h3 style={estilos.nomeProduto}>{produto.nome}</h3>
                                <p style={estilos.descricao}>{produto.descricao}</p>
                                <p style={estilos.preco}>{formatPreco(produto.preco)}</p>
                                <p style={estilos.estoque}>Estoque: {produto.estoque}</p>

                                {!ehStaff && authUser && (
                                    <div style={estilos.areaCompra}>
                                        <input
                                            type="number"
                                            min="1"
                                            max={produto.estoque}
                                            value={getQuantidade(produto.id)}
                                            onChange={(e) => handleQuantidadeChange(produto.id, parseInt(e.target.value) || 1)}
                                            style={estilos.inputQuantidade}
                                        />
                                        <button
                                            onClick={() => adicionarAoCarrinho(produto)}
                                            disabled={produto.estoque < 1}
                                            style={estilos.botaoComprar}
                                        >
                                            Adicionar
                                        </button>
                                    </div>
                                )}
                                {!authUser && <p style={estilos.avisoLogin}>Faça login para comprar</p>}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

const estilos = {
    pagina: { fontFamily: 'sans-serif', minHeight: '100vh' },
    cabecalho: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '1.5rem 2rem',
        borderBottom: '1px solid #1e293b',
    },
    titulo: { margin: 0 },
    areaUsuario: { display: 'flex', alignItems: 'center', gap: '1rem' },
    botaoCarrinho: { padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #6366f1', background: 'transparent', color: '#6366f1', cursor: 'pointer', fontWeight: 600 },
    botaoSair: { padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', background: '#f43f5e', color: '#fff', cursor: 'pointer' },
    areaLogin: { minWidth: '280px' },
    abas: { display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' },
    aba: { flex: 1, padding: '0.4rem', background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    abaAtiva: { flex: 1, padding: '0.4rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    form: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
    formStaff: { display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px', marginTop: '0.75rem' },
    input: { padding: '0.5rem', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc' },
    botao: { padding: '0.5rem', borderRadius: '6px', border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontWeight: 600 },
    erro: { color: '#f43f5e', background: 'rgba(244,63,94,0.1)', padding: '0.4rem', borderRadius: '6px', fontSize: '0.85rem' },
    sucesso: { color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.9rem' },
    main: { padding: '2rem' },
    tituloSecao: { marginBottom: '1rem' },
    vazio: { color: '#94a3b8' },
    grade: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' },
    cardProduto: { border: '1px solid #1e293b', borderRadius: '8px', padding: '1rem', background: '#111827' },
    nomeProduto: { margin: '0 0 0.5rem 0' },
    descricao: { color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' },
    preco: { color: '#10b981', fontWeight: 700, fontSize: '1.1rem' },
    estoque: { color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem' },
    areaCompra: { display: 'flex', gap: '0.5rem', marginTop: '0.5rem' },
    inputQuantidade: { width: '60px', padding: '0.4rem', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc' },
    botaoComprar: { flex: 1, padding: '0.4rem', borderRadius: '6px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 600 },
    avisoLogin: { fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.5rem' },
    painelCarrinho: { padding: '1.5rem 2rem', background: '#111827', borderBottom: '1px solid #1e293b' },
    painelStaff: { padding: '1.5rem 2rem', background: '#111827', borderBottom: '1px solid #1e293b' },
    linhaCarrinho: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.5rem 0', borderBottom: '1px solid #1e293b' },
    linhaCarrinhoNome: { flex: 1 },
    botaoRemover: { background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '1rem' },
    linhaTotal: { textAlign: 'right', padding: '0.75rem 0' },
    botaoFinalizar: { width: '100%', padding: '0.6rem', borderRadius: '6px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '1rem' },
    cardPedido: { border: '1px solid #1e293b', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', background: '#0f172a' },
    itemPedido: { fontSize: '0.85rem', color: '#94a3b8', paddingLeft: '0.5rem' },
};

export default App;