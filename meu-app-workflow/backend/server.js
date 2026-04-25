// backend/server.js
// Este é um exemplo de código de backend usando Node.js com Express.
// Ele simula a integração com as APIs de mídia e o salvamento local.
// Para uma aplicação real, você precisaria substituir as simulações por chamadas reais às APIs e gestão de arquivos.

// 1. Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs/promises'); // Usamos fs/promises para operações assíncronas de sistema de arquivos

const app = express();
const port = 3001; // O backend rodará na porta 3001 para não colidir com o frontend (geralmente 3000)

// Middleware
// Habilita o CORS para permitir requisições do seu frontend React (que provavelmente estará em http://localhost:3000)
app.use(cors({
    origin: 'http://localhost:3000' // Ajuste para o URL do seu frontend em produção
}));
app.use(bodyParser.json()); // Permite que o servidor analise corpos de requisição JSON

// --- Configurações de API (Lendo de variáveis de ambiente) ---
// NUNCA COLOQUE AS SUAS CHAVES DE API AQUI DIRETAMENTE EM PRODUÇÃO!
// As chaves são carregadas de process.env graças ao 'dotenv'.
const apiKeys = {
    midjourney: process.env.MIDJOURNEY_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    runway: process.env.RUNWAY_API_KEY,
    kling: process.env.KLING_API_KEY,
    higgsfield: process.env.HIGGSFIELD_API_KEY,
    googleSheets: process.env.GOOGLE_SHEETS_API_KEY, // Para acesso à API do Google Sheets
};

// --- Caminho da Pasta Local (Ajuste para o seu caminho real no servidor) ---
// Lendo o caminho da pasta de saída de uma variável de ambiente.
const BASE_OUTPUT_FOLDER = process.env.BASE_OUTPUT_FOLDER || path.join(__dirname, 'generated_content'); // Fallback para pasta local se a variável não for definida

// --- Função Auxiliar: Obter o nome da pasta de saída com base no mês ---
const getMonthlyFolderName = () => {
    const date = new Date();
    const month = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(' de ', '_');
    return `conteudo_${month}`;
};

// --- Função Auxiliar: Simular Chamadas de API de Geração de Mídia ---
// Em uma aplicação real, cada uma destas funções faria uma chamada HTTP real para a API correspondente.
const simulateMediaGeneration = async (prompt, mediaType, platform) => {
    console.log(`[BACKEND] Simulando chamada da API ${platform} para ${mediaType}...`);
    // Aqui você integraria o SDK ou faria uma requisição HTTP para a API real.
    // Ex: import { Midjourney } from 'midjourney-api';
    // const client = new Midjourney(apiKeys.midjourney);
    // const result = await client.generate(prompt);

    // Simulação de atraso para a geração de mídia
    await new Promise(resolve => setTimeout(resolve, mediaType === 'video' ? 10000 : 5000)); // Vídeos demoram mais

    let simulatedUrl;
    if (mediaType === 'video') {
        simulatedUrl = `https://generated-videos.com/${platform}/${Math.random().toString(36).substring(2, 10)}.mp4`;
    } else {
        simulatedUrl = `https://generated-images.com/${platform}/${Math.random().toString(36).substring(2, 10)}.png`;
    }
    console.log(`[BACKEND] Mídia gerada simuladamente. URL: ${simulatedUrl}`);
    return { url: simulatedUrl, status: 'success' };
};

// --- Função Auxiliar: Simular Leitura da Planilha Google ---
// Em uma aplicação real, você usaria a Google Sheets API.
const simulateReadGoogleSheet = async (sheetUrl) => {
    console.log(`[BACKEND] Simulando leitura da planilha Google: ${sheetUrl}`);
    // Ex: const { GoogleApis } = require('googleapis');
    // const sheets = new GoogleApis().sheets({ version: 'v4', auth: apiKeys.googleSheets });
    // const response = await sheets.spreadsheets.values.get({
    //   spreadsheetId: '12CEcHn95YWOzsALBhq_BkpXfRxd48u6i2PGZzh2nYWw',
    //   range: 'Sheet1!A:B', // Ou o range que você precisa
    // });
    // const rows = response.data.values;

    // Simulação de dados da planilha
    const simulatedSheetData = [
        { prompt: "Um gato astronauta a flutuar no espaço", type: "image", platform: "Gemini" },
        { prompt: "Cidade futurista à noite com carros voadores", type: "video", platform: "Runway" },
        { prompt: "Retrato de um dragão amigável em um campo de flores", type: "image", platform: "Midjourney" },
        { prompt: "Pássaros a voar sobre uma paisagem desértica ao pôr do sol", type: "video", platform: "Kling" },
        { prompt: "Um robô chef a cozinhar num restaurante estrelado", type: "image", platform: "Higgsfield" },
    ];
    console.log(`[BACKEND] Planilha lida simuladamente. ${simulatedSheetData.length} entradas.`);
    return simulatedSheetData;
};

// --- Função Auxiliar: Salvar Mídia Localmente ---
const saveMediaLocally = async (mediaUrl, mediaType, prompt) => {
    try {
        const folderName = getMonthlyFolderName();
        const fullFolderPath = path.join(BASE_OUTPUT_FOLDER, folderName);

        // Cria a pasta se ela não existir
        await fs.mkdir(fullFolderPath, { recursive: true });
        console.log(`[BACKEND] Verificou/criou pasta de saída: ${fullFolderPath}`);

        // Em uma aplicação real, você faria download do arquivo do mediaUrl
        // Ex: const response = await fetch(mediaUrl);
        // const buffer = await response.buffer();
        // const fileName = `${Date.now()}_${mediaType}_${prompt.substring(0, 20).replace(/[^a-z0-9]/gi, '_')}.${mediaType === 'video' ? 'mp4' : 'png'}`;
        // await fs.writeFile(path.join(fullFolderPath, fileName), buffer);

        const simulatedFileName = `${Date.now()}_simulacao_${mediaType}.${mediaType === 'video' ? 'mp4' : 'png'}`;
        console.log(`[BACKEND] Simulando salvamento do arquivo: ${path.join(fullFolderPath, simulatedFileName)}`);
        // Aqui, apenas criamos um arquivo dummy para simular o salvamento
        await fs.writeFile(path.join(fullFolderPath, simulatedFileName), `Conteúdo simulado para ${mediaType} gerado a partir de: "${prompt}"`);

        return true; // Sucesso
    } catch (error) {
        console.error(`[BACKEND] Erro ao salvar mídia localmente: ${error.message}`);
        return false; // Falha
    }
};

// --- Rotas da API ---

// Rota principal para iniciar o fluxo de trabalho em massa
app.post('/api/start-batch-workflow', async (req, res) => {
    console.log('[BACKEND] Recebida solicitação para iniciar o fluxo de trabalho em massa.');
    const { googleSheetUrl: sheetUrlFromFrontend } = req.body; // Se o frontend passar o URL da planilha

    try {
        // 1. Simular leitura da planilha (ou usar o dado de entrada do frontend)
        // Note: googleSheetUrl is defined statically in the frontend,
        // but in a real app, the backend might receive it or manage it directly.
        const sheetData = await simulateReadGoogleSheet(googleSheetUrl); // Usando a URL estática por enquanto

        const results = [];
        for (const entry of sheetData) {
            const { prompt, type, platform } = entry;
            console.log(`[BACKEND] Processando entrada: Prompt="${prompt}", Tipo="${type}", Plataforma="${platform}"`);

            try {
                // 2. Simular geração de mídia
                const mediaResult = await simulateMediaGeneration(prompt, type, platform);

                if (mediaResult.status === 'success') {
                    // 3. Simular salvamento local
                    const savedLocally = await saveMediaLocally(mediaResult.url, type, prompt);

                    results.push({
                        prompt,
                        type,
                        platform,
                        url: mediaResult.url,
                        savedLocally,
                        status: 'success'
                    });
                    // 4. (Opcional em um app real) Atualizar a planilha com o URL e o caminho local
                    // Isto exigiria uma integração mais complexa com a API do Google Sheets para UPDATE.
                } else {
                    results.push({
                        prompt, type, platform, status: 'failed', message: 'Geração de mídia falhou'
                    });
                }
            } catch (mediaError) {
                console.error(`[BACKEND] Erro ao processar entrada de mídia: ${mediaError.message}`);
                results.push({
                    prompt, type, platform, status: 'error', message: mediaError.message
                });
            }
        }

        res.json({ message: 'Processamento em massa concluído (simulado).', results });

    } catch (error) {
        console.error(`[BACKEND] Erro no fluxo de trabalho em massa: ${error.message}`);
        res.status(500).json({ error: 'Erro interno do servidor durante o fluxo de trabalho em massa.', details: error.message });
    }
});


// Rota simples para verificar se o backend está a funcionar
app.get('/api/status', (req, res) => {
    res.json({ status: 'Backend a funcionar', version: '1.0' });
});

// Iniciar o servidor
app.listen(port, () => {
    console.log(`Backend a ouvir em http://localhost:${port}`);
    console.log(`Para iniciar, execute 'node backend/server.js' (ou 'nodemon backend/server.js' se tiver nodemon)`);
});
