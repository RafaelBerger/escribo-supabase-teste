require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Inicializa o cliente do Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// ================================
// 🔍 CONSULTAS GERAIS
// ================================

// Buscar todos os clientes
async function getClientes() {
  const { data, error } = await supabase.from('clientes').select('*');
  if (error) console.error('Erro ao buscar clientes:', error);
  else console.log('Clientes:', data);
}

// Buscar todos os produtos
async function getProdutos() {
  const { data, error } = await supabase.from('produtos').select('*');
  if (error) console.error('Erro ao buscar produtos:', error);
  else console.log('Produtos:', data);
}

// Buscar todos os pedidos
async function getPedidos() {
  const { data, error } = await supabase.from('pedidos').select('*');
  if (error) console.error('Erro ao buscar pedidos:', error);
  else console.log('Pedidos:', data);
}

// Buscar itens de pedido
async function getPedidoItens() {
  const { data, error } = await supabase.from('pedido_itens').select('*');
  if (error) console.error('Erro ao buscar itens de pedido:', error);
  else console.log('Itens do pedido:', data);
}

// ================================
// INSERÇÕES DE TESTE
// ================================

async function addCliente(nome, email) {
  const { data, error } = await supabase.from('clientes').insert([{ nome, email }]);
  if (error) console.error('Erro ao inserir cliente:', error);
  else console.log('Cliente inserido:', data);
}

async function addProduto(nome, descricao, preco, estoque) {
  const { data, error } = await supabase.from('produtos').insert([{ nome, descricao, preco, estoque }]);
  if (error) console.error('Erro ao inserir produto:', error);
  else console.log('Produto inserido:', data);
}

async function addPedido(cliente_id, status = 'pendente') {
  const { data, error } = await supabase.from('pedidos').insert([{ cliente_id, status }]);
  if (error) console.error('Erro ao inserir pedido:', error);
  else console.log('Pedido inserido:', data);
}

async function addPedidoItem(pedido_id, produto_id, quantidade) {
  const { data, error } = await supabase.from('pedido_itens').insert([{ pedido_id, produto_id, quantidade }]);
  if (error) console.error('Erro ao inserir item do pedido:', error);
  else console.log('Item do pedido inserido:', data);
}

// ================================
// FUNÇÕES E VIEWS
// ================================

async function atualizarTotalPedido(pedido_id) {
  const { data, error } = await supabase.rpc('atualizar_total_pedido', { pedido_uuid: pedido_id });
  if (error) console.error('Erro ao atualizar total:', error);
  else console.log('Total atualizado:', data);
}

async function atualizarStatusPedido(pedido_id, novo_status) {
  const { data, error } = await supabase.rpc('atualizar_status_pedido', { pedido_uuid: pedido_id, novo_status });
  if (error) console.error('Erro ao atualizar status:', error);
  else console.log('Status atualizado:', data);
}

async function consultarViewPedidos() {
  const { data, error } = await supabase.from('view_pedidos_com_total').select('*');
  if (error) console.error('Erro ao consultar view:', error);
  else console.log('Pedidos com total:', data);
}

// ================================
// EXECUÇÃO PRINCIPAL


async function main() {
  console.log('🔗 Testando conexão...');
  await getClientes();
  await getProdutos();
  await getPedidos();

    //para testar inserções, descomente as linhas abaixo

//   await addCliente('Rafael', 'rafa@example.com');
//   await addProduto('Tênis Azul', 'Produto de teste', 120, 10);
//   await addPedido('uuid-do-cliente');
//   await addPedidoItem('uuid-do-pedido', 'uuid-do-produto', 2);



    //funcoes criadas no supabase

//   await atualizarTotalPedido('uuid-do-pedido');
//   await atualizarStatusPedido('uuid-do-pedido', 'pago');

    //uma das views

//   await consultarViewPedidos();

  await getPedidoItens();
}

main();
