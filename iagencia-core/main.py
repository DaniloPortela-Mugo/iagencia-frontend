from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.prompt_logic import PromptBuilder # Certifique-se que o import está correto
import json

app = FastAPI()

# Configuração de CORS (Permite que o React converse com o Python)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Em produção, troque "*" pelo domínio do seu site
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "IAgência API is running 🚀"}

# --- ROTA DE GERAÇÃO DE ROTEIRO ---
@app.post("/creation/generate-prompt")
async def generate_prompt(request: Request):
    try:
        data = await request.json()
        
        # Chama a lógica que criamos no PromptBuilder
        # Ele retorna uma TUPLA: (texto_humano, json_tecnico)
        human_text, technical_json = PromptBuilder.build(data)
        
        # Debug: Imprime no terminal do servidor para você ver se gerou
        print(f"✅ Roteiro Gerado: {len(human_text)} caracteres")
        
        # RETORNO CORRETO PARA O FRONTEND
        # As chaves 'prompt_pt' e 'prompt_en' devem bater com o que o React espera
        return {
            "prompt_pt": human_text,      # O texto bonito para leitura
            "prompt_en": technical_json   # O JSON técnico oculto
        }

    except Exception as e:
        print(f"❌ Erro na API: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- ROTA DE ENVIO PARA FERRAMENTA (SIMULAÇÃO) ---
@app.post("/creation/send-to-tool")
async def send_to_tool(request: Request):
    try:
        data = await request.json()
        platform = data.get('platform')
        print(f"🚀 Enviando job para {platform}...")
        
        # Aqui entraria a integração real com Midjourney/Veo API
        # Por enquanto, apenas simula sucesso
        
        return {"status": "success", "message": f"Job enviado para {platform}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)