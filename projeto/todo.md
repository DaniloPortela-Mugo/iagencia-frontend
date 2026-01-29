# TODO - Plataforma de Gestão de Campanhas com IA

## Infraestrutura e Autenticação
- [x] Configurar schema do banco de dados com todas as tabelas
- [x] Implementar sistema de autenticação e controle de acesso por função
- [x] Configurar integração com APIs de IA (ChatGPT, geração de imagens, etc.)

## Gestão de Clientes
- [x] Criar página de listagem de clientes
- [x] Implementar funcionalidade de adicionar novo cliente
- [x] Criar página de configuração de campanha por cliente
- [x] Implementar upload de materiais e templates
- [x] Configurar links de redes sociais e sites para monitoramento

## Seção 1: PIT (Pedido Interno de Trabalho)
- [x] Criar formulário de PIT com briefing interativo
- [x] Implementar seleção de responsáveis
- [x] Sistema de atribuição de tarefas
- [x] Validação de campos obrigatórios do briefing

## Seção 2: Planejamento
- [x] Criar calendário de postagens
- [x] Implementar cronograma de veiculação de filmes e programas
- [x] Adicionar cronograma de filmagens externas
- [x] Sistema de agendamento de gravações com cliente

## Seção 3: Criação
- [x] Implementar agente de redação com IA
- [x] Criar board Kanban (Fazer, Em aprovação, Feito)
- [x] Sistema de aprovação de conteúdo
- [ ] Integração com APIs de geração de imagem
- [ ] Integração com APIs de geração de vídeo
- [ ] Integração com APIs de geração de áudio/trilhas
- [ ] Upload e gestão de templates de Direção de Arte
- [ ] Integração com API do Canva

## Seção 4: Mídia
- [x] Criar calendário de mídia
- [ ] Sistema de priorização de conteúdos
- [ ] Funcionalidade de upload/download de arquivos
- [ ] Sistema de envio para redes sociais
- [ ] Sistema de envio para emissoras de TV e rádio

## Seção 5: Produção
- [x] Criar calendário editável de eventos
- [x] Implementar programação de produção de conteúdo
- [x] Quadro de responsabilidades por tarefa
- [x] Sistema de atribuição de equipes

## Seção 6: Performance
- [x] Dashboard de KPIs de redes sociais
- [x] Gráficos de engajamento
- [x] Métricas de alcance e impressões
- [x] Análise comparativa de performance

## Seção 7: Clipping
- [x] Sistema de monitoramento de sites configurados
- [x] Resumo automático de matérias com links
- [x] Monitoramento de postagens de concorrentes
- [ ] Sistema de alertas para eventos relevantes

## Chat com IA
- [x] Implementar chat integrado em cada seção
- [x] Integração com ChatGPT 5.2 via API
- [ ] Funcionalidade de copiar/colar conteúdo
- [ ] Sistema de histórico de conversas

## Interface e UX
- [x] Criar layout principal com navegação
- [x] Implementar dashboard inicial
- [ ] Design responsivo para todas as páginas
- [x] Sistema de notificações
- [x] Feedback visual para ações do usuário

## Bugs
- [x] Corrigir erro de tags <a> aninhadas nos componentes Link

## Seção de Planejamento - Calendário Interativo
- [x] Criar tabela de eventos no banco de dados
- [x] Implementar procedures tRPC para CRUD de eventos
- [x] Criar componente de calendário interativo
- [x] Implementar visualização mensal/semanal/diária
- [x] Adicionar funcionalidade de arrastar e soltar eventos
- [x] Criar modal para criação/edição de eventos
- [x] Filtrar eventos por tipo (postagem, veiculação, gravação, etc.)
- [x] Integrar com clientes existentes

## Drag and Drop no Calendário
- [x] Implementar drag and drop para eventos do calendário
- [x] Atualizar data do evento ao soltar em novo dia
- [x] Feedback visual durante o arrasto
- [x] Confirmação de reagendamento

## Seção de Mídia - Veiculações TV/Rádio
- [x] Criar tabela de veiculações de mídia no banco de dados
- [x] Criar tabela de canais/emissoras
- [x] Implementar procedures tRPC para CRUD de veiculações
- [x] Criar página de Mídia com cronograma de veiculações
- [x] Implementar gestão de custos de inserção
- [x] Criar resumo financeiro por período
- [x] Filtrar veiculações por canal, cliente e período
- [ ] Visualização em formato de grade horária

## Seção de Produção - Cronograma de Eventos
- [x] Criar tabela de checklist de equipamentos no banco de dados
- [x] Implementar procedures tRPC para gestão de produção
- [x] Criar página de Produção com cronograma de eventos
- [x] Implementar visualização em calendário/timeline
- [x] Adicionar checklist de equipamentos
- [x] Adicionar gestão de equipe de produção

## Sistema de Notificações Automáticas
- [x] Criar tabela de notificações no banco de dados
- [x] Implementar procedures tRPC para gestão de notificações
- [x] Criar central de notificações na interface
- [x] Implementar lembretes automáticos para eventos (24h e 1h antes)
- [x] Adicionar sino de notificações no header
- [x] Marcar notificações como lidas

## Configuração de Campanha por Cliente
- [x] Criar tabelas de configuração de campanha no banco de dados
- [x] Implementar procedures tRPC para gestão de configurações
- [x] Criar página de configuração de campanha por cliente
- [x] Adicionar gestão de redes sociais (Instagram, Facebook, Twitter, TikTok, YouTube)
- [x] Adicionar gestão de concorrentes para monitoramento
- [x] Adicionar configuração de canais de mídia preferidos
- [x] Integrar configurações com outras seções da plataforma

## Integração Clipping com Fontes de Notícias
- [x] Atualizar página de Clipping com filtro por cliente
- [x] Buscar fontes de notícias configuradas para cada cliente
- [x] Filtrar matérias automaticamente por palavras-chave do cliente
- [x] Exibir fonte de origem de cada matéria
- [x] Adicionar indicador visual de relevância por cliente

## Busca Automática de Notícias
- [x] Criar serviço de busca de notícias usando IA
- [x] Implementar procedure para buscar notícias por cliente
- [x] Criar histórico de buscas realizadas
- [x] Adicionar botão de busca manual na página de Clipping
- [x] Implementar análise de relevância das notícias encontradas
- [x] Salvar automaticamente notícias relevantes no clipping

## Agendamento Automático de Busca de Notícias
- [x] Criar tabela de configuração de agendamento por cliente
- [x] Implementar sistema de cron/scheduler no backend
- [x] Criar endpoint para executar buscas agendadas
- [x] Adicionar interface para configurar frequência de busca (6h, 12h, 24h)
- [x] Implementar log de execuções automáticas
- [x] Adicionar toggle para ativar/desativar busca automática por cliente

## Dashboard de Monitoramento de Buscas Agendadas
- [x] Criar página de monitoramento centralizado
- [x] Exibir lista de todos os clientes com busca agendada
- [x] Mostrar status de cada agendamento (ativo/inativo)
- [x] Exibir métricas de execução (total, sucesso, falha)
- [x] Adicionar gráfico de execuções por período
- [x] Mostrar próximas execuções programadas
- [x] Exibir histórico recente de todas as execuções
- [x] Adicionar ações rápidas (ativar/desativar, executar agora)


## Upload de Materiais e Templates
- [x] Criar tabela de materiais/arquivos no banco de dados
- [x] Implementar procedures tRPC para upload e gestão de arquivos
- [x] Integrar com S3 para armazenamento de arquivos
- [x] Criar página/aba de materiais na configuração do cliente
- [x] Implementar upload de múltiplos arquivos
- [x] Adicionar categorização de materiais (logo, template, documento, imagem, vídeo)
- [x] Criar visualização de galeria de materiais
- [x] Implementar download e exclusão de arquivos


## Versionamento de Materiais
- [x] Criar tabela de versões de materiais no banco de dados
- [x] Implementar procedures tRPC para gestão de versões
- [x] Adicionar botão de "Nova Versão" na interface de materiais
- [x] Criar modal de histórico de versões
- [x] Implementar visualização de versões anteriores
- [x] Adicionar funcionalidade de restaurar versão anterior
- [ ] Exibir número da versão atual em cada material


## Biblioteca Global de Materiais
- [x] Implementar procedure para listar todos os materiais de todos os clientes
- [x] Criar página de biblioteca global com grid de materiais
- [x] Adicionar busca por nome de arquivo e descrição
- [x] Implementar filtros por categoria (logo, template, documento, imagem, vídeo, áudio)
- [x] Implementar filtros por cliente
- [x] Adicionar filtro por período de upload
- [x] Criar visualização em grid e lista
- [x] Adicionar ordenação por data, nome e tamanho
- [x] Exibir estatísticas globais de materiais


## Sistema de Aprovação de Conteúdo
- [x] Criar tabela de solicitações de aprovação no banco de dados
- [x] Criar tabela de comentários/feedback de aprovação
- [x] Implementar procedures tRPC para fluxo de aprovação
- [x] Criar página de aprovações pendentes
- [x] Implementar visualização de conteúdo para aprovação
- [x] Adicionar sistema de comentários e feedback
- [x] Implementar notificações de aprovação/rejeição
- [x] Criar histórico de aprovações por conteúdo
- [x] Adicionar filtros por status (pendente, aprovado, rejeitado, revisão)
- [x] Adicionar link na navegação lateral
- [x] Criar 15 testes unitários para o sistema de aprovação
- [x] Integrar aprovações com o Kanban de criação


## Integração Kanban-Aprovação
- [x] Adicionar campo approvalId na tabela de conteúdos do Kanban
- [x] Criar procedure para enviar conteúdo do Kanban para aprovação
- [x] Criar procedure para sincronizar status entre Kanban e Aprovação
- [x] Adicionar botão "Enviar para Aprovação" nos cards do Kanban
- [x] Exibir status de aprovação nos cards do Kanban
- [x] Atualizar coluna do Kanban automaticamente quando aprovação mudar
- [x] Adicionar link para ver detalhes da aprovação no card
- [x] Criar testes unitários para a integração (24 testes)


## Funcionalidade de Copiar/Colar Conteúdo
- [x] Adicionar botão de copiar em cada mensagem da IA no chat
- [x] Implementar feedback visual ao copiar (toast de sucesso)
- [x] Adicionar botão de colar conteúdo no campo de texto
- [x] Callback onCopyContent para integração com outros componentes

## Sistema de Histórico de Conversas com IA
- [x] Adicionar campos title e isArchived na tabela ai_conversations
- [x] Implementar procedure para salvar conversa
- [x] Implementar procedure para listar conversas anteriores por usuário
- [x] Adicionar painel lateral (Sheet) com histórico de conversas
- [x] Permitir carregar conversa anterior
- [x] Adicionar opção de deletar conversa do histórico
- [x] Botões Nova/Salvar no chat
- [x] Geração automática de título baseado na primeira mensagem


## Expansão do Chat IA para Todas as Seções
- [ ] Adicionar chat com histórico na seção Estratégia
- [ ] Adicionar chat com histórico na seção Direção de Arte (se existir)
- [x] Adicionar chat com histórico na seção Produção
- [x] Adicionar chat com histórico na seção Mídia
- [x] Adicionar chat com histórico na seção Planejamento
- [x] Garantir que todas as seções usem o componente AIChatBox atualizado
- [ ] Testar copiar/colar e histórico em todas as seções
