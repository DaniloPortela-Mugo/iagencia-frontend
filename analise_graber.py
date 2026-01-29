#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script: analise_teste_dados.py
Descrição:
    - Lê um arquivo Excel com a base de dados.
    - Limpa a coluna TELEFONE removendo o prefixo "55" quando estiver no início
      e removendo a vírgula e tudo após a vírgula (ex.: "5519991857467,00" -> "19991857467").
    - Cria "listas" (estruturas Python e planilhas) com todos os dados filtrados por:
        * ATENDIMENTO = "SIM" e "NÃO"
        * MEDIA_SALARIAL (uma lista por valor)
        * DATA (uma lista por data)
    - Exporta uma planilha Excel com abas para cada filtro e um JSON com todas as listas.

Uso (exemplos):
    python analise_teste_dados.py --input "/caminho/Teste_dados.xlsx" --output "/caminho/saida.xlsx" --json "/caminho/listas.json"
    python analise_teste_dados.py --input "/caminho/Teste_dados.xlsx"

Requisitos:
    pip install pandas openpyxl
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from pathlib import Path
from typing import Dict, List

import pandas as pd


def strip_accents(text: str) -> str:
    """Remove acentos mantendo apenas caracteres ASCII básicos."""
    if not isinstance(text, str):
        return text
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join([c for c in nfkd if not unicodedata.combining(c)])


def normalize_yes_no(value: str) -> str:
    """Normaliza valores de 'SIM'/'NÃO' para 'SIM'/'NAO' (sem acento)."""
    if pd.isna(value):
        return value
    txt = strip_accents(str(value)).strip().upper()
    if txt in {"SIM", "S", "YES", "Y"}:
        return "SIM"
    if txt in {"NAO", "N", "NAO ", "NO"}:
        return "NAO"
    return txt  # devolve como veio (normalizado) caso seja outro valor


def clean_phone(raw: object) -> object:
    """Limpa o telefone conforme regras:
       - se começar com '55', remove esses dois primeiros dígitos
       - remove a vírgula e tudo após a vírgula
       - mantém apenas dígitos no resultado final
    """
    if pd.isna(raw):
        return pd.NA

    s = str(raw).strip()
    # Remove tudo após vírgula (se houver)
    if "," in s:
        s = s.split(",", 1)[0].strip()

    # Mantém apenas dígitos (descarta espaços, parênteses, traços, etc.)
    digits = re.sub(r"\D", "", s)

    # Remove o prefixo '55' somente se vier no início
    if digits.startswith("55"):
        digits = digits[2:]

    return digits if digits else pd.NA


def sanitize_sheet_name(name: str) -> str:
    return _sanitize_common(name, excel=True)

def _sanitize_common(name: str, excel: bool = False) -> str:
    if not isinstance(name, str):
        name = str(name)
    name = re.sub(r'[:\\/\?\*\[\]\n\r\t]', ' ', name).strip()
    name = name.replace('  ', ' ')
    if excel:
        name = name or 'Sheet'
        return name[:31]
    return name or 'arquivo'

def safe_filename(name: str) -> str:
    # remove acentos e caracteres problemáticos para nomes de arquivo
    name_norm = ''.join(c for c in unicodedata.normalize('NFKD', str(name)) if not unicodedata.combining(c))
    name_norm = re.sub(r'[^A-Za-z0-9._-]+', '_', name_norm).strip('_')
    return name_norm or 'arquivo'
    """Sanitiza nomes de abas do Excel: remove caracteres inválidos e limita a 31 chars."""
    if not isinstance(name, str):
        name = str(name)
    # remove inválidos: : \ / ? * [ ]
    name = re.sub(r'[:\\/\?\*\[\]]', " ", name).strip()
    # evita aba vazia
    name = name or "Sheet"
    # limita a 31 caracteres
    return name[:31]


def build_lists(df: pd.DataFrame) -> Dict[str, Dict[str, List[dict]]]:
    """Cria estruturas de listas (dict -> list[dict]) para exportação JSON."""
    data: Dict[str, Dict[str, List[dict]]] = {"ATENDIMENTO": {}, "MEDIA_SALARIAL": {}, "DATA": {}}

    # ATENDIMENTO (SIM/NAO)
    for key in ["SIM", "NAO"]:
        subset = df[df["ATENDIMENTO_NORM"] == key]
        data["ATENDIMENTO"][key] = subset.fillna("").to_dict(orient="records")

    # MEDIA_SALARIAL (uma entrada por valor único)
    for val in sorted(df["MEDIA_SALARIAL"].dropna().astype(str).unique()):
        sub = df[df["MEDIA_SALARIAL"].astype(str) == val]
        data["MEDIA_SALARIAL"][str(val)] = sub.fillna("").to_dict(orient="records")

    # DATA (normalizada para YYYY-MM-DD quando possível)
    if "DATA_PURA" in df.columns:
        for val in sorted(df["DATA_PURA"].dropna().astype(str).unique()):
            sub = df[df["DATA_PURA"].astype(str) == val]
            data["DATA"][str(val)] = sub.fillna("").to_dict(orient="records")
    else:
        # fallback: usa a coluna original como string
        if "DATA" in df.columns:
            for val in sorted(df["DATA"].dropna().astype(str).unique()):
                sub = df[df["DATA"].astype(str) == val]
                data["DATA"][str(val)] = sub.fillna("").to_dict(orient="records")

    return data


def main() -> None:
    parser = argparse.ArgumentParser(description="Analisa e filtra a base de Teste_dados.xlsx.")
    parser.add_argument("--input", required=True, help="Caminho do arquivo Excel de entrada.")
    parser.add_argument(
        "--output",
        default="/Users/daniloportela/Desktop/VOX Strategy/Carol_Graber/DADOS/analise_teste_dados.xlsx",
        help="Caminho do Excel de saída com as abas de filtros."
    )
    parser.add_argument(
        "--json",
        default="/Users/daniloportela/Desktop/VOX Strategy/Carol_Graber/DADOS/analise_teste_dados.json",
        help="Caminho do JSON de saída com as listas."
    )
    parser.add_argument(
        "--csv-dir",
        default="/Users/daniloportela/Desktop/VOX Strategy/Carol_Graber/DADOS",
        help="Diretório onde serão salvos os CSVs por grupo (criado se não existir)."
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_xlsx = Path(args.output)
    output_json = Path(args.json)
    csv_dir = Path(args.csv_dir)
    # garante que diretórios existam
    output_xlsx.parent.mkdir(parents=True, exist_ok=True)
    output_json.parent.mkdir(parents=True, exist_ok=True)
    csv_dir.mkdir(parents=True, exist_ok=True)

    if not input_path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {input_path}")

    # Lê Excel preservando strings (importante para TELEFONE)
    df = pd.read_excel(input_path, dtype=str)

    # Garante colunas esperadas (avisa se ausentes)
    expected_cols = {"TELEFONE", "ATENDIMENTO", "MEDIA_SALARIAL", "DATA"}
    missing = [c for c in expected_cols if c not in df.columns]
    if missing:
        raise ValueError(f"As seguintes colunas não foram encontradas na planilha: {missing}")

    # Limpeza de TELEFONE
    df["TELEFONE"] = df["TELEFONE"].apply(clean_phone)

    # Normalização de ATENDIMENTO
    df["ATENDIMENTO_NORM"] = df["ATENDIMENTO"].apply(normalize_yes_no)

    # DATA -> tenta converter para datetime e padronizar como 'YYYY-MM-DD'
    # dayfirst=True para formatos brasileiros (ex.: 31/12/2024)
    data_parsed = pd.to_datetime(df["DATA"], errors="coerce", dayfirst=True)
    df["DATA_PURA"] = data_parsed.dt.date.astype("string")

    # === Abas e filtros ===
    atendimento_sim = df[df["ATENDIMENTO_NORM"] == "SIM"].copy()
    atendimento_nao = df[df["ATENDIMENTO_NORM"] == "NAO"].copy()

    # Grupos por MEDIA_SALARIAL
    grupos_media = {
        str(val): df[df["MEDIA_SALARIAL"].astype(str) == str(val)].copy()
        for val in sorted(df["MEDIA_SALARIAL"].dropna().astype(str).unique())
    }

    # Grupos por DATA_PURA
    if "DATA_PURA" in df.columns:
        grupos_data = {
            str(val): df[df["DATA_PURA"].astype(str) == str(val)].copy()
            for val in sorted(df["DATA_PURA"].dropna().astype(str).unique())
        }
    else:
        grupos_data = {
            str(val): df[df["DATA"].astype(str) == str(val)].copy()
            for val in sorted(df["DATA"].dropna().astype(str).unique())
        }

    # === Exporta Excel ===
    with pd.ExcelWriter(output_xlsx, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="BASE_LIMPA")
        atendimento_sim.to_excel(writer, index=False, sheet_name="ATENDIMENTO_SIM")
        atendimento_nao.to_excel(writer, index=False, sheet_name="ATENDIMENTO_NAO")

        # MEDIA_SALARIAL_* (limita nome da aba)
        for key, sub in grupos_media.items():
            sheet = sanitize_sheet_name(f"MEDIA_{key}")
            if not len(sheet):
                sheet = "MEDIA"
            sub.to_excel(writer, index=False, sheet_name=sheet)

        # DATA_* (YYYY-MM-DD)
        for key, sub in grupos_data.items():
            sheet = sanitize_sheet_name(f"DATA_{key}")
            if not len(sheet):
                sheet = "DATA"
            sub.to_excel(writer, index=False, sheet_name=sheet)

    # === Exporta JSON com todas as "listas" ===
    lists_payload = build_lists(df)
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(lists_payload, f, ensure_ascii=False, indent=2)

    print(f"Arquivo Excel salvo em: {output_xlsx}")
    print(f"Arquivo JSON salvo em:  {output_json}")

    # === Exporta CSVs por grupo ===
    # ATENDIMENTO SIM/NAO
    atendimento_sim.to_csv(csv_dir / f"ATENDIMENTO_{safe_filename('SIM')}.csv", index=False, encoding="utf-8-sig")
    atendimento_nao.to_csv(csv_dir / f"ATENDIMENTO_{safe_filename('NAO')}.csv", index=False, encoding="utf-8-sig")

    # MEDIA_SALARIAL
    for key, sub in grupos_media.items():
        sub.to_csv(csv_dir / f"MEDIA_{safe_filename(key)}.csv", index=False, encoding="utf-8-sig")

    # DATA (YYYY-MM-DD)
    for key, sub in grupos_data.items():
        sub.to_csv(csv_dir / f"DATA_{safe_filename(key)}.csv", index=False, encoding="utf-8-sig")
    
    print(f"CSVs por grupo salvos em: {csv_dir}")


if __name__ == "__main__":
    main()
