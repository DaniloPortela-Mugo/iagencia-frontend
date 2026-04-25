import React, { useState, useEffect, useRef } from 'react';

// Main App component for the workflow automation simulation
function App() {
  // State variables to manage the workflow stages and data
  const [sheetInput, setSheetInput] = useState(''); // Simula dados de uma planilha do Google Sheets
  const [currentStage, setCurrentStage] = useState('idle'); // Rastreia o estágio atual do fluxo de trabalho
  const [generatedPrompt, setGeneratedPrompt] = useState(''); // Armazena o prompt gerado simulado
  const [mediaType, setMediaType] = useState('video'); // 'video' ou 'image'
  // Adicionado Kling e Higgsfield às plataformas relevantes
  const [selectedPlatform, setSelectedPlatform] = useState('Fal.AI'); // Ex: 'Fal.AI', 'Midjourney', 'Gemini', 'Runway', 'Kling', 'Higgsfield'
  const [mediaStatus, setMediaStatus] = useState('pending'); // Armazena o estado simulado de geração de mídia
  const [mediaUrl, setMediaUrl] = useState(''); // Armazena o URL da mídia simulada (vídeo ou imagem)
  const [errorMessage, setErrorMessage] = useState(''); // Para exibir quaisquer erros de simulação
  const [showResetButton, setShowResetButton] = useState(false); // Controla a visibilidade do botão de reset

  // Ref para manter o ID do intervalo para monitoramento, permitindo limpeza
  const intervalRef = useRef(null);

  // Define plataformas disponíveis com base no tipo de mídia, agora incluindo Kling e Higgsfield
  const videoPlatforms = ['Fal.AI', 'Runway', 'Kling', 'Higgsfield'];
  const imagePlatforms = ['Midjourney', 'Gemini', 'Higgsfield'];

  // Valores estáticos para URL da Planilha Google e caminho da pasta local (apenas para exibição)
  const googleSheetUrl = 'https://docs.google.com/spreadsheets/d/12CEcHn95YWOzsALBhq_BkpXfRxd48u6i2PGZzh2nYWw/edit?usp=sharing';
  const localFolderPath = '/Users/daniloportela/Desktop/VOX Strategy/conteudo';

  // Efeito para redefinir a plataforma selecionada quando o tipo de mídia muda
  useEffect(() => {
    if (mediaType === 'video') {
      setSelectedPlatform(videoPlatforms[0]);
    } else {
      setSelectedPlatform(imagePlatforms[0]);
    }
  }, [mediaType]);

  // --- Etapa 1: Gatilho da Planilha Google e Geração de Prompt ---
  // Dentro do seu App.js (ou App.jsx)

// ... (imports e outros states e funções existentes) ...

const startWorkflow = async () => {
    setErrorMessage('');
    if (!sheetInput.trim()) {
        setErrorMessage('Por favor, insira alguns dados na planilha para iniciar o fluxo de trabalho.');
        return;
    }

    setCurrentStage('sending_to_backend'); // Novo estágio para indicar comunicação com o backend
    setGeneratedPrompt(''); // Limpa o prompt anterior
    setMediaStatus('pending'); // Redefine o status da mídia
    setMediaUrl(''); // Limpa o URL da mídia

    try {
        // A URL do seu backend. Certifique-se de que corresponde à porta em que o backend está a correr.
        const backendUrl = 'http://localhost:3001/api/start-batch-workflow';

        // Dados a serem enviados para o backend
        const dataToSend = {
            sheetInput: sheetInput,
            mediaType: mediaType,
            selectedPlatform: selectedPlatform,
            // Opcionalmente, pode enviar o URL da planilha se o backend precisar dele
            googleSheetUrl: googleSheetUrl // Já está definido no estado do frontend
        };

        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao comunicar com o backend.');
        }

        const result = await response.json();
        console.log('Resposta do Backend:', result);

        // Agora, o frontend pode exibir o resultado do backend.
        // Para simplificar a simulação no frontend, vamos assumir que o backend enviou um URL
        // real ou simulado e que o processo está "completo" do ponto de vista do frontend.
        // Em um app real, o backend enviaria o URL da mídia gerada após o processo completo.

        if (result.results && result.results.length > 0) {
            // Pegar o primeiro resultado para exibição no simulador
            const firstResult = result.results[0];
            setGeneratedPrompt(firstResult.prompt); // O prompt usado no backend para a primeira entrada
            setMediaUrl(firstResult.url); // O URL gerado (simulado) pelo backend
            setMediaStatus('ready'); // Indicar que a mídia está pronta
            setCurrentStage('complete'); // Marcar o fluxo como completo
            setShowResetButton(true);
        } else {
             setErrorMessage('O backend não retornou resultados de mídia.');
             setCurrentStage('idle'); // Voltar ao estágio inicial em caso de erro/sem resultados
        }

    } catch (error) {
        console.error('Erro ao iniciar o fluxo de trabalho via backend:', error);
        setErrorMessage(`Falha na comunicação com o backend: ${error.message}. Verifique se o servidor backend está a funcionar.`);
        setCurrentStage('idle'); // Voltar ao estágio inicial em caso de erro
    }
};

  const simulatePromptGeneration = (data, type, platform) => {
    // Simula uma operação assíncrona para a geração de prompt
    setTimeout(() => {
      let prompt;
      if (type === 'video') {
        prompt = `Gerar um vídeo sobre: "${data}". Duração: 30s. Estilo: Informativo. Plataforma: ${platform}.`;
      } else {
        prompt = `Gerar uma imagem de: "${data}". Estilo: Fotorrealista. Plataforma: ${platform}.`;
      }
      setGeneratedPrompt(prompt); // Define o prompt simulado
      setCurrentStage('submitting_request'); // Move para a etapa de submissão da solicitação
      simulateMediaRequest(prompt, type, platform); // Simula a submissão da solicitação de mídia
    }, 1500); // Simula 1.5 segundos de atraso para a geração de prompt
  };

  // --- Etapa 2: Preparar e Enviar Solicitação de Mídia ---
  const simulateMediaRequest = (prompt, type, platform) => {
    // Simula o envio de uma solicitação POST para a API da plataforma selecionada
    console.log(`Simulando envio de pedido de ${type} para a API de ${platform} com prompt: ${prompt}`);
    setTimeout(() => {
      setMediaStatus('pending'); // Define o status da mídia como pendente
      setCurrentStage('monitoring'); // Move para a etapa de monitoramento
      startMonitoring(type, platform); // Inicia o monitoramento do status da mídia
    }, 2000); // Simula 2 segundos de atraso para a submissão da solicitação
  };

  // --- Etapa 3: Monitorar o Status da Mídia ---
  const startMonitoring = (type, platform) => {
    let attempts = 0;
    const maxAttempts = type === 'video' ? 5 : 3; // Vídeos podem demorar mais para serem gerados

    // Limpa qualquer intervalo existente para evitar que vários intervalos sejam executados
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      attempts++;
      console.log(`Verificando estado de ${type}... Tentativa ${attempts} na plataforma ${platform}`);
      if (attempts >= maxAttempts) {
        clearInterval(intervalRef.current); // Para de monitorar após o número máximo de tentativas
        setMediaStatus('ready'); // Simula que a mídia está pronta
        setCurrentStage('retrieving_url'); // Move para a etapa de recuperação de URL
        simulateFetchMediaUrl(type); // Simula a busca do URL da mídia
      } else {
        // Em um cenário real, isso consultaria a API da plataforma escolhida
        setMediaStatus(`Ainda pendente... (${maxAttempts - attempts} tentativas restantes)`);
      }
    }, type === 'video' ? 3000 : 2000); // Simula verificação a cada 3s para vídeo, 2s para imagem
  };

  // Limpa o intervalo quando o componente é desmontado ou o estágio muda
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Executa apenas na montagem e desmontagem

  // --- Etapa 4: Recuperar e Atualizar Resultados ---
  const simulateFetchMediaUrl = (type) => {
    setTimeout(() => {
      let url;
      if (type === 'video') {
        url = `https://app.runwayml.com/video-tools/teams/danilopor/${Math.random().toString(36).substring(2, 15)}`; // Gera um URL de vídeo simulado
      } else {
        // Imagem de espaço reservado para demonstração. Em um aplicativo real, isso seria um URL do Midjourney/Gemini
        url = `https://placehold.co/400x300/e0e0e0/000000?text=Imagem+Gerada`;
      }
      setMediaUrl(url); // Define o URL da mídia simulada
      setCurrentStage('updating_sheet'); // Move para a etapa de atualização da planilha
      simulateUpdateSheet(url, generatedPrompt); // Simula a atualização da planilha
    }, 1000); // Simula 1 segundo de atraso para a recuperação do URL
  };

  const simulateUpdateSheet = (url, prompt) => {
    setTimeout(() => {
      console.log(`Simulando atualização da planilha com URL: ${url} e Prompt: ${prompt}`);
      console.log(`Simulando salvamento na pasta local: ${localFolderPath}/conteudo_${new Date().toLocaleString('pt-BR', { month: 'long' })}`);
      setCurrentStage('complete'); // Fluxo de trabalho completo
      setShowResetButton(true); // Mostra o botão de reset
    }, 1500); // Simula 1.5 segundos de atraso para a atualização da planilha
  };

  // Função de reset para limpar todos os estados e reiniciar a simulação
  const resetWorkflow = () => {
    clearInterval(intervalRef.current); // Garante que o intervalo seja limpo
    setSheetInput('');
    setCurrentStage('idle');
    setGeneratedPrompt('');
    setMediaType('video'); // Redefine para o padrão
    setSelectedPlatform(videoPlatforms[0]); // Redefine para o padrão
    setMediaStatus('pending');
    setMediaUrl('');
    setErrorMessage('');
    setShowResetButton(false);
  };

  // Função auxiliar para renderizar o status de um estágio
  const renderStage = (stageName, description, isActive) => (
    <div className={`p-4 rounded-lg shadow-md mb-4 transition-all duration-300 ease-in-out ${isActive ? 'bg-indigo-100 border-l-4 border-indigo-500' : 'bg-gray-50 border-l-4 border-gray-200'}`}>
      <h3 className={`font-semibold text-lg ${isActive ? 'text-indigo-700' : 'text-gray-600'}`}>{stageName}</h3>
      <p className="text-gray-500">{description}</p>
      {isActive && <span className="text-indigo-500 text-sm font-medium">Em andamento...</span>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Simulador de Fluxo de Trabalho de Mídia Automatizado</h1>

        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
            <span className="block sm:inline">{errorMessage}</span>
          </div>
        )}

        {/* Entrada do Fluxo de Trabalho */}
        <div className="mb-6 p-4 border rounded-lg bg-blue-50">
          <h2 className="text-xl font-semibold text-blue-800 mb-3">Dados da Planilha (Simulado - Etapa 1: Gatilho)</h2>
          <textarea
            className="w-full p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y min-h-[80px] text-gray-700"
            placeholder="Ex: 'Recursos do nosso novo produto X', 'Notícias da empresa para o Q3', 'Imagem de um gato astronauta'"
            value={sheetInput}
            onChange={(e) => setSheetInput(e.target.value)}
            disabled={currentStage !== 'idle' && currentStage !== 'complete'}
          ></textarea>

          <div className="mt-4 flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
            {/* Seleção do Tipo de Mídia */}
            <div className="flex-1">
              <label htmlFor="mediaType" className="block text-gray-700 text-sm font-bold mb-2">
                Tipo de Mídia:
              </label>
              <select
                id="mediaType"
                className="w-full p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                value={mediaType}
                onChange={(e) => {
                  setMediaType(e.target.value);
                  // Redefine o estado para ocioso se o tipo mudar durante a configuração do fluxo de trabalho
                  if (currentStage !== 'idle' && currentStage !== 'complete') {
                    resetWorkflow();
                  }
                }}
                disabled={currentStage !== 'idle' && currentStage !== 'complete'}
              >
                <option value="video">Vídeo</option>
                <option value="image">Imagem</option>
              </select>
            </div>

            {/* Seleção de Plataforma */}
            <div className="Runway">
              <label htmlFor="platform" className="block text-gray-700 text-sm font-bold mb-2">
                Plataforma:
              </label>
              <select
                id="platform"
                className="w-full p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-700"
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                disabled={currentStage !== 'idle' && currentStage !== 'complete'}
              >
                {mediaType === 'video' ? (
                  videoPlatforms.map((platform) => (
                    <option key={platform} value={platform}>{platform}</option>
                  ))
                ) : (
                  imagePlatforms.map((platform) => (
                    <option key={platform} value={platform}>{platform}</option>
                  ))
                )}
              </select>
            </div>
          </div>

          <button
            onClick={startWorkflow}
            className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={currentStage !== 'idle' && currentStage !== 'complete'}
          >
            Adicionar Linha & Iniciar Fluxo de Trabalho
          </button>
        </div>

        {/* Exibição para URL da Planilha Google e Caminho da Pasta Local */}
        <div className="mb-6 p-4 border rounded-lg bg-gray-50 text-gray-700 text-sm">
          <p className="font-semibold mb-2">Detalhes de Integração (Manuseados pelo Backend):</p>
          <p className="mb-1">
            <span className="font-medium">Planilha de Entrada:</span> <a href={googleSheetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{googleSheetUrl}</a>
          </p>
          <p>
            <span className="font-medium">Caminho da Pasta de Saída (Local):</span> {localFolderPath}/conteudo_\[mês atual]
          </p>
          <p className="text-xs mt-2 italic">
            * Em uma aplicação real, o backend leria a planilha e salvaria os arquivos diretamente neste caminho.
          </p>
        </div>

        {/* Exibição dos Estágios do Fluxo de Trabalho */}
        <div className="space-y-4">
          {renderStage("Etapa 1: Geração de Gatilho e Prompt", "Uma nova linha na planilha do Google Sheets aciona a geração de um prompt.", currentStage === 'generating_prompt')}
          {currentStage === 'generating_prompt' && generatedPrompt && (
            <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 border border-gray-200 ml-6">
              <p className="font-medium">Prompt Gerado:</p>
              <p className="italic">{generatedPrompt}</p>
            </div>
          )}

          {renderStage("Etapa 2: Preparar e Enviar Pedido de Mídia", "Variáveis são definidas e um pedido é enviado para a plataforma selecionada para gerar a mídia.", currentStage === 'submitting_request')}
          {currentStage === 'submitting_request' && (
            <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 border border-gray-200 ml-6">
              <p className="font-medium">Estado do Pedido:</p>
              <p>Enviando pedido de {mediaType} para {selectedPlatform}...</p>
            </div>
          )}

          {renderStage("Etapa 3: Monitorar o Estado da Mídia", "O estado da mídia é verificado repetidamente até que esteja pronto.", currentStage === 'monitoring' || currentStage === 'retrieving_url')}
          {(currentStage === 'monitoring' || currentStage === 'retrieving_url') && (
            <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 border border-gray-200 ml-6">
              <p className="font-medium">Estado da Mídia:</p>
              <p>{mediaStatus}</p>
            </div>
          )}

          {renderStage("Etapa 4: Recuperar e Atualizar Resultados", "O URL da mídia é obtido e a planilha é atualizada, e o arquivo é salvo localmente.", currentStage === 'updating_sheet' || currentStage === 'complete')}
          {currentStage === 'complete' && mediaUrl && (
            <div className="bg-green-50 p-3 rounded-md text-sm text-green-700 border border-green-200 ml-6">
              <p className="font-medium">Fluxo de Trabalho Concluído!</p>
              <p>URL da {mediaType}:
                {mediaType === 'image' ? (
                  <img src={mediaUrl} alt="Mídia Gerada" className="mt-2 max-w-full h-auto rounded-md shadow-sm" />
                ) : (
                  <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{mediaUrl}</a>
                )}
              </p>
              <p>Planilha atualizada com sucesso.</p>
              <p className="mt-2 text-xs italic">
                * Em uma aplicação real, o arquivo seria salvo em: <br />
                `{localFolderPath}/conteudo_{new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(' de ', '_')}`
              </p>
            </div>
          )}
        </div>

        {/* Botão de Reset */}
        {showResetButton && (
          <div className="mt-8 text-center">
            <button
              onClick={resetWorkflow}
              className="bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
            >
              Reiniciar Fluxo de Trabalho
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
