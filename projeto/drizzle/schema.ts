// drizzle/schema.ts
import { pgTable, uuid, text, jsonb, timestamp, boolean, decimal } from 'drizzle-orm/pg-core';

// 1. TENANTS (As Agências, ex: "Agência Mugô")
// Substitui a pasta raiz /data/tenants/agencia_mugo
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),          // Ex: "Agência Mugô"
  slug: text('slug').notNull().unique(), // Ex: "agencia_mugo" (usado na URL)
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. CLIENTS (Os Subclientes, ex: "EcoShoes / Varejo")
// Substitui as subpastas /clients/varejo
export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(), // Pertence a qual agência?
  
  name: text('name').notNull(),          // Ex: "EcoShoes Varejo"
  slug: text('slug').notNull(),          // Ex: "varejo"
  
  // CONFIGURAÇÃO (O conteúdo do seu config.json)
  // Guardamos como JSONB para flexibilidade total
  config: jsonb('config').notNull().default({}), 
  
  // PROMPTS (O conteúdo do seu prompts.json)
  // Guardamos as personas dos agentes aqui
  prompts: jsonb('prompts').notNull().default({}),
  
  // Carteira Financeira (Separada do JSON para facilitar contas SQL)
  walletBalance: decimal('wallet_balance', { precision: 10, scale: 2 }).default('0.00'),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. USERS (Sua equipe e clientes)
// Substitui o internal_users.json e users.json
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id), // Usuário pertence a uma agência principal
  
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(), // Em prod, usar Supabase Auth real
  name: text('name').notNull(),
  role: text('role').notNull(), // 'admin', 'redator', 'producao'
  
  // CONTROLE DE ACESSO (ACL)
  // Lista de slugs dos clientes que ele pode ver: ["varejo", "moda"] ou ["*"]
  allowedClients: jsonb('allowed_clients').default([]),
  
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. JOBS (O Histórico de Tarefas)
// Para você ter um log do que foi gerado (substitui o log do terminal)
export const jobs = pgTable('jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  clientId: uuid('client_id').references(() => clients.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  
  campaignName: text('campaign_name'),
  taskName: text('task_name'),
  status: text('status').default('PENDING'), // PENDING, RUNNING, APPROVAL, DONE
  
  // O resultado final (links, textos)
  output: jsonb('output'),
  
  createdAt: timestamp('created_at').defaultNow(),
});