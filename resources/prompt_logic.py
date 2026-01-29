
SUGESTOES_ESTILO = {
    "Midjourney": "--v 7 --style raw",
        "Flow": "realistic, vivid colors, moody lighting",
    "Kling": "high realism, cinematic lens flare",
    "Google AI Studio": "high detail, ultra HD",
    "Pika": "soft lighting, studio background",
    "Sora": "AI-enhanced photorealism",
    "Gemini": "dreamlike aesthetic, soft pastels",
    "ChatGPT": "neutral tone, storytelling support",
    "Luma AI": "depth of field, soft shadows",
    "Dreamina": "surrealism, vibrant colors",
    "Higgsfilld": "hyperrealism, studio lighting"
}

SUGESTAO_EXPRESSAO = {
    "feliz": "smiling",
    "triste": "tearful",
    "raiva": "angry",
    "surpreso": "astonished",
    "pensativo": "thoughtful",
    "neutro": "calm"
}

SUGESTAO_ACAO = {
    "cenário": "standing confidently in the environment",
    "praia": "walking along the shore",
    "cidade": "crossing a busy street",
    "floresta": "exploring the trees",
    "montanha": "climbing the trail",
    "café": "drinking coffee",
    "parque": "sitting on a bench"
}

SUGESTAO_CENARIO = {
    "Sunrise": "a misty beach",
    "Morning": "a lively street market",
    "Noon": "a bustling downtown plaza",
    "Afternoon": "a sunny urban park",
    "Golden Hour": "a glowing hilltop",
    "Sunset": "a quiet beach",
    "Dusk": "a silhouette-filled alley",
    "Twilight": "a reflective lake",
    "Night": "a neon-lit avenue",
    "Midnight": "a quiet deserted square",
    "Blue Hour": "a calm city street",
    "Early Morning": "a foggy neighborhood",
    "Late Afternoon": "a warm rustic field",
    "Evening": "a candle-lit café"
}

OPCOES_ILUMINACAO = [
    "Natural Light",
    "Soft Light",
    "Hard Light",
    "Back lighting",
    "Side Lighting",
    "Front Lighting",
    "Top Lighting",
    "Low Key Lighting"
]

OPCOES_ANGULO = [
    "Eye Level",
    "High Angle",
    "Low Angle",
    "Bird's Eye View",
    "Worm's Eye View",
    "Dutch Angle",
    "Over-the-Shoulder",
    "Point of View(POV)",
    "Close-Up",
    "Extreme Close-Up",
    "Wide Angle",
    "Medium Shot",
    "Long Shot",
    "Aerial View",
    "Tilted Angle"
]

OPCOES_TEMPO = [
    "Sunrise",
    "Morning",
    "Noon",
    "Afternoon",
    "Golden Hour",
    "Sunset",
    "Dusk",
    "Twilight",
    "Night",
    "Midnight",
    "Blue Hour",
    "Early Morning",
    "Late Afternoon",
    "Evening"
]

TIPOS_CAMERA = [
    "35mm lens", "shot in Kodak UltraMax 400 film colors", "Celular",
    "ARRIFLEX 35 BL camera", "canon k35 prime lens", "Sony FE 24-70mm f/2.8 GM II lens",
    "Polaroid SX-70", "Rolleiflex 2.8F", "Leica M6 with Summicron 50mm",
    "Hasselblad 500CM with Zeiss lens", "Yashica Mat-124G", "Pentax K1000 with 50mm f/2",
    "ARRI Alexa Mini with anamorphic lens", "RED Komodo 6K",
    "iPhone 15 Pro Max cinematic mode", "Google Pixel 8 camera",
    "Sony A7R V with 85mm f/1.4", "Fujifilm X-T5 with 23mm f/2"
]


def to_descriptive_prompt(data, formato_fluido=False):
    def opcional(chave):
        return data.get(chave) and data[chave].strip()

    if formato_fluido:
        partes = []

        # Bloco 1: personagem e detalhes
        bloco1 = []
        if opcional("character"):
            bloco1.append(data["character"])
        if bloco1:
            partes.append(" ".join(bloco1))

        # Bloco 2: movimento e cenário
        bloco2 = []
        if opcional("motion"):
            bloco2.append(f"seen {data['motion']}")
        if opcional("scene"):
            bloco2.append(f"in {data['scene']}")
        if opcional("time"):
            bloco2.append(f"during {data['time']}")
        if bloco2:
            partes.append(" ".join(bloco2))

        # Bloco 3: luz, ângulo, câmera, formato
        bloco3 = []
        if opcional("lighting"):
            bloco3.append(f"under {data['lighting']} lighting")
        if opcional("angle"):
            bloco3.append(f"seen from a {data['angle']} angle")
        if opcional("camera"):
            bloco3.append(f"captured with {data['camera']}")
        if opcional("format"):
            bloco3.append(f"in format {data['format']}")
        if bloco3:
            partes.append(" ".join(bloco3))

        # Bloco 4: expressão, humor, estilo, tipo de saída
        bloco4 = []
        if opcional("expression"):
            bloco4.append(f"Facial expression: {data['expression']}")
        if opcional("mood"):
            bloco4.append(f"Mood: {data['mood']}")
        if opcional("style"):
            bloco4.append(f"Style: {data['style']}")
        if opcional("output_type"):
            bloco4.append(f"Output type: {data['output_type']}")
        if bloco4:
            partes.append(" ".join(bloco4))

        return "\n".join(partes).strip()

    # fallback: estilo tradicional
    return (
        f"{data['character']} {data['motion']} in a {data['scene']} during {data['time']}, "
        f"with {data['lighting']} lighting and {data['angle']} angle, captured with {data['camera']} in format {data['format']}. "
        f"Expression: {data['expression']}. Mood: {data['mood']}. Style: {data['style']}."
    )
