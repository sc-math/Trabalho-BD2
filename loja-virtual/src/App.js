import React, { useState, useEffect } from 'react';

const BACKEND_URL = 'http://localhost:8000';

function App() {
    const [authUser, setAuthUser] = useState(null); // { id, nome, funcao, email }
    const [authToken, setAuthToken] = useState(null);

    const [modo, setModo] = useState('login');

    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [nome, setNome] = useState('');

    const [erro, setErro] = useState(null);
    const [carregando, setCarregando] = useState(false);

    const [produtos, setProdutos] = useState([]);
    const [quantidades, setQuantidades] = useState({});
    const [comprando, setComprando] = useState(null);
    const [mensagemCompra, setMensagemCompra] = useState(null);

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
        setMensagemCompra(null);
    };

    const getQuantidade = (produtoId) => quantidades[produtoId] || 1;

    const handleQuantidadeChange = (produtoId, valor) => {
        setQuantidades({ ...quantidades, [produtoId]: valor });
    };

    const handleComprar = async (produto) => {
        setMensagemCompra(null);
        setComprando(produto.id);
        const quantidade = getQuantidade(produto.id);
        try {
            const resp = await fetch(`${BACKEND_URL}/pedidos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    usuario_id: authUser.id,
                    itens: [{ produto_id: produto.id, quantidade, preco_unitario: produto.preco }],
                }),
            });
            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data.detail || 'Não foi possível concluir a compra.');
            }
            setMensagemCompra({ tipo: 'sucesso', texto: `Pedido #${data.id} registrado! Total: ${formatPreco(data.total)}` });
            buscarProdutos();
        } catch (err) {
            setMensagemCompra({ tipo: 'erro', texto: err.message });
        } finally {
            setComprando(null);
        }
    };

    const formatPreco = (valor) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

    return (
        <div style={estilos.pagina}>
            <header style={estilos.cabecalho}>
                <h1 style={estilos.titulo}>Loja Virtual</h1>

                {authUser ? (
                    <div style={estilos.areaUsuario}>
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

            <main style={estilos.main}>
                <h2 style={estilos.tituloSecao}>Catálogo de Produtos</h2>

                {mensagemCompra && (
                    <p style={mensagemCompra.tipo === 'sucesso' ? estilos.sucesso : estilos.erro}>
                        {mensagemCompra.texto}
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

                                {authUser ? (
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
                                            onClick={() => handleComprar(produto)}
                                            disabled={comprando === produto.id || produto.estoque < 1}
                                            style={estilos.botaoComprar}
                                        >
                                            {comprando === produto.id ? 'Comprando...' : 'Comprar'}
                                        </button>
                                    </div>
                                ) : (
                                    <p style={estilos.avisoLogin}>Faça login para comprar</p>
                                )}
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
    botaoSair: { padding: '0.4rem 0.8rem', borderRadius: '6px', border: 'none', background: '#f43f5e', color: '#fff', cursor: 'pointer' },
    areaLogin: { minWidth: '280px' },
    abas: { display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' },
    aba: { flex: 1, padding: '0.4rem', background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    abaAtiva: { flex: 1, padding: '0.4rem', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    form: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
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
};

export default App;