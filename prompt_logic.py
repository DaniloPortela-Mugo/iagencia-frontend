import re
import threading
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


# =========================================================
# OPÇÕES (Combobox)
# =========================================================

OPCOES_TEMPO = [
    "Morning",
    "Afternoon",
    "Night",
    "Noon",
    "Late Afternoon",
    "Sunrise",
]

OPCOES_ILUMINACAO = [
    "Natural Light",
    "Cinematic Lighting",
    "Soft Light",
    "Hard Light",
    "Back lighting",
    "Ambient Lighting",
    "High Contrast Lighting",
    "Low Key Lighting",
    "Side Lighting",
    "Front Lighting",
    "Top Lighting",
    "Volumetric Lighting",
    "Dramatic Lighting",
    "Studio Lighting",
    "Neon Light",
    "Candlelight",
]

TIPOS_CAMERA = [
    "Nenhuma",
    "Nikon D850 with 50mm lens",
    "35mm lens",
    "shot in Kodak UltraMax 400 film colors",
    "Celular",
    "ARRIFLEX 35 BL camera",
    "canon k35 prime lens",
    "Sony FE 24-70mm f/2.8 GM II lens",
    "Polaroid SX-70",
    "Rolleiflex 2.8F",
    "Leica M6 with Summicron 50mm",
    "Hasselblad 500CM with Zeiss lens",
    "Yashica Mat-124G",
    "Pentax K1000 with 50mm f/2",
    "ARRI Alexa Mini with anamorphic lens",
    "RED Komodo 6K",
    "iPhone 15 Pro Max cinematic mode",
    "Google Pixel 8 camera",
    "Samsung Galaxy S23 Ultra camera",
    "DJI Mavic Air 2 drone camera",
    "GoPro HERO11 Black",
    "Fujifilm X-T4 with 35mm f/1.4",
    "Canon EOS R5 with RF 85mm f/1.2",
    "Fujifilm X-T5 with 23mm f/2",
    "Vintage Camera",
    "Professional Studio Camera",
    "Drone Camera",
    "Action Camera",
]

# =========================================================
# PLATAFORMAS (nomes exatos para o Combobox)
# =========================================================

IMAGE_PLATFORMS = [
    "Nano Banana (Imagen 3 / Gemini)",
    "Midjourney (v6/v7)",
    "Seedream 4.5 (ByteDance / Doubao)",
    "Stable Diffusion",
]

VIDEO_PLATFORMS = [
    "Veo 3 (Google)",
    "Sora (OpenAI)",
    "Kling (Kling AI)",
    "Seedance 1.5 (ByteDance)",
    "Runway",
    "Pika",
    "Luma AI",
]

PLATFORMS_BY_MEDIA = {
    "Imagem": IMAGE_PLATFORMS,
    "Vídeo": VIDEO_PLATFORMS,
}

# =========================================================
# ESTILO BASE (snippets)
# =========================================================

SUGESTOES_ESTILO = {
    "Nano Banana (Imagen 3 / Gemini)": (
        "natural looking, high fidelity, realistic textures, professional photography, clean composition"
    ),
    "Midjourney (v6/v7)": (
        "hyperrealistic, cinematic lighting, high detail, realistic textures, --style raw"
    ),
    "Seedream 4.5 (ByteDance / Doubao)": (
        "cinematic realism, rich textures, realistic lighting, premium look"
    ),
    "Stable Diffusion": (
        "highly detailed, realistic textures, sharp focus, photorealistic"
    ),
    "Veo 3 (Google)": (
        "cinematic, realistic 4k, filmic lighting, smooth motion, professional cinematography"
    ),
    "Sora (OpenAI)": (
        "photorealistic, physically accurate motion, natural lighting, smooth camera movement"
    ),
    "Kling (Kling AI)": (
        "high realism, cinematic, dynamic motion, high quality, advertising look"
    ),
    "Seedance 1.5 (ByteDance)": (
        "human motion focused, smooth body movement, rhythm synced, realistic lighting"
    ),
    "Runway": (
        "cinematic, hyperrealistic, high detail, professional lighting"
    ),
    "Pika": (
        "studio lighting, clean look, smooth motion, high fidelity"
    ),
    "Luma AI": (
        "depth of field, soft shadows, cinematic lighting, realistic look"
    ),
}

# =========================================================
# EXPRESSÕES
# =========================================================

SUGESTAO_EXPRESSAO = {
    "Neutro_Calmo": "calm",
    "Sorrindo": "smiling",
    "triste": "tearful",
    "raiva": "angry",
    "surpreso": "astonished",
    "pensativo": "thoughtful",
    "curioso": "curious",
    "confuso": "confused",
    "animado": "excited",
    "relaxado": "relaxed",
    "determinado": "determined",
    "assustado": "scared",
    "tímido": "shy",
    "sarcástico": "sarcastic",
    "orgulhoso": "proud",
    "concentrado": "focused",
    "feliz": "happy",
    "entusiasmado": "enthusiastic",
    "preocupado": "worried",
    "desapontado": "disappointed",
    "confiante": "confident",
    "esperançoso": "hopeful",
    "aliviado": "relieved",
    "frustrado": "frustrated",
    "desconfiado": "suspicious",
    "desdenhoso": "disdainful",
    "cético": "skeptical",
    "constrangido": "embarrassed",
    "incrédulo": "incredulous",
    "entediado": "bored",
    "apaixonado": "in love",
    "gracioso": "graceful",
    "divertido": "funny",
    "alerta": "alert",
    "sonhador": "dreamy",
    "chateado": "upset",
    "grato": "grateful",
    "indiferente": "indifferent",
}

# =========================================================
# TEMPLATES (ordem de blocos por plataforma)
# OBS: aqui são "chaves" (nomes de blocos), não strings formatáveis.
# =========================================================

TEMPLATES_PLATAFORMA = {
    # IMAGEM
    "Nano Banana (Imagen 3 / Gemini)": [
        "subject",
        "context",
        "lighting_atmosphere",
        "style_flag",
        "technical",
        "instructions",
    ],
    "Midjourney (v6/v7)": [
        "reference",
        "subject",
        "context",
        "style_flag",
        "mj_params",
        "negative_mj",
    ],
    "Seedream 4.5 (ByteDance / Doubao)": [
        "narrative",
        "context",
        "lighting_atmosphere",
        "style_flag",
        "technical",
        "instructions",
    ],
    "Stable Diffusion": [
        "subject",
        "context",
        "instructions",
        "weight_char",
        "negative_sd",
        "sampler",
        "style_flag",
    ],
    # VÍDEO
    "Veo 3 (Google)": [
        "cinematic_style",
        "scene",
        "camera_movement",
        "lighting_atmosphere",
        "subject_action",
        "style_flag",
        "format_video",
        "audio_block",
    ],
    "Sora (OpenAI)": [
        "context",
        "subject_action",
        "physics_materials",
        "camera_movement",
        "style_flag",
        "format_video",
        "audio_block",
    ],
    "Kling (Kling AI)": [
        "visual_dense",
        "subject_action",
        "motion_emphasis",
        "style_flag",
        "format_video",
        "audio_block",
    ],
    "Seedance 1.5 (ByteDance)": [
        "character",
        "movement_rhythm",
        "facial_emotion",
        "style_flag",
        "format_video",
        "audio_block",
    ],
    "Runway": [
        "reference",
        "context",
        "subject_action",
        "camera_movement",
        "style_flag",
        "format_video",
        "audio_block",
    ],
    "Pika": [
        "context",
        "subject_action",
        "camera_movement",
        "style_flag",
        "format_video",
        "audio_block",
    ],
    "Luma AI": [
        "context",
        "subject_action",
        "camera_movement",
        "style_flag",
        "format_video",
        "audio_block",
    ],
}

# =========================================================
# UTIL: sanitização (evita tags, controles e “lixo”)
# =========================================================

_TAG_RE = re.compile(r"<[^>]+>")
_CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_SPACES_RE = re.compile(r"\s+")


def sanitize_text(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\u200b", " ").replace("\ufeff", " ")
    text = _TAG_RE.sub("", text)
    text = _CTRL_RE.sub("", text)
    text = _SPACES_RE.sub(" ", text).strip()
    return text


# =========================================================
# TRADUÇÃO: segura com timeout (não trava a UI)
# =========================================================

def _translate_with_timeout(text: str, timeout_s: float = 1.2) -> str:
    """
    Evita travar: se a tradução não voltar rápido, devolve o original.
    Placeholder intencional (sem rede). Você pode plugar API depois.
    """
    text = sanitize_text(text)
    if not text:
        return ""

    result = {"value": text}

    def _worker():
        result["value"] = text

    t = threading.Thread(target=_worker, daemon=True)
    t.start()
    t.join(timeout=timeout_s)
    return result["value"] if result.get("value") else text


def traduzir_texto_longo(texto_pt: str) -> str:
    return _translate_with_timeout(texto_pt, timeout_s=1.2)


# =========================================================
# FORMATADORES
# =========================================================

def _join_sentences(parts: List[str]) -> str:
    parts = [sanitize_text(p) for p in parts if sanitize_text(p)]
    if not parts:
        return ""
    s = " ".join(parts).strip()
    if s and s[-1] not in ".!?":
        s += "."
    return s


def _fmt_aspect(format_aspect: str, platform: str) -> str:
    fmt = sanitize_text(format_aspect)
    if not fmt:
        return ""

    if platform == "Midjourney (v6/v7)":
        return f"--ar {fmt}"

    if fmt in {"9:16", "4:5"}:
        return f"Vertical {fmt}"
    if fmt in {"16:9", "21:9"}:
        return f"Horizontal {fmt}"
    return f"Aspect ratio {fmt}"


def _camera_line(camera: str) -> str:
    cam = sanitize_text(camera)
    if not cam or cam == "Nenhuma":
        return ""
    return f"Captured with {cam} look"


def _time_light_colors(time_of_day: str, lighting: str, colors: str) -> str:
    parts = []
    if time_of_day:
        parts.append(time_of_day)
    if lighting:
        parts.append(lighting)
    if colors:
        parts.append(colors)
    return ", ".join([sanitize_text(p) for p in parts if sanitize_text(p)])


# =========================================================
# PERSONAGENS -> descrição natural (EN)
# =========================================================

def build_character_description_en(char_data: Dict[str, Any]) -> str:
    gender = sanitize_text(char_data.get("gender", ""))
    age = sanitize_text(char_data.get("age", ""))
    hair = sanitize_text(char_data.get("hair", ""))
    clothing = sanitize_text(char_data.get("clothing", ""))
    accessories = sanitize_text(char_data.get("accessories", ""))
    expression_key = sanitize_text(char_data.get("expression", ""))

    expression = ""
    if expression_key:
        expression = SUGESTAO_EXPRESSAO.get(expression_key, expression_key)

    base = []
    if gender:
        base.append(_translate_with_timeout(gender))
    if age:
        base.append(_translate_with_timeout(age))

    desc = " ".join([b for b in base if b]).strip()
    if not desc:
        desc = "a person"

    details = []
    if hair:
        details.append(f"with {_translate_with_timeout(hair)} hair")
    if clothing:
        details.append(f"wearing {_translate_with_timeout(clothing)}")
    if accessories:
        details.append(f"with {_translate_with_timeout(accessories)}")
    if expression:
        details.append(f"{expression} expression")

    full = desc
    if details:
        full += ", " + ", ".join(details)
    return sanitize_text(full)


def build_subject_en(all_chars: List[Dict[str, Any]], no_character: bool) -> str:
    if no_character or not all_chars:
        return ""
    subjects = [build_character_description_en(c) for c in all_chars if c]
    subjects = [s for s in subjects if s]
    if not subjects:
        return ""
    if len(subjects) == 1:
        return subjects[0]
    return " and ".join(subjects)


# =========================================================
# VALIDATION (diagnóstico por plataforma)
# =========================================================

@dataclass
class Diagnostics:
    score: int
    warnings: List[str]


def validate_for_platform(data: Dict[str, Any], prompt_en: str) -> Diagnostics:
    platform = data.get("platform", "")
    media = data.get("media_type", "")

    warnings: List[str] = []
    score = 100

    p = (prompt_en or "").lower()

    if "<" in (prompt_en or "") and ">" in (prompt_en or ""):
        warnings.append("Texto contém tags tipo <...>. Sanitização recomendada.")
        score -= 20

    if media == "Vídeo":
        has_motion = any(
            k in p for k in ["walk", "moves", "moving", "pan", "tilt", "zoom", "tracking", "dolly"]
        )
        if not has_motion:
            warnings.append("Vídeo sem movimento explícito (sujeito e/ou câmera).")
            score -= 25

    if platform == "Midjourney (v6/v7)":
        if "--ar" not in p:
            warnings.append("Midjourney: faltou --ar (aspect ratio).")
            score -= 10
        if len(prompt_en.split()) > 120:
            warnings.append("Midjourney: prompt muito longo; pode perder controle. Encurtar.")
            score -= 10

    if platform == "Stable Diffusion":
        if "negative" in (data.get("negative_prompt") or "").lower():
            warnings.append(
                "Stable Diffusion: negative prompt parece conter rótulo; remova palavras como 'negative'."
            )
            score -= 5

    if platform in {"Runway", "Veo 3 (Google)"}:
        if "cinematic" not in p:
            warnings.append("Dica: incluir 'cinematic' costuma melhorar consistência em vídeo.")
            score -= 5

    score = max(0, min(100, score))
    return Diagnostics(score=score, warnings=warnings)


# =========================================================
# BUILD FULL PROMPT (PT + EN) por template (VERSÃO ÚNICA)
# =========================================================

def build_full_prompt(
    data: Dict[str, Any],
) -> Tuple[Optional[str], Optional[str], Optional[str], Dict[str, Any]]:
    """
    Retorna:
      (prompt_pt_visualizacao, prompt_en_envio, erro_msg, diagnostics_dict)
    """

    platform = sanitize_text(data.get("platform", ""))
    media = sanitize_text(data.get("media_type", ""))

    if not platform:
        return None, None, "Plataforma vazia.", {}

    if platform not in TEMPLATES_PLATAFORMA:
        return None, None, f"Plataforma '{platform}' não encontrada em TEMPLATES_PLATAFORMA.", {}

    # ---------- inputs sanitizados ----------
    reference_path = sanitize_text(data.get("reference_path", ""))
    scene_raw = sanitize_text(data.get("scene_raw", ""))
    time_of_day = sanitize_text(data.get("time", ""))
    lighting = sanitize_text(data.get("lighting", ""))
    colors_raw = sanitize_text(data.get("colors_raw", ""))
    camera = sanitize_text(data.get("camera", ""))
    pov_angle = sanitize_text(data.get("pov_angle", ""))
    scene_angle = sanitize_text(data.get("scene_angle", ""))
    format_aspect = sanitize_text(data.get("format", ""))

    camera_movement = sanitize_text(data.get("camera_movement", ""))
    overlay_raw = sanitize_text(data.get("overlay_raw", ""))
    locucao_raw = sanitize_text(data.get("locucao_raw", ""))

    general_idea = sanitize_text(data.get("general_idea_raw", ""))
    additional_instructions = sanitize_text(data.get("additional_instructions_raw", ""))

    no_character = bool(data.get("no_character_var", False))
    all_chars = data.get("all_characters_raw", []) or []

    negative_prompt = sanitize_text(data.get("negative_prompt", ""))
    sampler = sanitize_text(data.get("sampler", ""))
    peso_personagem = data.get("peso_personagem", None)

    style_flag = sanitize_text(SUGESTOES_ESTILO.get(platform, ""))

    # =========================================================
    # 1) Blocos base EN
    # =========================================================
    subject_en = build_subject_en(all_chars, no_character)

    context_bits = []
    if scene_raw:
        context_bits.append(_translate_with_timeout(scene_raw))

    tla = _time_light_colors(time_of_day, lighting, colors_raw)
    if tla:
        context_bits.append(_translate_with_timeout(tla))

    pov_bits = []
    if pov_angle:
        pov_bits.append(_translate_with_timeout(pov_angle))
    if scene_angle and scene_angle.lower() != "nenhum":
        pov_bits.append(_translate_with_timeout(scene_angle))
    if pov_bits:
        context_bits.append(" ".join([b for b in pov_bits if b]))

    context_en = sanitize_text(", ".join([b for b in context_bits if b]))

    instr_parts = []
    if general_idea:
        instr_parts.append(_translate_with_timeout(general_idea))
    if additional_instructions:
        instr_parts.append(_translate_with_timeout(additional_instructions))
    if overlay_raw:
        instr_parts.append(f'Text on screen: "{_translate_with_timeout(overlay_raw)}"')
    instructions_en = sanitize_text(", ".join([p for p in instr_parts if p]))

    audio_block_en = ""
    if locucao_raw:
        audio_block_en = f'Voiceover: "{_translate_with_timeout(locucao_raw)}"'

    technical_en = _camera_line(camera)
    fmt_en = _fmt_aspect(format_aspect, platform)

    # Movimento (vídeo)
    cam_move_en = ""
    if media == "Vídeo" and camera_movement and camera_movement != "Nenhum":
        cm = camera_movement.lower().strip()
        if cm == "pan":
            cam_move_en = "Smooth camera pan following the subject"
        elif cm == "tilt":
            cam_move_en = "Slow camera tilt revealing the scene"
        elif cm == "zoom":
            cam_move_en = "Gentle zoom in for emphasis"
        elif cm == "dolly":
            cam_move_en = "Dolly move forward for cinematic depth"
        elif cm == "track":
            cam_move_en = "Tracking shot following the movement"
        else:
            cam_move_en = _translate_with_timeout(camera_movement)

    # Negativos
    negative_sd = ""
    negative_mj = ""
    if negative_prompt:
        if platform == "Stable Diffusion":
            negative_sd = _translate_with_timeout(negative_prompt)
        elif platform == "Midjourney (v6/v7)":
            negative_mj = f"--no {_translate_with_timeout(negative_prompt)}"

    # Sampler SD
    sampler_sd = ""
    if sampler and platform == "Stable Diffusion":
        sampler_sd = f"Sampler: {sampler}"

    # Weight SD (aplica no subject)
    weight_char = ""
    if platform == "Stable Diffusion" and subject_en and peso_personagem is not None:
        try:
            w = float(peso_personagem)
            if 0.1 <= w <= 2.0:
                weight_char = f"({subject_en}:{w})"
        except Exception:
            weight_char = ""

    # Referência
    reference_block = reference_path if reference_path else ""

    # Engine-specific
    narrative_en = ""
    if platform == "Seedream 4.5 (ByteDance / Doubao)":
        pieces = []
        if subject_en:
            pieces.append(subject_en)
        if context_en:
            pieces.append(context_en)
        narrative_en = _join_sentences(pieces)

    cinematic_style_en = ""
    if platform == "Veo 3 (Google)":
        cinematic_style_en = "Cinematic commercial shot, professionally lit and composed"

    scene_en = context_en if platform == "Veo 3 (Google)" else ""
    lighting_atmosphere_en = _translate_with_timeout(tla) if tla else ""

    physics_materials_en = ""
    if platform == "Sora (OpenAI)":
        physics_materials_en = (
            "Emphasize physically accurate motion, natural fabric movement, realistic reflections"
        )

    motion_emphasis_en = ""
    visual_dense_en = ""
    if platform == "Kling (Kling AI)":
        motion_emphasis_en = "High motion, dynamic movement, smooth slow motion where appropriate"
        visual_dense_en = "High-quality advertising visuals, crisp textures, cinematic depth of field"

    movement_rhythm_en = ""
    facial_emotion_en = ""
    if platform == "Seedance 1.5 (ByteDance)":
        movement_rhythm_en = "Fluid body movement, in sync with the beat, clear gestures"
        facial_emotion_en = "Expressive facial performance matching the movement" if subject_en else ""

    subject_action_en = ""
    if media == "Vídeo":
        if general_idea:
            subject_action_en = _translate_with_timeout(general_idea)
        elif subject_en:
            subject_action_en = f"{subject_en} moves naturally within the scene"

    mj_params = ""
    if platform == "Midjourney (v6/v7)":
        mj_params = fmt_en if fmt_en else "--ar 4:5"

    format_video_en = fmt_en if (media == "Vídeo" and fmt_en) else ""

    # =========================================================
    # 2) Montagem por template (CHAVES -> blocks)
    # =========================================================
    blocks: Dict[str, str] = {
        "reference": reference_block,
        "subject": subject_en,
        "character": subject_en,
        "context": context_en,
        "scene": scene_en or context_en,
        "lighting_atmosphere": lighting_atmosphere_en,
        "style_flag": style_flag,
        "technical": technical_en,
        "instructions": instructions_en,
        "narrative": narrative_en,
        "cinematic_style": cinematic_style_en,
        "camera_movement": cam_move_en,
        "subject_action": subject_action_en,
        "physics_materials": physics_materials_en,
        "motion_emphasis": motion_emphasis_en,
        "visual_dense": visual_dense_en,
        "movement_rhythm": movement_rhythm_en,
        "facial_emotion": facial_emotion_en,
        "format_video": format_video_en,
        "audio_block": audio_block_en,
        "mj_params": mj_params,
        "negative_mj": negative_mj,
        "negative_sd": negative_sd,
        "sampler": sampler_sd,
        "weight_char": weight_char,
    }

    ordered: List[str] = []
    for step in TEMPLATES_PLATAFORMA[platform]:
        chunk = sanitize_text(blocks.get(step, ""))
        if chunk:
            ordered.append(chunk)

    # Midjourney: params no fim
    if platform == "Midjourney (v6/v7)":
        parts: List[str] = []
        if reference_block:
            parts.append(reference_block)

        body_parts = []
        params_parts = []

        for item in ordered:
            if item.startswith("--"):
                params_parts.append(item)
            else:
                body_parts.append(item)

        body = ", ".join([p for p in body_parts if p and p != reference_block])
        params = " ".join([p for p in params_parts if p])

        if body:
            parts.append(body)
        if params:
            parts.append(params)

        prompt_en = sanitize_text(" ".join([p for p in parts if p]))
    else:
        prompt_en = sanitize_text(", ".join(ordered))

    if not prompt_en:
        fallback_parts = [
            reference_block,
            weight_char or subject_en,
            context_en,
            instructions_en,
            audio_block_en,
            technical_en,
            cam_move_en,
            fmt_en,
            negative_sd,
            sampler_sd,
            negative_mj,
            mj_params,
        ]
        prompt_en = sanitize_text("\n".join([p for p in fallback_parts if p]))

    # =========================================================
    # 3) Prompt PT (visualização)
    # =========================================================
    pt_bits: List[str] = []

    if scene_raw:
        pt_bits.append(scene_raw)
    if time_of_day:
        pt_bits.append(time_of_day)
    if lighting:
        pt_bits.append(lighting)
    if colors_raw:
        pt_bits.append(colors_raw)
    if camera and camera != "Nenhuma":
        pt_bits.append(f"Estética de câmera: {camera}")
    if pov_angle:
        pt_bits.append(pov_angle)
    if scene_angle and scene_angle.lower() != "nenhum":
        pt_bits.append(scene_angle)
    if format_aspect:
        pt_bits.append(f"Formato {format_aspect}")

    if not no_character and all_chars:
        chars_pt = []
        for c in all_chars:
            g = sanitize_text(c.get("gender", ""))
            a = sanitize_text(c.get("age", ""))
            h = sanitize_text(c.get("hair", ""))
            cl = sanitize_text(c.get("clothing", ""))
            ac = sanitize_text(c.get("accessories", ""))
            ex = sanitize_text(c.get("expression", ""))

            line = []
            if g:
                line.append(g)
            if a:
                line.append(f"({a})")
            if h:
                line.append(f"cabelo: {h}")
            if cl:
                line.append(f"roupa: {cl}")
            if ac:
                line.append(f"acessórios: {ac}")
            if ex:
                line.append(f"expressão: {ex}")

            built = " ".join([x for x in line if x]).strip()
            if built:
                chars_pt.append(built)

        if chars_pt:
            pt_bits.append(" | ".join(chars_pt))

    if general_idea:
        pt_bits.append(general_idea)
    if additional_instructions:
        pt_bits.append(additional_instructions)
    if media == "Vídeo" and camera_movement and camera_movement != "Nenhum":
        pt_bits.append(f"Movimento de câmera: {camera_movement}")
    if overlay_raw:
        pt_bits.append(f'Texto na tela: "{overlay_raw}"')
    if locucao_raw:
        pt_bits.append(f'Locução: "{locucao_raw}"')

    prompt_pt = _join_sentences(pt_bits)

    # =========================================================
    # 4) Diagnostics (SEM diag solto)
    # =========================================================
    diag = validate_for_platform(data, prompt_en)
    diagnostics_dict = {
        "score": diag.score,
        "warnings": diag.warnings,
        "platform": platform,
        "template_used": TEMPLATES_PLATAFORMA.get(platform, []),
        "style_used": style_flag[:80] if style_flag else "",
    }

    return prompt_pt, prompt_en, None, diagnostics_dict
