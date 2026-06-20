import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  ShieldAlert, 
  RefreshCw, 
  Package, 
  Terminal, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  MapPin, 
  Layers,
  Lock,
  Plus,
  Trash2,
  ShoppingCart,
  UserPlus,
  FileText,
  LogOut,
  Key,
  Info
} from 'lucide-react';

function App() {
  // Conexão e Simulação de Banco de Dados
  const [activeDbRole, setActiveDbRole] = useState('loja_app');
  const [dbStatus, setDbStatus] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [backups, setBackups] = useState([]);
  const [consoleLogs, setConsoleLogs] = useState([
    { time: new Date().toLocaleTimeString(), type: 'info', message: 'Sistema iniciado. Escolha um papel na console de segurança para testar as permissões.' }
  ]);

  // Estados de Formulário
  const [newProduct, setNewProduct] = useState({ nome: '', descricao: '', preco: '', estoque: '', categoria_id: '1' });
  const [newOrder, setNewOrder] = useState({ usuario_id: '', produto_id: '', quantidade: 1 });
  const [newUser, setNewUser] = useState({ nome: '', email: '', senha_raw: '', funcao: 'cliente', ativo: true });
  const [selectedBackup, setSelectedBackup] = useState('');

  // Estados de Interface e Controle
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Autenticação de Usuário Simulada (Interface do Usuário)
  const [authUser, setAuthUser] = useState(null); // { nome, email, funcao }
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

  // Adicionar log ao console virtual do rodapé
  const logToConsole = useCallback((type, message, details = null) => {
    setConsoleLogs(prev => [
      {
        time: new Date().toLocaleTimeString(),
        type,
        message,
        details
      },
      ...prev.slice(0, 49) // Limite de 50 logs para performance
    ]);
  }, []);

  // Fetch genérico que envia o cabeçalho X-DB-Role dinâmico e registra no console
  const authenticatedFetch = useCallback(async (path, options = {}) => {
    const url = `${backendUrl}${path}`;
    const method = options.method || 'GET';
    
    // Injetar o header de simulação de Role
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      'X-DB-Role': activeDbRole
    };

    logToConsole('query', `Enviando requisição ${method} para ${path}`, { role: activeDbRole, headers });

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.detail || 'Erro na requisição';
        logToConsole('error', `Falha na requisição ${method} ${path}: ${errorMsg}`, { status: response.status });
        throw new Error(errorMsg);
      }

      logToConsole('success', `Sucesso em ${method} ${path}`, data);
      return data;
    } catch (err) {
      throw err;
    }
  }, [backendUrl, activeDbRole, logToConsole]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setActionError(null);

      // Buscar informações dependendo da role
      // Nota: o visitante_user vai estourar erro de permissão para ler usuários, pedidos ou backups.
      // Tratamos esses erros individualmente para carregar apenas o que o usuário logado tem permissão!
      
      // Status do Banco (todos podem acessar, mas as tabelas listadas variam)
      const statusData = await authenticatedFetch('/db-status').catch(err => {
        setActionError(`Erro de conexão com o banco: ${err.message}`);
        return null;
      });
      setDbStatus(statusData);

      // Catálogo de Produtos (Todos podem acessar)
      const productsData = await authenticatedFetch('/produtos').catch(() => []);
      setProducts(productsData);

      // Usuários da tabela (visitante_user receberá erro de permissão)
      const usersData = await authenticatedFetch('/usuarios').catch(err => {
        logToConsole('warning', 'Acesso negado para listar usuários do sistema (Tabela usuarios).');
        return [];
      });
      setSystemUsers(usersData);

      // Pedidos (visitante_user receberá erro de permissão)
      const ordersData = await authenticatedFetch('/pedidos').catch(err => {
        logToConsole('warning', 'Acesso negado para listar pedidos de vendas (Tabela pedidos).');
        return [];
      });
      setOrders(ordersData);

      // Logs de Auditoria (Apenas postgres/loja_app por padrão na tabela logs_auditoria)
      const logsData = await authenticatedFetch('/logs').catch(err => {
        logToConsole('warning', 'Acesso negado para ler logs de auditoria de segurança (Tabela logs_auditoria).');
        return [];
      });
      setLogs(logsData);

      // Backups do cluster (Apenas superusuário/postgres tem acesso a arquivos do host)
      const backupsData = await authenticatedFetch('/backups').catch(err => {
        logToConsole('warning', 'Acesso negado para listar arquivos de backup no diretório host.');
        return [];
      });
      setBackups(backupsData);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authenticatedFetch, logToConsole]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // --- LOGIN DO USUÁRIO DE APLICAÇÃO ---
  const handleAppLogin = (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    // Na semente (data.sql), temos as contas pré-cadastradas:
    // admin@lojavirtual.com, suporte@lojavirtual.com, bruno@cliente.com, julia@cliente.com
    const email = loginEmail.trim().toLowerCase();
    
    let simulatedUser = null;
    let recommendedPostgresRole = 'loja_app';

    if (email === 'admin@lojavirtual.com') {
      simulatedUser = { nome: 'Carlos Administrador', email, funcao: 'administrador' };
      recommendedPostgresRole = 'postgres';
    } else if (email === 'suporte@lojavirtual.com') {
      simulatedUser = { nome: 'Ana Suporte', email, funcao: 'suporte' };
      recommendedPostgresRole = 'funcionario_user';
    } else if (email === 'bruno@cliente.com') {
      simulatedUser = { nome: 'Bruno Cliente', email, funcao: 'cliente' };
      recommendedPostgresRole = 'visitante_user';
    } else if (email === 'julia@cliente.com') {
      simulatedUser = { nome: 'Julia Costa', email, funcao: 'cliente' };
      recommendedPostgresRole = 'visitante_user';
    } else {
      // Tenta buscar nos usuários cadastrados dinamicamente se houver
      const found = systemUsers.find(u => u.email.toLowerCase() === email);
      if (found) {
        simulatedUser = { nome: found.nome, email, funcao: found.funcao };
        recommendedPostgresRole = found.funcao === 'administrador' ? 'postgres' : 
                                  found.funcao === 'suporte' ? 'funcionario_user' : 'visitante_user';
      }
    }

    if (simulatedUser) {
      setAuthUser(simulatedUser);
      setActiveDbRole(recommendedPostgresRole);
      setActionSuccess(`Usuário '${simulatedUser.nome}' autenticado com sucesso! Role de banco recomendada '${recommendedPostgresRole}' foi ativada.`);
      logToConsole('success', `Login de Usuário da Aplicação realizado: ${simulatedUser.nome} (Função: ${simulatedUser.funcao}). Selecionada role de banco '${recommendedPostgresRole}'.`);
    } else {
      setActionError('Credenciais inválidas ou usuário não encontrado.');
      logToConsole('error', `Falha ao autenticar usuário da aplicação: ${loginEmail}`);
    }
  };

  const handleAppLogout = () => {
    logToConsole('info', `Usuário ${authUser?.nome} deslogou da aplicação.`);
    setAuthUser(null);
    setActiveDbRole('loja_app');
    setLoginEmail('');
    setLoginPassword('');
    setActionSuccess('Sessão encerrada.');
  };

  // --- OPERAÇÕES CRUD DE PRODUTOS ---
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    try {
      const data = await authenticatedFetch('/produtos', {
        method: 'POST',
        body: JSON.stringify({
          nome: newProduct.nome,
          descricao: newProduct.descricao,
          preco: parseFloat(newProduct.preco),
          estoque: parseInt(newProduct.estoque),
          categoria_id: parseInt(newProduct.categoria_id)
        })
      });
      setActionSuccess(`Produto '${data.nome}' cadastrado com sucesso!`);
      setNewProduct({ nome: '', descricao: '', preco: '', estoque: '', categoria_id: '1' });
      fetchData();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await authenticatedFetch(`/produtos/${id}`, { method: 'DELETE' });
      setActionSuccess('Produto removido com sucesso!');
      fetchData();
    } catch (err) {
      setActionError(err.message);
    }
  };

  // --- OPERAÇÃO DE COMPRA/PEDIDO ---
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    
    if (!newOrder.usuario_id || !newOrder.produto_id) {
      setActionError('Selecione um cliente e um produto.');
      return;
    }

    try {
      const data = await authenticatedFetch('/pedidos', {
        method: 'POST',
        body: JSON.stringify({
          usuario_id: parseInt(newOrder.usuario_id),
          itens: [
            {
              produto_id: parseInt(newOrder.produto_id),
              quantidade: parseInt(newOrder.quantidade),
              preco_unitario: 0 // Backend recalcula com base no preço real do banco
            }
          ]
        })
      });
      setActionSuccess(`Venda/Pedido #${data.id} realizada com sucesso! Total: R$ ${data.total}`);
      setNewOrder({ usuario_id: '', produto_id: '', quantidade: 1 });
      fetchData();
    } catch (err) {
      setActionError(err.message);
    }
  };

  // --- CADASTRO DE NOVOS USUÁRIOS (Tabela usuarios) ---
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    try {
      const data = await authenticatedFetch('/usuarios', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });
      setActionSuccess(`Usuário da aplicação '${data.nome}' cadastrado com sucesso!`);
      setNewUser({ nome: '', email: '', senha_raw: '', funcao: 'cliente', ativo: true });
      fetchData();
    } catch (err) {
      setActionError(err.message);
    }
  };

  // --- GESTÃO DE BACKUP E RESTAURAÇÃO (DISASTER RECOVERY) ---
  const handleTriggerLogicalBackup = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const data = await authenticatedFetch('/backups/logical', { method: 'POST' });
      setActionSuccess(data.mensagem);
      fetchData();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleTriggerCompleteBackup = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const data = await authenticatedFetch('/backups/complete', { method: 'POST' });
      setActionSuccess(data.mensagem);
      fetchData();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleTriggerRestore = async () => {
    if (!selectedBackup) {
      setActionError('Selecione um arquivo de backup para restaurar.');
      return;
    }
    if (!window.confirm(`ATENÇÃO: Você tem certeza que deseja restaurar o backup '${selectedBackup}'? Isso substituirá os dados atuais!`)) return;

    setActionError(null);
    setActionSuccess(null);
    try {
      const data = await authenticatedFetch(`/backups/restore?filename=${selectedBackup}`, { method: 'POST' });
      setActionSuccess(data.mensagem);
      fetchData();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleTriggerDropDb = async () => {
    if (!window.confirm('CUIDADO: Tem certeza que deseja derrubar/excluir o banco de dados principal? Isso simulará um desastre completo!')) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      const data = await authenticatedFetch('/db-status/drop', { method: 'POST' });
      setActionSuccess(data.mensagem);
      setDbStatus(null);
      setProducts([]);
      setOrders([]);
      setSystemUsers([]);
      setLogs([]);
    } catch (err) {
      setActionError(err.message);
    }
  };

  // Renderização e formatação de dados
  const getLogLevelClass = (event) => {
    if (!event) return 'level-info';
    const ev = event.toUpperCase();
    if (ev.includes('BLOQUEADO') || ev.includes('FALHA') || ev.includes('ERRO') || ev.includes('DELETE')) return 'level-danger';
    if (ev.includes('ALTERACAO') || ev.includes('ATUALIZACAO') || ev.includes('UPDATE')) return 'level-warning';
    if (ev.includes('SUCESSO') || ev.includes('INICIALIZADO') || ev.includes('PAGO') || ev.includes('INSERT')) return 'level-success';
    return 'level-info';
  };

  const formatPrice = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR');
  };

  const renderLogDetails = (log) => {
    if (log.detalhes) {
      return <div className="log-details">{log.detalhes}</div>;
    }
    
    if (log.dados_antigos || log.dados_novos) {
      const changes = [];
      const oldVal = log.dados_antigos || {};
      const newVal = log.dados_novos || {};
      
      if (log.tabela_afetada === 'produtos') {
        const prodName = newVal.nome || oldVal.nome;
        if (oldVal.preco !== newVal.preco && newVal.preco !== undefined) {
          changes.push(`Preço de '${prodName}' alterado de R$ ${oldVal.preco} para R$ ${newVal.preco}`);
        }
        if (oldVal.estoque !== newVal.estoque && newVal.estoque !== undefined) {
          changes.push(`Estoque de '${prodName}' alterado de ${oldVal.estoque} para ${newVal.estoque}`);
        }
        if (log.evento === 'DELETE') {
          changes.push(`Produto removido do catálogo: '${oldVal.nome}'`);
        }
      }
      
      if (changes.length === 0) {
        changes.push(`Registro atualizado na tabela [${log.tabela_afetada}]`);
      }
      
      return (
        <div className="log-details" style={{ fontSize: '0.85rem' }}>
          {changes.map((change, idx) => (
            <p key={idx} style={{ marginBottom: '0.25rem' }}>• {change}</p>
          ))}
          <div style={{ 
            marginTop: '0.5rem', 
            fontSize: '0.75rem', 
            fontFamily: 'var(--font-mono)', 
            background: 'rgba(0, 0, 0, 0.25)', 
            padding: '0.5rem', 
            borderRadius: '6px', 
            overflowX: 'auto',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)'
          }}>
            {log.dados_antigos && <div style={{ color: 'var(--color-rose)' }}>- OLD: {JSON.stringify(log.dados_antigos)}</div>}
            {log.dados_novos && <div style={{ color: 'var(--color-emerald)', marginTop: '0.25rem' }}>+ NEW: {JSON.stringify(log.dados_novos)}</div>}
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <h1>E-Commerce Security & Auditoria</h1>
          <p>Plataforma Acadêmica de Controle de Segurança, RBAC e Disaster Recovery (BD II)</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {dbStatus ? (
            <span className="badge badge-connected">
              <CheckCircle2 size={16} /> Banco Conectado: {dbStatus.usuario_banco_atual}
            </span>
          ) : (
            <span className="badge badge-disconnected animate-pulse">
              <XCircle size={16} /> Banco Desconectado / Offline
            </span>
          )}
          
          {authUser ? (
            <div className="auth-profile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{authUser.nome}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-indigo)', textTransform: 'uppercase', fontWeight: 700 }}>Role: {authUser.funcao}</span>
              </div>
              <button onClick={handleAppLogout} style={{ background: 'none', border: 'none', color: 'var(--color-rose)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.2rem' }}>
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <span className="badge badge-disconnected" style={{ color: 'var(--text-secondary)' }}>
              Sem Login de Aplicação
            </span>
          )}
        </div>
      </header>

      {/* Alertas de Notificação de Operações */}
      {actionError && (
        <div className="panel" style={{ borderLeft: '4px solid var(--color-rose)', background: 'rgba(244, 63, 94, 0.08)', marginBottom: '1.5rem', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-rose)' }}>
            <AlertCircle size={20} />
            <span style={{ fontWeight: 600 }}>Erro de Banco de Dados</span>
          </div>
          <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{actionError}</p>
        </div>
      )}
      {actionSuccess && (
        <div className="panel" style={{ borderLeft: '4px solid var(--color-emerald)', background: 'rgba(16, 185, 129, 0.08)', marginBottom: '1.5rem', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-emerald)' }}>
            <CheckCircle2 size={20} />
            <span style={{ fontWeight: 600 }}>Ação Concluída</span>
          </div>
          <p style={{ marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{actionSuccess}</p>
        </div>
      )}

      {/* Grid Principal do Simulador */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Bloco Superior: Controles de Segurança (RBAC / Login) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* Painel de Login da Aplicação */}
          <div className="panel">
            <div className="panel-header" style={{ marginBottom: '1rem' }}>
              <div className="panel-title">
                <Lock size={18} />
                <h2>Autenticação da Aplicação</h2>
              </div>
            </div>
            
            {!authUser ? (
              <form onSubmit={handleAppLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  Autentique-se como um usuário da tabela <code>usuarios</code> para habilitar operações de negócio.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email do Usuário</label>
                  <input 
                    type="email" 
                    placeholder="admin@lojavirtual.com, suporte@lojavirtual.com..." 
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.9rem' }}
                    required
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Senha</label>
                  <input 
                    type="password" 
                    placeholder="Sua senha..." 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    style={{ padding: '0.5rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.9rem' }}
                  />
                </div>
                <button type="submit" className="refresh-button" style={{ justifyContent: 'center', marginTop: '0.5rem' }}>
                  Entrar no Sistema
                </button>
                
                {/* Dicas de Contas de Teste */}
                <div style={{ border: '1px dashed var(--border-color)', padding: '0.5rem', borderRadius: '6px', marginTop: '0.25rem', background: 'rgba(255,255,255,0.02)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Contas Rápidas de Teste:</span>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => { setLoginEmail('admin@lojavirtual.com'); setLoginPassword('senha123'); }} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', background: 'rgba(99,102,241,0.1)', color: 'var(--color-indigo)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '4px', cursor: 'pointer' }}>Admin (Carlos)</button>
                    <button type="button" onClick={() => { setLoginEmail('suporte@lojavirtual.com'); setLoginPassword('senha123'); }} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', background: 'rgba(16,185,129,0.1)', color: 'var(--color-emerald)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '4px', cursor: 'pointer' }}>Suporte (Ana)</button>
                    <button type="button" onClick={() => { setLoginEmail('bruno@cliente.com'); setLoginPassword('senha123'); }} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', background: 'rgba(245,158,11,0.1)', color: 'var(--color-amber)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '4px', cursor: 'pointer' }}>Cliente (Bruno)</button>
                  </div>
                </div>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'rgba(16,185,129,0.05)', padding: '0.8rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <CheckCircle2 size={24} style={{ color: 'var(--color-emerald)' }} />
                  <div>
                    <span style={{ display: 'block', fontWeight: 600 }}>{authUser.nome}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Logado como: {authUser.email}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderLeft: '3px solid var(--color-indigo)', paddingLeft: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-indigo)' }}>Permissões de Negócio Habilitadas:</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {authUser.funcao === 'administrador' && '• Controle total de dados, manipulação de DDL, usuários e backups.'}
                    {authUser.funcao === 'suporte' && '• Consultas operacionais, cadastro de produtos e processamento de vendas. Bloqueio de exclusões.'}
                    {authUser.funcao === 'cliente' && '• Apenas consultas de produtos e navegação básica.'}
                  </span>
                </div>
                <button onClick={handleAppLogout} className="refresh-button" style={{ border: '1px solid rgba(244,63,94,0.3)', color: 'var(--color-rose)', background: 'rgba(244,63,94,0.05)', justifyContent: 'center' }}>
                  Fazer Logout (Encerrar Sessão)
                </button>
              </div>
            )}
          </div>

          {/* Painel Seletor de Roles do PostgreSQL (RBAC Console) */}
          <div className="panel" style={{ borderLeft: '4px solid var(--color-indigo)' }}>
            <div className="panel-header" style={{ marginBottom: '0.75rem' }}>
              <div className="panel-title">
                <ShieldAlert size={18} />
                <h2>Console de Segurança (Roles do Banco)</h2>
              </div>
            </div>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              Escolha qual Usuário/Role do PostgreSQL você deseja simular na conexão HTTP atual. Veja como o banco restringe acessos em nível físico.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
              <button 
                onClick={() => { setActiveDbRole('postgres'); logToConsole('info', 'Selecionada role PostgreSQL: postgres (Superusuário)'); }}
                className={`refresh-button ${activeDbRole === 'postgres' ? 'active' : ''}`}
                style={{ background: activeDbRole === 'postgres' ? 'var(--color-rose-glow)' : 'rgba(255,255,255,0.02)', border: activeDbRole === 'postgres' ? '1px solid var(--color-rose)' : '1px solid var(--border-color)', color: activeDbRole === 'postgres' ? 'var(--color-rose)' : '#fff', justifyContent: 'center' }}
              >
                postgres (Super)
              </button>
              <button 
                onClick={() => { setActiveDbRole('loja_app'); logToConsole('info', 'Selecionada role PostgreSQL: loja_app (Padrão)'); }}
                className={`refresh-button ${activeDbRole === 'loja_app' ? 'active' : ''}`}
                style={{ background: activeDbRole === 'loja_app' ? 'var(--color-indigo-glow)' : 'rgba(255,255,255,0.02)', border: activeDbRole === 'loja_app' ? '1px solid var(--color-indigo)' : '1px solid var(--border-color)', color: activeDbRole === 'loja_app' ? 'var(--color-indigo)' : '#fff', justifyContent: 'center' }}
              >
                loja_app (App)
              </button>
              <button 
                onClick={() => { setActiveDbRole('funcionario_user'); logToConsole('info', 'Selecionada role PostgreSQL: funcionario_user (Funcionário)'); }}
                className={`refresh-button ${activeDbRole === 'funcionario_user' ? 'active' : ''}`}
                style={{ background: activeDbRole === 'funcionario_user' ? 'var(--color-amber-glow)' : 'rgba(255,255,255,0.02)', border: activeDbRole === 'funcionario_user' ? '1px solid var(--color-amber)' : '1px solid var(--border-color)', color: activeDbRole === 'funcionario_user' ? 'var(--color-amber)' : '#fff', justifyContent: 'center' }}
              >
                funcionario_user
              </button>
              <button 
                onClick={() => { setActiveDbRole('visitante_user'); logToConsole('info', 'Selecionada role PostgreSQL: visitante_user (Visitante)'); }}
                className={`refresh-button ${activeDbRole === 'visitante_user' ? 'active' : ''}`}
                style={{ background: activeDbRole === 'visitante_user' ? 'var(--color-emerald-glow)' : 'rgba(255,255,255,0.02)', border: activeDbRole === 'visitante_user' ? '1px solid var(--color-emerald)' : '1px solid var(--border-color)', color: activeDbRole === 'visitante_user' ? 'var(--color-emerald)' : '#fff', justifyContent: 'center' }}
              >
                visitante_user
              </button>
            </div>

            {/* Quadro de Permissões Rápidas da Role Ativa */}
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Permissões Ativas no Postgres:</span>
              {activeDbRole === 'postgres' && <span style={{ color: 'var(--color-rose)' }}>• Acesso total a DDL/DML, usuários, configurações globais e backup/restore.</span>}
              {activeDbRole === 'loja_app' && <span style={{ color: 'var(--color-indigo)' }}>• Permissões completas de DML (leitura/escrita) em todas as tabelas operacionais.</span>}
              {activeDbRole === 'funcionario_user' && <span style={{ color: 'var(--color-amber)' }}>• SELECT em tabelas de negócio e logs; INSERT em produtos/pedidos. Bloqueio total de DELETE.</span>}
              {activeDbRole === 'visitante_user' && <span style={{ color: 'var(--color-emerald)' }}>• SELECT apenas em produtos e categorias. Bloqueado em tabelas de vendas e usuários.</span>}
            </div>
          </div>

        </div>

        {/* Dashboard Operacional (CRUDs e Controle de Backups) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          
          {/* Seção de Formulários / Operações no Banco */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            
            {/* CRUD: Cadastro de Produtos (Dispara Trigger de Auditoria no UPDATE) */}
            <div className="panel">
              <div className="panel-header" style={{ marginBottom: '1rem' }}>
                <div className="panel-title">
                  <Package size={18} />
                  <h2>Cadastrar Produto (INSERT)</h2>
                </div>
              </div>
              <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <input 
                  type="text" 
                  placeholder="Nome do produto" 
                  value={newProduct.nome}
                  onChange={(e) => setNewProduct({...newProduct, nome: e.target.value})}
                  style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                  required
                />
                <input 
                  type="text" 
                  placeholder="Descrição do produto" 
                  value={newProduct.descricao}
                  onChange={(e) => setNewProduct({...newProduct, descricao: e.target.value})}
                  style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="Preço (Ex: 99.90)" 
                    value={newProduct.preco}
                    onChange={(e) => setNewProduct({...newProduct, preco: e.target.value})}
                    style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                    required
                  />
                  <input 
                    type="number" 
                    placeholder="Estoque" 
                    value={newProduct.estoque}
                    onChange={(e) => setNewProduct({...newProduct, estoque: e.target.value})}
                    style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                    required
                  />
                </div>
                <select 
                  value={newProduct.categoria_id}
                  onChange={(e) => setNewProduct({...newProduct, categoria_id: e.target.value})}
                  style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(15,23,42,0.9)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                >
                  <option value="1">1 - Eletrônicos</option>
                  <option value="2">2 - Vestuário</option>
                  <option value="3">3 - Livros</option>
                  <option value="4">4 - Casa e Decoração</option>
                  <option value="5">5 - Esportes</option>
                </select>
                <button type="submit" className="refresh-button" style={{ justifyContent: 'center', marginTop: '0.25rem' }}>
                  <Plus size={14} /> Cadastrar Produto
                </button>
              </form>
            </div>

            {/* Operação de Negócio: Registrar Pedido (INSERT Pedido & decremento de estoque) */}
            <div className="panel">
              <div className="panel-header" style={{ marginBottom: '1rem' }}>
                <div className="panel-title">
                  <ShoppingCart size={18} />
                  <h2>Registrar Venda (Pedido / Item)</h2>
                </div>
              </div>
              <form onSubmit={handleCreateOrder} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                  Cria um pedido de venda. A transação valida o estoque físico e reduz a quantidade disponível de forma automática.
                </p>
                <select 
                  value={newOrder.usuario_id}
                  onChange={(e) => setNewOrder({...newOrder, usuario_id: e.target.value})}
                  style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(15,23,42,0.9)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                  required
                >
                  <option value="">Selecione o Cliente</option>
                  {systemUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.id} - {user.nome} ({user.funcao})</option>
                  ))}
                </select>
                
                <select 
                  value={newOrder.produto_id}
                  onChange={(e) => setNewOrder({...newOrder, produto_id: e.target.value})}
                  style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(15,23,42,0.9)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                  required
                >
                  <option value="">Selecione o Produto</option>
                  {products.map(prod => (
                    <option key={prod.id} value={prod.id}>{prod.nome} ({formatPrice(prod.preco)} - Est: {prod.estoque})</option>
                  ))}
                </select>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quantidade</label>
                  <input 
                    type="number" 
                    value={newOrder.quantidade}
                    onChange={(e) => setNewOrder({...newOrder, quantidade: parseInt(e.target.value) || 1})}
                    style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                    min="1"
                    required
                  />
                </div>

                <button type="submit" className="refresh-button" style={{ justifyContent: 'center', marginTop: '0.25rem' }}>
                  <Plus size={14} /> Fechar Venda / Pedido
                </button>
              </form>
            </div>

            {/* Cadastro de Usuários da Aplicação (INSERT na Tabela usuarios) - REQUISITO ESPECIAL */}
            <div className="panel">
              <div className="panel-header" style={{ marginBottom: '1rem' }}>
                <div className="panel-title">
                  <UserPlus size={18} />
                  <h2>Cadastrar Usuário da Loja</h2>
                </div>
              </div>
              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <input 
                  type="text" 
                  placeholder="Nome completo" 
                  value={newUser.nome}
                  onChange={(e) => setNewUser({...newUser, nome: e.target.value})}
                  style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                  required
                />
                <input 
                  type="email" 
                  placeholder="E-mail único" 
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                  required
                />
                <input 
                  type="password" 
                  placeholder="Senha secreta" 
                  value={newUser.senha_raw}
                  onChange={(e) => setNewUser({...newUser, senha_raw: e.target.value})}
                  style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                  required
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <select 
                    value={newUser.funcao}
                    onChange={(e) => setNewUser({...newUser, funcao: e.target.value})}
                    style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(15,23,42,0.9)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="cliente">Cliente</option>
                    <option value="suporte">Suporte/Func</option>
                    <option value="administrador">Admin</option>
                  </select>
                  <select 
                    value={newUser.ativo ? "true" : "false"}
                    onChange={(e) => setNewUser({...newUser, ativo: e.target.value === "true"})}
                    style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(15,23,42,0.9)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.85rem' }}
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
                <button type="submit" className="refresh-button" style={{ justifyContent: 'center', marginTop: '0.25rem' }}>
                  <UserPlus size={14} /> Adicionar Novo Usuário
                </button>
              </form>
            </div>

            {/* Disaster Recovery & Backups Panel (Apenas Superusuário / postgres) */}
            <div className="panel" style={{ borderLeft: '4px solid var(--color-rose)' }}>
              <div className="panel-header" style={{ marginBottom: '1rem' }}>
                <div className="panel-title">
                  <ShieldAlert size={18} style={{ color: 'var(--color-rose)' }} />
                  <h2>Administração & Disaster Recovery</h2>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                
                {/* Ações Rápidas de Backup */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button onClick={handleTriggerLogicalBackup} className="refresh-button" style={{ fontSize: '0.8rem', padding: '0.4rem', justifyContent: 'center' }}>
                    Backup Lógico
                  </button>
                  <button onClick={handleTriggerCompleteBackup} className="refresh-button" style={{ fontSize: '0.8rem', padding: '0.4rem', justifyContent: 'center' }}>
                    Backup Cluster
                  </button>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Selecionar Backup para Restaurar</label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <select 
                      value={selectedBackup}
                      onChange={(e) => setSelectedBackup(e.target.value)}
                      style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(15,23,42,0.9)', border: '1px solid var(--border-color)', color: '#fff', fontSize: '0.8rem' }}
                    >
                      <option value="">Nenhum backup selecionado</option>
                      {backups.map(bk => (
                        <option key={bk} value={bk}>{bk}</option>
                      ))}
                    </select>
                    <button onClick={handleTriggerRestore} className="refresh-button" style={{ padding: '0.4rem 0.8rem', background: 'var(--color-indigo-glow)', border: '1px solid var(--color-indigo)', color: 'var(--color-indigo)' }}>
                      Restaurar
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <button onClick={handleTriggerDropDb} className="refresh-button" style={{ width: '100%', padding: '0.4rem', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--color-rose)', justifyContent: 'center', fontWeight: 600 }}>
                    Simular Queda de Banco (DROP DATABASE)
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Tabelas de Visualização (Catálogo de Produtos & Linha de Tempo de Logs) */}
          <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
              
              {/* Painel: Lista de Produtos e Exclusões */}
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <Package size={20} />
                    <h2>Catálogo de Produtos (SELECT/DELETE)</h2>
                  </div>
                  <button className="refresh-button" onClick={handleRefresh} disabled={refreshing}>
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    Recarregar
                  </button>
                </div>

                <div className="products-container" style={{ maxHeight: '400px' }}>
                  {products.length === 0 ? (
                    <div className="empty-state">Nenhum produto listado no catálogo ou acesso negado.</div>
                  ) : (
                    products.map((product) => (
                      <div className="product-card" key={product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div className="product-category">{product.categoria || 'Sem categoria'}</div>
                          <div className="product-name">{product.nome}</div>
                          <div className="product-desc" style={{ minHeight: 'auto', marginBottom: '0.4rem' }}>{product.descricao}</div>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <span className="product-price">{formatPrice(product.preco)}</span>
                            <span className={`product-stock ${product.estoque <= 10 ? 'stock-low' : ''}`} style={{ fontSize: '0.75rem' }}>
                              Estoque: {product.estoque}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteProduct(product.id)}
                          style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--color-rose)', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Painel: Logs de Auditoria das Triggers do Postgres */}
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    <Terminal size={20} />
                    <h2>Auditoria em Tempo Real (Trigger do Banco)</h2>
                  </div>
                  <span className="badge badge-connected" style={{ fontSize: '0.75rem', background: 'rgba(99,102,241,0.08)', color: 'var(--color-indigo)' }}>
                    Trigger Ativa
                  </span>
                </div>

                <div className="logs-timeline" style={{ maxHeight: '400px' }}>
                  {logs.length === 0 ? (
                    <div className="empty-state">Nenhum log registrado ou acesso negado à tabela logs_auditoria.</div>
                  ) : (
                    logs.map((log) => {
                      const logClass = getLogLevelClass(log.evento);
                      return (
                        <div className={`log-item ${logClass}`} key={log.id}>
                          <div className="log-header">
                            <span className={`log-event ${logClass}`}>{log.evento}</span>
                            <span className="log-time">{formatDateTime(log.data_evento)}</span>
                          </div>
                          {renderLogDetails(log)}
                          <div className="log-metadata" style={{ marginTop: '0.4rem' }}>
                            <div className="log-meta-item">
                              <User size={12} />
                              <span>{log.usuario || 'Ação do Sistema'}</span>
                            </div>
                            {log.ip_origem && (
                              <div className="log-meta-item">
                                <MapPin size={12} />
                                <span>{log.ip_origem}</span>
                              </div>
                            )}
                            {log.tabela_afetada && (
                              <div className="log-meta-item">
                                <Database size={12} />
                                <span>Tabela: {log.tabela_afetada}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Console virtual do rodapé - LOGS DE QUERIES HTTP/SQL */}
          <div className="panel" style={{ background: '#070a13', border: '1px solid rgba(255,255,255,0.05)', padding: '1rem' }}>
            <div className="panel-header" style={{ marginBottom: '0.75rem', borderBottom: 'none', paddingBottom: 0 }}>
              <div className="panel-title" style={{ fontSize: '1rem' }}>
                <Terminal size={16} />
                <h2>Console de Monitoramento SQL / Conexões</h2>
              </div>
              <button 
                onClick={() => setConsoleLogs([])} 
                style={{ fontSize: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                Limpar Console
              </button>
            </div>
            
            <div style={{ 
              maxHeight: '180px', 
              overflowY: 'auto', 
              fontFamily: 'var(--font-mono)', 
              fontSize: '0.8rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.4rem',
              background: '#04060b',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.03)'
            }}>
              {consoleLogs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>[Aguardando interações...]</div>
              ) : (
                consoleLogs.map((c, i) => (
                  <div key={i} style={{ lineBreak: 'anywhere', paddingBottom: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>[{c.time}]</span>{' '}
                    {c.type === 'query' && <span style={{ color: 'var(--color-indigo)', fontWeight: 600 }}>[API CALL]</span>}
                    {c.type === 'success' && <span style={{ color: 'var(--color-emerald)', fontWeight: 600 }}>[SUCCESS]</span>}
                    {c.type === 'error' && <span style={{ color: 'var(--color-rose)', fontWeight: 600 }}>[DATABASE ERROR]</span>}
                    {c.type === 'warning' && <span style={{ color: 'var(--color-amber)', fontWeight: 600 }}>[SECURITY ALERT]</span>}
                    {c.type === 'info' && <span style={{ color: '#94a3b8', fontWeight: 600 }}>[SYSTEM]</span>}{' '}
                    <span style={{ 
                      color: c.type === 'error' ? 'var(--color-rose)' : 
                             c.type === 'success' ? 'var(--color-emerald)' : 
                             c.type === 'warning' ? 'var(--color-amber)' : '#e2e8f0' 
                    }}>
                      {c.message}
                    </span>
                    {c.details && (
                      <pre style={{ 
                        marginTop: '0.25rem', 
                        fontSize: '0.7rem', 
                        color: 'var(--text-muted)', 
                        background: 'rgba(255,255,255,0.01)', 
                        padding: '0.25rem', 
                        borderRadius: '4px',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {JSON.stringify(c.details)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Footer Info */}
      <footer style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2rem' }}>
        <p>Projeto de Banco de Dados II — UFES</p>
        <p style={{ marginTop: '0.25rem' }}>Triggers de Auditoria com logs em JSONB • Dynamic Role Routing • Script Lógico/Cluster Backup</p>
      </footer>
    </div>
  );
}

export default App;
