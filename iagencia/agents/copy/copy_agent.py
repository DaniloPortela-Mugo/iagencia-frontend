from __future__ import annotations
from typing import Any, Dict


def run_copy_pack(
    brief: Dict[str, Any],
    user_inputs: Dict[str, Any],
    brainstorm: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    objective = (brief or {}).get("objective", "sem objetivo informado")

    ideas = (brainstorm or {}).get("ideas", [])

    return {
        "headlines": [
            f"{objective}: ideia inspirada em {ideas[0]['title']}"
        ] if ideas else [f"Headline baseada em: {objective}"],
        "primary_texts": [
            "Texto principal gerado a partir do brainstorm."
        ],
        "ctas": ["Saiba mais", "Compre agora"],
        "variations_notes": "Copy gerado a partir do brainstorm.",
        "meta": {
            "used_brainstorm": bool(ideas),
        },
    }