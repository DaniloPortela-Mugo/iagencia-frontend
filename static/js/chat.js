document.addEventListener('DOMContentLoaded', () => {
  const messageInput = document.getElementById('mensagem');
  const agentSelect   = document.getElementById('agent-select');
  const aiModelSelect = document.getElementById('ai-model-select');
  const chatOutput    = document.getElementById('chat-output');

  window.enviarMensagem = async () => {
    const text  = messageInput.value.trim();
    const agent = agentSelect.value;
    const model = aiModelSelect.value;

    if (!agent || !model || !text) {
      alert('Selecione agente, modelo e digite a mensagem.');
      return;
    }

    // Limpando mensagens antigas ou adicionando loader
    const placeholder = document.createElement('div');
    placeholder.className = 'mensagem';
    placeholder.textContent = 'Enviando...';
    chatOutput.appendChild(placeholder);
    chatOutput.scrollTop = chatOutput.scrollHeight;

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id:   cliente_id_global,
          agent_name:   agent,
          ai_model:     model,
          message:      text
        })
      });

      const data = await resp.json();
      if (resp.ok && data.response) {
        // Renderiza Markdown como HTML
        placeholder.innerHTML = marked.parse(data.response);
      } else {
        placeholder.textContent = data.error || 'Erro inesperado.';
      }
    } catch(err) {
      placeholder.textContent = 'Falha de comunicação.';
      console.error(err);
    }

    messageInput.value = '';
    chatOutput.scrollTop = chatOutput.scrollHeight;
  };
});
