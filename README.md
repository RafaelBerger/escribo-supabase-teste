## 📋 Conteúdo Abordado / Tarefas do Teste

O objetivo deste projeto era demonstrar habilidades em Supabase e Backend, cobrindo os seguintes pontos:

1.  ✅ **Criação de tabelas** para gerenciar clientes, produtos e pedidos.
2.  ✅ **Implementação de Row-Level Security (RLS)** para garantir que os dados sejam acessados de forma segura (uso do `auth.uid()`).
3.  ✅ **Criação de funções no banco de dados** para automatizar processos, como cálculo de total de pedidos e atualização de status.
4.  ✅ **Criação de views** para consultar dados de forma eficiente.
5.  ❌ **Criação de Edge Functions** para automação de tarefas como envio de e-mails de confirmação e exportação de CSV do pedido de um cliente. *(Não consegui concluir essa etapa devido ao tempo).*


Este projeto foi desenvolvido com foco exclusivo na plataforma Supabase.

**Todas as tarefas foram implementadas diretamente no SQL Editor do Supabase Studio.** O objetivo principal desse codigo no github é testar a eficácia das políticas de Row-Level Security (RLS), funções e views no próprio banco de dados PostgreSQL.

---
## 🔑 Configuração de Variáveis de Ambiente (`.env`)

A segurança do projeto depende da correta utilização das chaves da API.

Crie um arquivo `.env` baseado neste modelo e preencha com suas chaves:


URL base do projeto Supabase

SUPABASE_URL=`SUA_URL_DO_PROJETO`

CHAVE PÚBLICA (Esta chave é segura e respeita todas as regras de RLS definidas.)

SUPABASE_ANON_KEY=`SUA_CHAVE_ANON`

CHAVE SECRETA (Essa chave ignora o todas as politicas de RLS)

SUPABASE_SERVICE_ROLE_KEY=`SUA_CHAVE_SERVICE_ROLE`





# 💾 Configuração do Banco de Dados Supabase

Este documento detalha o script de inicialização do banco de dados para um sistema de pedidos e e-commerce básico. Ele deve ser executado no SQL Editor do Supabase Studio.

## 🚀 Script SQL Completo

Este bloco de código contém a criação das tabelas, a ativação e definição das políticas de Row Level Security (RLS), as funções de banco de dados postgresql, as views para relatórios e os exemplos de inserção de dados.

```sql
-- ==========================================
-- 1. CRIAÇÃO DE TABELAS
-- ==========================================

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de produtos
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    descricao TEXT,
    preco FLOAT NOT NULL,
    estoque INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id),
    status TEXT DEFAULT 'pendente',
    total FLOAT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de itens do pedido
CREATE TABLE IF NOT EXISTS pedido_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES pedidos(id),
    produto_id UUID REFERENCES produtos(id),
    quantidade INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- ==========================================
-- 2. IMPLEMENTAÇÃO DE ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Primeiro Habilitar o RLS nas tabelas
alter table clientes enable row level security;
alter table produtos enable row level security;
alter table pedidos enable row level security;
alter table pedido_itens enable row level security;

-- RLS NA TABELA CLIENTES (PERMITE QUE O USUARIO REALIZE O CRUD EM SUAS PROPRIAS INFORMACOES)
-- SELECT: o usuário vê apenas seus dados
create policy "Clientes podem ver apenas seus dados"
on public.clientes
as permissive
for select
to authenticated
using (id = auth.uid());

-- INSERT: usuário pode criar seu próprio registro
create policy "Clientes podem criar seu próprio registro"
on public.clientes
as permissive
for insert
to authenticated
with check (id = auth.uid());

-- UPDATE: usuário só atualiza seus dados
create policy "Clientes podem atualizar seus próprios dados"
on public.clientes
as permissive
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- DELETE: opcional, caso queira permitir exclusão pelo próprio usuário
create policy "Clientes podem deletar seus próprios dados"
on public.clientes
as permissive
for delete
to authenticated
using (id = auth.uid());

-- RLS NA TABELA PRODUTOS (todos os usuários podem ver produtos)
create policy "Todos podem ver produtos"
on public.produtos
as permissive
for select
to authenticated
using (true);

-- RLS NA TABELA PEDIDOS (Clientes podem ver e criar seus proprios pedidos)
-- Permitir que o cliente veja apenas os seus pedidos
create policy "Clientes podem ver seus próprios pedidos"
on public.pedidos
as permissive
for select
to authenticated
using (
  cliente_id = auth.uid()
);

-- Permitir que o cliente crie pedidos
create policy "Clientes podem criar seus próprios pedidos"
on public.pedidos
as permissive
for insert
to authenticated
with check (
  cliente_id = auth.uid()
);

-- RLS NA TABELA PEDIDO_ITENS
-- Clientes podem ver apenas os itens dos seus pedidos
create policy "Clientes podem ver itens dos seus pedidos"
on public.pedido_itens
as permissive
for select
to authenticated
using (
  pedido_id in (select id from public.pedidos where cliente_id = auth.uid())
);

-- Clientes podem inserir itens apenas em seus próprios pedidos
create policy "Clientes podem inserir itens em seus pedidos"
on public.pedido_itens
as permissive
for insert
to authenticated
with check (
  pedido_id in (select id from public.pedidos where cliente_id = auth.uid())
);

-- Clientes podem atualizar a quantidade de itens dos seus pedidos
create policy "Clientes podem atualizar quantidade de itens dos seus pedidos"
on public.pedido_itens
as permissive
for update
to authenticated
using (
  pedido_id in (select id from public.pedidos where cliente_id = auth.uid())
)
with check (
  pedido_id in (select id from public.pedidos where cliente_id = auth.uid())
);


-- ==========================================
-- 3. FUNCOES NO BANCO DE DADOS
-- ==========================================

-- Função que atualiza o total baseado na quantidade de itens
create or replace function public.atualizar_total_pedido(pedido_uuid uuid)
returns void as $$
begin
  update public.pedidos
  set total = (
    select sum(pi.quantidade * p.preco)
    from public.pedido_itens pi
    join public.produtos p on p.id = pi.produto_id
    where pi.pedido_id = pedido_uuid
  )
  where id = pedido_uuid;
end;
$$ language plpgsql;
-- Exemplo: select public.atualizar_total_pedido('id do pedido');

-- Função que atualiza o status do pedido
create or replace function public.atualizar_status_pedido(pedido_uuid uuid, novo_status text)
returns void as $$
begin
  update public.pedidos
  set status = novo_status
  where id = pedido_uuid;
end;
$$ language plpgsql;
-- Exemplo: select public.atualizar_status_pedido('id do pedido', 'status novo');


-- ==========================================
-- 4. VIEWS
-- ==========================================

-- Mostra todos os pedidos com o total calculado.
create or replace view public.view_pedidos_com_total as
select
  p.id as pedido_id,
  c.id as cliente_id,
  c.nome as cliente_nome,
  p.total,
  p.status
from pedidos p
join clientes c on c.id = p.cliente_id;

-- Lista todos os itens de um pedido específico, incluindo nome do produto e preço.
create or replace view public.view_itens_do_pedido as
select
  pi.id as pedido_item_id,
  pi.pedido_id,
  pi.produto_id,
  pr.nome as produto_nome,
  pr.preco,
  pi.quantidade
from pedido_itens pi
join produtos pr on pr.id = pi.produto_id;

-- Relatório detalhado de pedidos, juntando cliente, itens e total.
create or replace view public.view_pedidos_detalhados as
select
  p.id as pedido_id,
  c.id as cliente_id,
  c.nome as cliente_nome,
  p.total,
  p.status,
  pi.produto_id,
  pr.nome as produto_nome,
  pi.quantidade,
  pr.preco
from pedidos p
join clientes c on c.id = p.cliente_id
join pedido_itens pi on pi.pedido_id = p.id
join produtos pr on pr.id = pi.produto_id;


-- ==========================================
-- 5. INSERINDO DADOS DE EXEMPLO
-- ==========================================
-- ATENÇÃO: Substitua os placeholders com IDs de usuários/pedidos reais do seu ambiente Supabase para testar o RLS.

-- 1. Inserir clientes (Mapear 'id' com auth.uid() para RLS)
insert into public.clientes (id, nome, email)
values
('id do usuario do supabase', 'nome para usuario', 'email para usuario'),
('id do usuario do supabase', 'nome para usuario', 'email para usuario');

-- 2. Inserir produto
insert into public.produtos (nome, descricao, preco, estoque)
values
('Tenis', 'Tenis comum', 100.00, 50);

-- 3. Inserir pedidos (Usar um ID de cliente existente)
insert into public.pedidos ( cliente_id, status)
values
('id do cliente', 'pendente'),
('id do cliente', 'pendente');

-- 4. Inserir itens de pedidos (Usar IDs de pedido e produto existentes)
insert into public.pedido_itens (pedido_id, produto_id, quantidade)
values
('id do pedido', 'id do produto', quantidade em numero),
('id do pedido', 'id do produto', quantidade em numero);
