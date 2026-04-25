import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { tenants, clients, users } from './schema';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não definida no .env');
}

// CONEXÃO
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

// --- AJUSTE ESTE CAMINHO PARA APONTAR PARA SUA PASTA IAGENCIA-CORE ---
// Assumindo que 'projeto' e 'iagencia-core' estão lado a lado no 'meu_app'
const IAGENCIA_DATA_PATH = path.resolve(__dirname, '../../iagencia-core/data'); 

async function main() {
  console.log(`🌱 Iniciando Seed Inteligente a partir de: ${IAGENCIA_DATA_PATH}`);

  if (!fs.existsSync(IAGENCIA_DATA_PATH)) {
    throw new Error(`Pasta de dados não encontrada em: ${IAGENCIA_DATA_PATH}`);
  }

  // 1. LIMPEZA
  console.log('🧹 Limpando banco de dados...');
  await db.delete(users);
  await db.delete(clients);
  await db.delete(tenants);

  // 2. LER TENANTS (Agências)
  const tenantsPath = path.join(IAGENCIA_DATA_PATH, 'tenants');
  if (fs.existsSync(tenantsPath)) {
    const tenantFolders = fs.readdirSync(tenantsPath);

    for (const tenantSlug of tenantFolders) {
      const tenantDir = path.join(tenantsPath, tenantSlug);
      
      // Ignora arquivos soltos (ex: .DS_Store), pega só pastas
      if (!fs.statSync(tenantDir).isDirectory()) continue;

      console.log(`\n🏢 Processando Agência: ${tenantSlug}`);

      // Tenta ler config da agência (se existir) ou usa padrão
      let tenantName = tenantSlug; // Fallback
      const tenantConfigFile = path.join(tenantDir, 'config.json');
      if (fs.existsSync(tenantConfigFile)) {
        const conf = JSON.parse(fs.readFileSync(tenantConfigFile, 'utf-8'));
        if (conf.brand_name) tenantName = conf.brand_name;
      }

      // INSERE AGÊNCIA NO BANCO
      const [newTenant] = await db.insert(tenants).values({
        name: tenantName,
        slug: tenantSlug,
      }).returning();

      // 3. LER CLIENTES DA AGÊNCIA (Subpastas)
      const clientsDir = path.join(tenantDir, 'clients');
      if (fs.existsSync(clientsDir)) {
        const clientFolders = fs.readdirSync(clientsDir);

        for (const clientSlug of clientFolders) {
          const clientDir = path.join(clientsDir, clientSlug);
          if (!fs.statSync(clientDir).isDirectory()) continue;

          console.log(`   📂 Migrando Cliente: ${clientSlug}`);

          // Ler config.json
          let configData = {};
          let walletBalance = '0.00';
          let clientName = clientSlug;

          try {
            const configPath = path.join(clientDir, 'config.json');
            if (fs.existsSync(configPath)) {
              configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
              // Extrai dados úteis do JSON para colunas dedicadas
              // @ts-ignore
              if (configData.brand_name) clientName = configData.brand_name;
              // @ts-ignore
              if (configData.wallet_balance) walletBalance = String(configData.wallet_balance);
              // @ts-ignore
              if (configData.wallet?.balance) walletBalance = String(configData.wallet.balance);
            }
          } catch (e) { console.error(`Erro lendo config de ${clientSlug}`, e); }

          // Ler prompts.json
          let promptsData = {};
          try {
            const promptsPath = path.join(clientDir, 'prompts.json');
            if (fs.existsSync(promptsPath)) {
              promptsData = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));
            }
          } catch (e) { console.error(`Erro lendo prompts de ${clientSlug}`, e); }

          // INSERE CLIENTE NO BANCO
          await db.insert(clients).values({
            tenantId: newTenant.id,
            name: clientName,
            slug: clientSlug,
            config: configData,
            prompts: promptsData,
            walletBalance: walletBalance,
          });
        }
      }

      // 4. LER USUÁRIOS DA AGÊNCIA (users.json)
      const usersFile = path.join(tenantDir, 'users.json');
      if (fs.existsSync(usersFile)) {
        console.log(`   👥 Migrando Usuários de ${tenantSlug}...`);
        try {
          const usersList = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
          for (const u of usersList) {
            await db.insert(users).values({
              tenantId: newTenant.id,
              name: u.name,
              email: u.email,
              passwordHash: u.password_hash || '123456',
              role: u.role || 'user',
              allowedClients: u.client_access || [],
            });
          }
        } catch (e) { console.error('Erro ao ler users.json', e); }
      }
    }
  }

  // 5. LER USUÁRIOS DO SISTEMA (internal_users.json) - Opcional, cria como Super Admins
  const sysUsersFile = path.join(IAGENCIA_DATA_PATH, 'system', 'internal_users.json');
  if (fs.existsSync(sysUsersFile)) {
    console.log('\n🔐 Migrando Usuários Internos do Sistema...');
    try {
      const sysUsers = JSON.parse(fs.readFileSync(sysUsersFile, 'utf-8'));
      // Para usuários internos, não vinculamos a Tenant específico (null) ou criamos um tenant "Admin"
      // Aqui vou deixar null para representar "Super Admin Global"
      for (const u of sysUsers) {
         // Verifica se já não foi inserido na etapa anterior para evitar duplicação de email unique
         // Em um script real, faríamos um "upsert"
         await db.insert(users).values({
            tenantId: null, 
            name: u.name,
            email: u.email,
            passwordHash: u.password_hash || 'admin',
            role: 'admin',
            allowedClients: ['*']
         }).onConflictDoNothing({ target: users.email }); 
    }
    } catch (e) { console.error('Erro ao ler internal_users.json', e); }
  }

  console.log('\n✅ Seed Inteligente Finalizado!');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erro Fatal:', err);
  process.exit(1);
});