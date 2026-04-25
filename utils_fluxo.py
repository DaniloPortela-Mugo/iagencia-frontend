import json
import os

def atualizar_etapa(cliente_id, nova_etapa, estado_path="campanhas_estado.json"):
    if not os.path.exists(estado_path):
        estado = {}
    else:
        with open(estado_path, "r", encoding="utf-8") as f:
            estado = json.load(f)

    if cliente_id not in estado:
        estado[cliente_id] = {
            "etapa_atual": "inicio",
            "historico": []
        }

    etapa_atual = estado[cliente_id]["etapa_atual"]
    if etapa_atual != nova_etapa:
        estado[cliente_id]["historico"].append(etapa_atual)
        estado[cliente_id]["etapa_atual"] = nova_etapa

    with open(estado_path, "w", encoding="utf-8") as f:
        json.dump(estado, f, indent=2, ensure_ascii=False)

    return estado[cliente_id]
