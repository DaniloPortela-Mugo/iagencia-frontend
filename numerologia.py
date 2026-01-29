from datetime import date
from io import BytesIO
import unicodedata
from typing import Iterable, Literal, Optional, Tuple

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

# ======== Núcleo de numerologia ========

VOWELS = set("AEIOUY")  # Trate 'Y' como vogal quando soar como tal (prática comum)
MASTER_NUMBERS = {11, 22, 33}

LETTER_MAP = {
    **{c: 1 for c in "AJS"},
    **{c: 2 for c in "BKT"},
    **{c: 3 for c in "CLU"},
    **{c: 4 for c in "DMV"},
    **{c: 5 for c in "ENW"},
    **{c: 6 for c in "FOX"},
    **{c: 7 for c in "GPY"},
    **{c: 8 for c in "HQZ"},
    **{c: 9 for c in "IR"},
}


def strip_accents(text: str) -> str:
    """Remove acentos e normaliza Ç->C, Ñ->N, etc."""
    norm = unicodedata.normalize("NFD", text)
    base = "".join(ch for ch in norm if unicodedata.category(ch) != "Mn")
    return base.replace("Ç", "C").replace("ç", "c")


def reduce_number(n: int, keep_masters: bool = True) -> int:
    """Reduz ao dígito 1–9; preserva 11/22/33 se keep_masters=True."""
    if keep_masters and n in MASTER_NUMBERS:
        return n
    while n > 9:
        s = sum(int(d) for d in str(n))
        if keep_masters and s in MASTER_NUMBERS:
            return s
        n = s
    return n


def letters_to_numbers(name: str) -> Iterable[Tuple[str, int]]:
    """Gera pares (letra, número) já normalizando acentos e caixa."""
    name = strip_accents(name).upper()
    for ch in name:
        if ch.isalpha():
            yield ch, LETTER_MAP.get(ch, 0)


def soma_vogais(name: str) -> int:
    nums = [n for ch, n in letters_to_numbers(name) if ch in VOWELS]
    return sum(nums)


def soma_consoantes(name: str) -> int:
    nums = [n for ch, n in letters_to_numbers(name) if ch not in VOWELS]
    return sum(nums)


def soma_todas_letras(name: str) -> int:
    return sum(n for _, n in letters_to_numbers(name))


def reduzir_data_componentes(d: int, m: int, y: int, keep_masters: bool) -> Tuple[int, int, int]:
    rd = reduce_number(sum(int(x) for x in f"{d:02d}"), keep_masters=keep_masters)
    rm = reduce_number(sum(int(x) for x in f"{m:02d}"), keep_masters=keep_masters)
    ry = reduce_number(sum(int(x) for x in f"{y:04d}"), keep_masters=keep_masters)
    return rd, rm, ry


def numero_alma(name: str) -> int:
    return reduce_number(soma_vogais(name), keep_masters=True)


def numero_sonho(name: str) -> int:
    # Também conhecido como Personalidade em algumas escolas
    return reduce_number(soma_consoantes(name), keep_masters=True)


def numero_talento_expressao(name: str) -> int:
    return reduce_number(soma_todas_letras(name), keep_masters=True)


def numero_talento_dia(day: int) -> int:
    return reduce_number(sum(int(x) for x in f"{day:02d}"), keep_masters=True)


def caminho_destino(day: int, month: int, year: int) -> int:
    rd, rm, ry = reduzir_data_componentes(day, month, year, keep_masters=True)
    return reduce_number(rd + rm + ry, keep_masters=True)


def desafios(day: int, month: int, year: int) -> Tuple[int, int, int, int]:
    # Reduz SEM mestres para diferenças (prática tradicional dos Desafios)
    rd, rm, ry = reduzir_data_componentes(day, month, year, keep_masters=False)
    des1 = abs(rd - rm)
    des2 = abs(rd - ry)
    des3 = abs(des1 - des2)  # principal
    des4 = abs(rm - ry)
    return des1, des2, des3, des4


# ======== Schemas da API ========

class InputPayload(BaseModel):
    nome_completo: str = Field(..., min_length=3, description="Nome completo de registro")
    data_nascimento: date = Field(..., description="YYYY-MM-DD")
    talento_modo: Literal["expressao", "dia_nascimento"] = "expressao"
    incluir_todos_desafios: bool = False

    @field_validator("nome_completo")
    @classmethod
    def valida_nome(cls, v: str) -> str:
        if not any(ch.isalpha() for ch in v):
            raise ValueError("O nome deve conter letras.")
        return v


class OutputPayload(BaseModel):
    alma: int
    caminho_destino: int
    sonho: int
    talento: int
    desafio_principal: int
    desafios: Optional[Tuple[int, int, int, int]] = None  # se solicitado


# ======== App FastAPI ========

app = FastAPI(title="Micro-API Numerologia", version="1.0.0")

# Ajuste os domínios da sua landing page aqui:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # substitua por ["https://sua-landing.com"] em produção
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)


def calcular(payload: InputPayload) -> OutputPayload:
    d = payload.data_nascimento.day
    m = payload.data_nascimento.month
    y = payload.data_nascimento.year

    try:
        alma = numero_alma(payload.nome_completo)
        sonho = numero_sonho(payload.nome_completo)
        if payload.talento_modo == "expressao":
            talento = numero_talento_expressao(payload.nome_completo)
        else:
            talento = numero_talento_dia(d)
        destino = caminho_destino(d, m, y)
        d1, d2, d3, d4 = desafios(d, m, y)
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=400, detail=f"Erro no cálculo: {exc}") from exc

    out = OutputPayload(
        alma=alma,
        caminho_destino=destino,
        sonho=sonho,
        talento=talento,
        desafio_principal=d3,
        desafios=(d1, d2, d3, d4) if payload.incluir_todos_desafios else None,
    )
    return out


@app.post("/numerologia", response_model=OutputPayload)
def post_numerologia(payload: InputPayload) -> OutputPayload:
    return calcular(payload)


# ======== PDF (ReportLab) ========

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def gerar_pdf(payload: InputPayload, resultado: OutputPayload) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)

    title_style = ParagraphStyle(name="Title", fontName="Helvetica-Bold", fontSize=18, alignment=TA_CENTER, textColor=colors.HexColor("#0A3D62"))
    h_style = ParagraphStyle(name="Header", fontName="Helvetica-Bold", fontSize=12, alignment=TA_LEFT, textColor=colors.HexColor("#0A3D62"), spaceAfter=6)
    p_style = ParagraphStyle(name="Para", fontName="Helvetica", fontSize=10, leading=14, textColor=colors.black)

    elems = []
    elems.append(Paragraph("Relatório Numerológico", title_style))
    elems.append(Spacer(1, 10))
    sub = f"<b>Nome:</b> {payload.nome_completo} &nbsp;&nbsp;&nbsp; <b>Nascimento:</b> {payload.data_nascimento.isoformat()}"
    elems.append(Paragraph(sub, p_style))
    elems.append(Spacer(1, 16))

    # Tabela com resultados
    data = [
        ["Alma", str(resultado.alma)],
        ["Caminho de Destino", str(resultado.caminho_destino)],
        ["Sonho", str(resultado.sonho)],
        ["Talento" + (" (Expressão)" if payload.talento_modo == "expressao" else " (Dia)"), str(resultado.talento)],
        ["Desafio (Principal)", str(resultado.desafio_principal)],
    ]
    table = Table(data, colWidths=[6*cm, 3*cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8F0F8")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#BBBBBB")),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.whitesmoke, colors.HexColor("#F7FBFF")]),
    ]))
    elems.append(table)

    if resultado.desafios:
        elems.append(Spacer(1, 12))
        elems.append(Paragraph("Desafios 1–4 (detalhe)", h_style))
        d1, d2, d3, d4 = resultado.desafios
        detail = Table(
            [["Desafio 1", d1], ["Desafio 2", d2], ["Desafio 3 (principal)", d3], ["Desafio 4", d4]],
            colWidths=[6*cm, 3*cm],
            style=TableStyle([("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CCCCCC"))]),
        )
        elems.append(detail)

    elems.append(Spacer(1, 18))
    elems.append(Paragraph("Observações", h_style))
    obs = (
        "• Método pitagórico (A=1… I=9; J=1… R=9; S=1… Z=8). "
        "• Números mestres 11/22/33 preservados em nome e data. "
        "• 'Y' tratado como vogal quando aplicável. "
        "• Talento pode ser calculado por Expressão (nome) ou por dia de nascimento."
    )
    elems.append(Paragraph(obs, p_style))

    doc.build(elems)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


from fastapi.responses import Response


@app.post("/numerologia/pdf")
def post_numerologia_pdf(payload: InputPayload) -> Response:
    resultado = calcular(payload)
    pdf = gerar_pdf(payload, resultado)
    filename = "numerologia.pdf"
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content=pdf, media_type="application/pdf", headers=headers)


# ======== Healthcheck básico ========

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
