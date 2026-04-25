from __future__ import annotations

import json
from typing import Any, Dict, List

from iagencia.services.openai_client import get_openai_client


def _safe_json_load(text: str) -> Dict[str, Any]:
    """
    Tenta extrair JSON mesmo se vier com texto extra.
    Mantém bem tolerante pra não travar o fluxo.
    """
    text = text.strip()

    if text.startswith("{") and text.endswith("}"):
        return json.loads(text)

    # tenta achar o primeiro bloco JSON
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start : end + 1])

    raise ValueError("Não foi possível parsear JSON do brainstorm.")


def run_brainstorm(
    brief: Dict[str, Any],
    user_inputs: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Brainstorm modo redator:
    - ideias (linhas criativas)
    - conceitos
    - ângulos
    - ganchos / insights
    - exemplos rápidos de headline/CTA
    """

    objective = (brief or {}).get("objective", "").strip() or "Objetivo não informado"
    brand = (brief or {}).get("brand", "").strip()
    audience = (brief or {}).get("audience", "").strip()
    product = (brief or {}).get("product", "").strip()

    tone = (user_inputs or {}).get("tone", "").strip()
    channel = (user_inputs or {}).get("channel", "").strip()
    constraints = (user_inputs or {}).get("constraints", "").strip()

    n_ideas = int((user_inputs or {}).get("n_ideas", 12) or 12)

    system_instructions = (
        "Você é um redator sênior e diretor de criação brasileiro. "
        "Você faz brainstorm com alta originalidade, mas com disciplina estratégica. "
        "Você NÃO entrega texto final longo; entrega caminhos criativos claros e acionáveis."
    )

    schema_hint = {
        "ideas": [
            {
                "title": "Nome do caminho criativo",
                "big_idea": "Conceito central (1 frase)",
                "insight": "O porquê funciona (humano/psicológico)",
                "angle": "Ângulo (benefício, prova, humor, contradição, etc.)",
                "formats": ["Reels", "Carrossel", "Story"],
                "sample_headlines": ["..."],
                "sample_ctas": ["..."],
                "notes": "observações rápidas",
            }
        ],
        "guardrails": {
            "tone": "string",
            "avoid": ["lista do que evitar"],
        },
    }

    prompt = f"""
Objetivo: {objective}
Marca: {brand}
Produto/Serviço: {product}
Público: {audience}
Tom: {tone}
Canal: {channel}
Restrições: {constraints}

Tarefa:
Gere {n_ideas} caminhos criativos de brainstorm para um redator.
Cada caminho deve ter: título, big_idea, insight, angle, formatos sugeridos, 3 headlines exemplo, 3 CTAs exemplo, notas.

Formato de saída:
Responda SOMENTE em JSON válido, seguindo este modelo (não precisa ser idêntico, mas mantenha as chaves):
{json.dumps(schema_hint, ensure_ascii=False)}
""".strip()

    client = get_openai_client()

    # Modelos disponíveis variam; escolha um bom custo/qualidade.
    # Se quiser mais barato, troque para gpt-5-nano.
    # Docs: modelos :contentReference[oaicite:2]{index=2}
    resp = client.responses.create(
        model="gpt-5-mini",
        reasoning={"effort": "low"},
        instructions=system_instructions,
        input=prompt,
    )

    # Responses API retorna texto em output_text (SDK costuma expor isso)
    text = getattr(resp, "output_text", None)
    if not text:
        # fallback: tenta achar em estruturas internas
        text = str(resp)

    data = _safe_json_load(text)

    # normaliza
    ideas: List[Dict[str, Any]] = data.get("ideas", [])
    guardrails: Dict[str, Any] = data.get("guardrails", {})

    return {
        "ideas": ideas,
        "guardrails": guardrails,
        "meta": {
            "model": "gpt-5-mini",
            "n_ideas": len(ideas),
        },
    }
