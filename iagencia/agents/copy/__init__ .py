from __future__ import annotations

import json
from typing import Any, Dict

from iagencia.services.openai_client import get_openai_client


def _safe_json_load(text: str) -> Dict[str, Any]:
    text = text.strip()
    if text.startswith("{") and text.endswith("}"):
        return json.loads(text)

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(text[start : end + 1])

    raise ValueError("Não foi possível parsear JSON do copy pack.")


def run_copy_pack(
    brief: Dict[str, Any],
    user_inputs: Dict[str, Any],
    brainstorm: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    objective = (brief or {}).get("objective", "").strip() or "Objetivo não informado"
    brand = (brief or {}).get("brand", "").strip()
    audience = (brief or {}).get("audience", "").strip()
    product = (brief or {}).get("product", "").strip()

    tone = (user_inputs or {}).get("tone", "").strip()
    channel = (user_inputs or {}).get("channel", "").strip()

    chosen_path = (user_inputs or {}).get("chosen_path", "").strip()

    system_instructions = (
        "Você é um redator publicitário brasileiro sênior. "
        "Você escreve copy direto, persuasivo e ajustado ao canal. "
        "Evite clichês e promessas proibidas. Entregue variações."
    )

    brainstorm_context = ""
    if brainstorm and brainstorm.get("ideas"):
        # Se o usuário escolheu um caminho, prioriza; senão, usa os 3 primeiros.
        ideas = brainstorm["ideas"]
        if chosen_path:
            filtered = [i for i in ideas if chosen_path.lower() in str(i.get("title", "")).lower()]
            ideas = filtered or ideas
        ideas = ideas[:3]
        brainstorm_context = json.dumps(ideas, ensure_ascii=False)

    schema_hint = {
        "headlines": ["..."],
        "primary_texts": ["..."],
        "ctas": ["..."],
        "variations_notes": "string",
    }

    prompt = f"""
Objetivo: {objective}
Marca: {brand}
Produto/Serviço: {product}
Público: {audience}
Tom: {tone}
Canal: {channel}

Contexto de brainstorm (use como base se fizer sentido):
{brainstorm_context}

Tarefa:
Crie um Copy Pack com:
- 10 headlines
- 6 primary texts (curtos e médios)
- 8 CTAs
- notas rápidas sobre as variações

Formato de saída:
Responda SOMENTE em JSON válido, seguindo este modelo:
{json.dumps(schema_hint, ensure_ascii=False)}
""".strip()

    client = get_openai_client()
    resp = client.responses.create(
        model="gpt-5-mini",
        reasoning={"effort": "low"},
        instructions=system_instructions,
        input=prompt,
    )

    text = getattr(resp, "output_text", None)
    if not text:
        text = str(resp)

    data = _safe_json_load(text)

    return {
        "headlines": data.get("headlines", []),
        "primary_texts": data.get("primary_texts", []),
        "ctas": data.get("ctas", []),
        "variations_notes": data.get("variations_notes", ""),
        "meta": {"model": "gpt-5-mini"},
    }
