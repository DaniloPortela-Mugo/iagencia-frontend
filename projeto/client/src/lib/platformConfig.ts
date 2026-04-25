// Central platform configuration: guidelines, prompt builders, and parameter definitions
// for all supported AI image/video generation platforms.

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type PlatformType = "image" | "video";

export interface PlatformDef {
 id: string;
 label: string;
 type: PlatformType;
 description: string;
 language: "en" | "pt" | "en_or_pt";
 promptStyle: "prose" | "tags" | "json" | "midjourney" | "runwayml";
 supportsNegativePrompt: boolean;
 supportsAspectRatio: boolean;
 supportsReferences: boolean;
 guidelines: string[];
 parameterHints: string;
 apiEndpoint?: string; // backend engine id
}

export interface ImagePromptParams {
 generalIdea: string;
 characters: Array<{
  name?: string;
  physical_details?: string;
  clothing_details?: string;
  expression?: string;
  action?: string;
 }>;
 config: {
  format: string;
  style: string;
  lighting: string;
  camera: string;
  view: string;
  angle: string;
 };
 negativePrompt?: string;
}

export interface VideoPromptParams {
 generalIdea: string;
 characters: Array<{
  name?: string;
  physical_details?: string;
  clothing_details?: string;
  expression?: string;
  action?: string;
 }>;
 config: {
  format: string;
  style: string;
  lighting: string;
  camera: string;
  pacing: string;
  movement: string;
  location: string;
  time_of_day: string;
  color_grade: string;
  tone: string;
  environment: string;
 };
 negativePrompt?: string;
}

// ─── ASPECT RATIO HELPERS ─────────────────────────────────────────────────────

const FORMAT_TO_MJ_AR: Record<string, string> = {
 "Horizontal (16:9)": "--ar 16:9",
 "Vertical (9:16)": "--ar 9:16",
 "Quadrado (1:1)": "--ar 1:1",
 "Feed Instagram (4:5)": "--ar 4:5",
 "Ultrawide (21:9)": "--ar 21:9",
};

// ─── IMAGE PLATFORMS ──────────────────────────────────────────────────────────

export const IMAGE_PLATFORMS: PlatformDef[] = [
 {
  id: "flux",
  label: "Flux (Replicate)",
  type: "image",
  description: "Modelo de alta qualidade fotorrealista via Replicate API.",
  language: "en",
  promptStyle: "prose",
  supportsNegativePrompt: true,
  supportsAspectRatio: true,
  supportsReferences: true,
  apiEndpoint: "flux",
  guidelines: [
   "Escreva em inglês, prosa contínua e descritiva.",
   "Descreva sujeito → cenário → iluminação → câmera → qualidade.",
   "Prefira detalhes físicos concretos: cores, texturas, materiais.",
   "Evite palavras como 'beautiful', 'amazing' — seja específico.",
   "Termine com qualidade: 'hyperrealistic, 8K, sharp focus, RAW photo'.",
  ],
  parameterHints: "Suporta negative prompt e aspect ratio nativamente.",
 },
 {
  id: "midjourney",
  label: "Midjourney",
  type: "image",
  description: "Gerador artístico de alta qualidade. Use os parâmetros --flag ao final.",
  language: "en",
  promptStyle: "midjourney",
  supportsNegativePrompt: false,
  supportsAspectRatio: true,
  supportsReferences: false,
  guidelines: [
   "Escreva em inglês. Não use colchetes, parênteses ou dois-pontos no prompt.",
   "Estrutura: [sujeito] [ambiente] [estilo] [detalhes técnicos] [parâmetros]",
   "Use palavras-chave separadas por vírgula, depois artistas/estilos de referência.",
   "Negativos vão no parâmetro: --no text, logo, watermark",
   "Parâmetros úteis: --ar, --style raw, --v 6.1, --q 2, --chaos 20, --stylize 750",
   "Exemplo: 'cinematic portrait of a woman, golden hour lighting, film grain --ar 16:9 --style raw --v 6.1'",
  ],
  parameterHints: "--ar W:H --style raw --v 6.1 --q 2 --chaos 0-100 --stylize 0-1000",
 },
 {
  id: "dalle3",
  label: "DALL-E 3 (ChatGPT)",
  type: "image",
  description: "Gerador da OpenAI, excelente para cenas conceituais e precisão de texto.",
  language: "en",
  promptStyle: "prose",
  supportsNegativePrompt: false,
  supportsAspectRatio: true,
  supportsReferences: false,
  apiEndpoint: "dalle3",
  guidelines: [
   "Escreva em inglês. Use frases completas e conversacionais.",
   "DALL-E 3 interpreta instruções complexas — seja preciso e detalhado.",
   "Pode renderizar texto na imagem: especifique fontes e posições.",
   "Inicie com tipo de imagem: 'A photorealistic photograph...', 'A digital illustration...'",
   "Evite qualquer pessoa real, marca ou conteúdo protegido por direitos autorais.",
   "Não use sintaxe de pesos (word:1.5) — ela não é suportada.",
  ],
  parameterHints: "Aspect ratio: 1024x1024, 1792x1024, 1024x1792. Qualidade: standard ou hd.",
 },
 {
  id: "gemini_imagen",
  label: "Gemini Imagen 3",
  type: "image",
  description: "Modelo da Google com excelente entendimento contextual.",
  language: "en",
  promptStyle: "prose",
  supportsNegativePrompt: false,
  supportsAspectRatio: true,
  supportsReferences: false,
  apiEndpoint: "gemini",
  guidelines: [
   "Escreva em inglês. Prosa descritiva e estruturada.",
   "Descreva a imagem como se estivesse explicando para um fotógrafo.",
   "Inclua sempre: sujeito, local/ambiente, iluminação, estilo visual.",
   "Specifique mood/atmosfera: 'warm and inviting', 'moody and dramatic'.",
   "Gemini respeita bem composição e perspectiva — detalhe câmera e ângulo.",
  ],
  parameterHints: "Suporta aspect ratio 1:1, 9:16, 16:9, 4:3, 3:4.",
 },
 {
  id: "stable_diffusion",
  label: "Stable Diffusion (XL/3)",
  type: "image",
  description: "Modelo open-source altamente customizável com sintaxe de pesos.",
  language: "en",
  promptStyle: "tags",
  supportsNegativePrompt: true,
  supportsAspectRatio: true,
  supportsReferences: false,
  apiEndpoint: "stability",
  guidelines: [
   "Escreva em inglês. Use tags separadas por vírgulas com pesos entre parênteses.",
   "Estrutura: qualidade → sujeito → roupas → cenário → luz → câmera → estilo.",
   "Tags de qualidade: (masterpiece:1.2), (best quality:1.2), 8K, RAW photo.",
   "Ênfase com (palavra:1.4), redução com (palavra:0.8).",
   "Negative prompt essencial: (deformed:1.3), (low quality:1.5), text, watermark.",
  ],
  parameterHints: "Pesos: (token:1.0-1.9). CFG scale 7-12. Steps 25-50. Sampler: DPM++ 2M.",
 },
 {
  id: "nano_banana",
  label: "Nano Banana 2 (Gemini Flash)",
  type: "image",
  description: "Modelo rápido baseado em Gemini Flash, ótimo para renders 3D e ilustrações.",
  language: "en",
  promptStyle: "prose",
  supportsNegativePrompt: false,
  supportsAspectRatio: true,
  supportsReferences: false,
  apiEndpoint: "nano_banana",
  guidelines: [
   "Descreva o objeto principal com clareza e o estilo visual desejado.",
   "Exemplo: An isometric 3D render of a cozy library with a fireplace, claymorphism style.",
   "Funciona bem para renders 3D, isométrico, claymorphism, ilustrações vetoriais.",
   "Inclua iluminação e atmosfera: 'soft lighting', 'warm glow', 'dramatic shadows'.",
   "Prompts concisos funcionam melhor — 1 a 3 frases diretas.",
  ],
  parameterHints: "Aspect ratio suportado. Sem negative prompt.",
 },
];

// ─── VIDEO PLATFORMS ──────────────────────────────────────────────────────────

export const VIDEO_PLATFORMS: PlatformDef[] = [
 {
  id: "kling",
  label: "Kling 1.5",
  type: "video",
  description: "Realismo humano e física de objetos.",
  language: "en",
  promptStyle: "prose",
  supportsNegativePrompt: true,
  supportsAspectRatio: true,
  supportsReferences: true,
  apiEndpoint: "kling",
  guidelines: [
   "Foco em física do movimento: textura, vapor, peso, impacto, superfícies.",
   "Estrutura: [Close-up] de [personagem + detalhes físicos], [ação física], [câmera], [iluminação], [resolução], [estilo]",
   "Prefira planos fechados (close-up, médio) — evite planos abertos genéricos.",
   "Descreva a ação com detalhes físicos: 'steam rising', 'fabric rippling', 'liquid splash'.",
   "Inclua movimento de câmera explícito: tracking shot, slow zoom, aerial drone.",
   "Termine com: '4K, cinematic, film grain, realistic texture'.",
  ],
  parameterHints: "Duração: 5s ou 10s. Aspect: 16:9, 9:16, 1:1. CFG 0.5.",
 },
 {
  id: "veo",
  label: "Veo (Google)",
  type: "video",
  description: "Cinematográfico, movimentos complexos de câmera.",
  language: "en_or_pt",
  promptStyle: "json",
  supportsNegativePrompt: false,
  supportsAspectRatio: true,
  supportsReferences: false,
  apiEndpoint: "veo",
  guidelines: [
   "Estrutura: [Movimento cinematográfico]: [ação]. [locação, horário]. [atmosfera]. [iluminação]. [lente]. [color grade]. [resolução].",
   "Câmera PRIMEIRO com termo técnico: 'Aerial drone flyover', 'Slow dolly push-in', 'Rack focus'.",
   "Obrigatório incluir: location, time_of_day, color_grade e tone do formulário.",
   "Pode aceitar prompt em português — será traduzido internamente.",
   "Inclua sound design: 'ambient background sound', 'natural sounds only'.",
   "Evite rostos realistas de pessoas identificáveis.",
  ],
  parameterHints: "Formato JSON ou texto em PT. Suporta áudio TTS e upload de áudio.",
 },
 {
  id: "runway",
  label: "Runway Gen-3",
  type: "video",
  description: "Transições e transformações de estado.",
  language: "en",
  promptStyle: "runwayml",
  supportsNegativePrompt: false,
  supportsAspectRatio: true,
  supportsReferences: true,
  apiEndpoint: "runway",
  guidelines: [
   "ESTRUTURA OBRIGATÓRIA: [Estado A] → [Ação/transformação] → [Estado B], [estilo], [efeito]",
   "SEMPRE descreva uma mudança de estado A para B — sem transformação o Runway falha.",
   "Keywords de transformação: Morphing, Slow motion, Timelapse, Pan reveal, Zoom reveal.",
   "Estado A: cena inicial. Estado B: resultado final. Ação: o que muda entre eles.",
   "Exemplo: 'Empty street at night → Pan right reveals neon-lit crowd → Vibrant urban scene, dramatic lighting'",
   "Prompts concisos funcionam melhor — 1 linha com a estrutura A → B.",
  ],
  parameterHints: "[Estado A] → [Transformação] → [Estado B]. Duração: 5-10s.",
 },
 {
  id: "sora",
  label: "Sora (OpenAI)",
  type: "video",
  description: "Narrativa longa com consistência de personagem.",
  language: "en",
  promptStyle: "prose",
  supportsNegativePrompt: false,
  supportsAspectRatio: true,
  supportsReferences: false,
  apiEndpoint: "sora",
  guidelines: [
   "Parágrafo narrativo completo: personagem + ação + fundo + atmosfera + câmera integrada.",
   "Descreva o personagem com aparência + roupa + movimento específico (não genérico).",
   "Descreva o fundo com a mesma riqueza do sujeito: superfícies, elementos, profundidade.",
   "Câmera integrada na narrativa ('the camera follows', 'a wide shot reveals'), não como parâmetro.",
   "Múltiplos momentos: 'At first... then slowly... finally...'",
   "Termine com: estética, color grade, 8K, film grain.",
  ],
  parameterHints: "Aspect: 16:9, 9:16, 1:1. Duração variável. Alta coerência temporal.",
 },
];

// ─── PROTOCOL CONSTANTS (from prompt_refiner.py) ──────────────────────────────

const TECH_VOCABULARY = [
 "cinematic lighting with soft shadows and high micro-contrast",
 "photorealistic textures, visible skin pores, and natural imperfections",
 "shot on Arri Alexa, master prime lens, 8k resolution",
 "depth of field with elegant bokeh, sharp subject focus",
 "editorial color grading, rich tonal range, realistic highlights",
];

const SKIN_PROTOCOL =
 "raw photography, hyper-realistic skin texture, visible pores, natural skin imperfections, " +
 "freckles, moles, rustic finish, sharp focus, unretouched appearance, no plasticky effect, " +
 "detailed iris, subsurface scattering";

const ANTI_PLASTIC =
 "wax skin, plastic skin, airbrushed, smooth skin, cartoonish, cgi face, doll like, " +
 "blur, low resolution, flat lighting";

function pickTech(): string {
 return TECH_VOCABULARY[Math.floor(Math.random() * TECH_VOCABULARY.length)];
}

// ─── TRANSLATION MAPS ─────────────────────────────────────────────────────────

const STYLE_MAP: Record<string, string> = {
 "Fotorrealista": "photorealistic",
 "Cinematográfico": "cinematic",
 "Editorial de Moda": "fashion editorial",
 "Product Shot": "product photography",
 "3D Render": "3D render",
 "Anime": "anime style",
 "Cyberpunk": "cyberpunk aesthetic",
 "Pintura a Óleo": "oil painting",
 "Luxo Publicitário": "luxury commercial",
 "Inspirador e Próximo": "inspiring, warm tone",
 "Clean e Profissional": "clean professional",
 "Documental Natural": "documentary, natural",
 "Tech / Futurista": "tech futuristic",
 "Fashion Editorial": "fashion editorial",
};

const LIGHT_MAP: Record<string, string> = {
 "Cinematic": "cinematic lighting",
 "Natural": "natural lighting",
 "Neon": "neon lighting",
 "Studio": "studio lighting",
 "Golden Hour": "golden hour lighting",
 "Dramática": "dramatic lighting",
 "Volumétrica": "volumetric lighting",
 "Rembrandt": "Rembrandt lighting",
 "Softbox": "softbox lighting",
 "Flash Direto": "direct flash",
};

const VIEW_MAP: Record<string, string> = {
 "Visão Frontal": "front view",
 "Visão Lateral": "side view",
 "Visão Traseira": "rear view",
 "Over the Shoulder": "over-the-shoulder",
 "Nível dos Olhos": "eye level",
 "Low Angle": "low angle",
 "High Angle": "high angle",
 "Vista Aérea": "aerial view",
 "Close-up": "close-up",
 "Plano Aberto": "wide shot",
};

const CAM_MOV_MAP: Record<string, string> = {
 "Drone Flyover": "aerial drone flyover",
 "Pan Left": "slow pan left",
 "Pan Right": "slow pan right",
 "Tilt Up": "tilt up",
 "Tilt Down": "tilt down",
 "Zoom In": "slow zoom in",
 "Zoom Out": "slow zoom out",
 "Tracking Shot": "tracking shot",
 "Handheld/Tremedo": "handheld shaky camera",
 "Estático": "static shot",
 "Fpv": "FPV drone shot",
};

const GRADE_MAP: Record<string, string> = {
 "Clean e Natural": "clean natural color grade",
 "Warm Pastel": "warm pastel color grade",
 "Cool Clean": "cool clean color grade",
 "High Contrast Cinematic": "high contrast cinematic grade",
 "Soft Matte Film": "soft matte film look",
 "Vibrant Commercial": "vibrant commercial color grade",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function buildCharacterBlock(
 characters: ImagePromptParams["characters"] | VideoPromptParams["characters"]
): string {
 const parts: string[] = [];
 for (const c of characters) {
  if (!c.physical_details && !c.clothing_details && !c.name) continue;
  const subject = c.name || "The person";
  const sentences: string[] = [];
  if (c.physical_details) sentences.push(`${subject} is ${c.physical_details.trim()}`);
  if (c.clothing_details) sentences.push(`wearing ${c.clothing_details.trim()}`);
  const extra = [
   c.expression ? `with a ${c.expression.trim()} expression` : "",
   c.action ? c.action.trim() : "",
  ].filter(Boolean).join(", ");
  if (extra) sentences.push(extra);
  if (sentences.length) parts.push(sentences.join(", ") + ".");
 }
 return parts.join(" ");
}

function hasChars(characters: ImagePromptParams["characters"] | VideoPromptParams["characters"]): boolean {
 return characters.some(c => c.physical_details || c.name);
}

// ─── IMAGE PROMPT BUILDERS ────────────────────────────────────────────────────

export function buildImagePrompt(platformId: string, params: ImagePromptParams): string {
 const { generalIdea, characters, config, negativePrompt } = params;
 const charBlock = buildCharacterBlock(characters);
 const scene = generalIdea.trim();
 const style = STYLE_MAP[config.style] || config.style || "photorealistic";
 const light = LIGHT_MAP[config.lighting] || config.lighting || "";
 const view = VIEW_MAP[config.view] || config.view || "";
 const angle = VIEW_MAP[config.angle] || config.angle || "";
 const camera = config.camera || "";
 const withSkin = hasChars(characters);

 switch (platformId) {

  // ── 1. FLUX ────────────────────────────────────────────────────────────────
  // Structure: [Subject] + [Action/Context] + [Artistic Style] + [Lighting/Camera]
  case "flux":
  default: {
   const parts: string[] = [];
   if (charBlock) parts.push(charBlock);
   if (scene) parts.push(scene.endsWith(".") ? scene : scene + ".");
   const techDir: string[] = [];
   if (style) techDir.push(style);
   if (light) techDir.push(light);
   if (camera) techDir.push(`${camera} lens`);
   if (view) techDir.push(view);
   if (angle) techDir.push(angle);
   if (techDir.length) parts.push(`${techDir.join(", ")}.`);
   parts.push(pickTech() + ".");
   if (withSkin) parts.push(SKIN_PROTOCOL + ".");
   return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  // ── 2. DALL-E 3 ────────────────────────────────────────────────────────────
  // Structure: detailed descriptive paragraph
  case "dalle3": {
   const stylePrefixes: Record<string, string> = {
    "photorealistic":   "A photorealistic photograph of",
    "cinematic":      "A cinematic still of",
    "fashion editorial":  "A fashion editorial photograph of",
    "product photography": "A professional product photograph of",
    "3D render":      "A 3D rendered image of",
    "anime style":     "An anime-style illustration of",
   };
   const prefix = stylePrefixes[style] || "A detailed, high-quality image of";
   const techParts: string[] = [];
   if (light) techParts.push(light);
   if (camera) techParts.push(`${camera} lens`);
   if (view) techParts.push(view);
   if (angle) techParts.push(angle);
   const techStr = techParts.length ? `. ${techParts.join(", ")}.` : ".";
   const charStr = charBlock ? ` ${charBlock}` : "";
   const sceneStr = scene ? ` ${scene}` : "";
   const skinStr = withSkin ? ` ${SKIN_PROTOCOL}.` : "";
   const techVocab = pickTech();
   return `${prefix}${charStr}${sceneStr}${techStr}${skinStr} ${techVocab}.`.replace(/\s+/g, " ").trim();
  }

  // ── 3. GEMINI IMAGEN 3 ─────────────────────────────────────────────────────
  // Structure: direct and clear scene description with mood/atmosphere adjectives
  case "gemini_imagen": {
   const shotType = VIEW_MAP[config.angle] || "a detailed shot";
   const atmosphere = style === "cinematic" ? "moody and dramatic" :
             style === "fashion editorial" ? "elegant and refined" :
             style === "photorealistic" ? "natural and lifelike" : "vibrant and professional";
   const parts: string[] = [];
   const subjectStr = [charBlock, scene].filter(Boolean).join(", ");
   if (subjectStr) parts.push(`A ${shotType} of ${subjectStr}.`);
   if (light) parts.push(`${light.charAt(0).toUpperCase() + light.slice(1)}.`);
   parts.push(`Hyper-realistic textures, ${atmosphere} atmosphere.`);
   if (camera) parts.push(`Photographed with ${camera}.`);
   if (withSkin) parts.push(SKIN_PROTOCOL + ".");
   return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  // ── 4. MIDJOURNEY v6+ ──────────────────────────────────────────────────────
  // Structure: [Subject] + [Style] + [Parameters --]
  case "midjourney": {
   const keywords: string[] = [];
   if (charBlock) keywords.push(charBlock.replace(/\./g, ""));
   if (scene) keywords.push(scene.replace(/\./g, ""));
   if (style) keywords.push(style);
   if (light) keywords.push(light);
   if (camera) keywords.push(camera);
   if (view) keywords.push(view);
   if (angle) keywords.push(angle);
   if (withSkin) keywords.push("hyper-realistic skin, visible pores, subsurface scattering");
   keywords.push("film grain, sharp focus, professional photography");
   const ar = FORMAT_TO_MJ_AR[config.format] || "--ar 16:9";
   const neg = negativePrompt?.trim()
    ? negativePrompt.trim()
    : `text, logo, watermark, ${ANTI_PLASTIC}`;
   return `${keywords.join(", ")} ${ar} --style raw --v 6.1 --q 2 --no ${neg}`.replace(/\s+/g, " ").trim();
  }

  // ── 5. STABLE DIFFUSION ────────────────────────────────────────────────────
  // Structure: [Subject], [Environment], [Artist Style], [Technical Tags]
  case "stable_diffusion": {
   const qualityTags = "(masterpiece:1.2), (best quality:1.2), (ultra-detailed:1.1), 8K, RAW photo, sharp focus";
   const subjectParts: string[] = [];
   if (charBlock) subjectParts.push(`(${charBlock.replace(/\./g, "").trim()}:1.1)`);
   if (scene) subjectParts.push(scene.replace(/\./g, "").trim());
   const styleTags: string[] = [];
   if (style) styleTags.push(`(${style}:1.1)`);
   if (light) styleTags.push(light);
   if (camera) styleTags.push(`${camera} lens`);
   if (view) styleTags.push(view);
   if (angle) styleTags.push(angle);
   if (withSkin) styleTags.push(`(${SKIN_PROTOCOL}:1.1)`);
   return [qualityTags, ...subjectParts, ...styleTags].join(", ").replace(/\s+/g, " ").trim();
  }

  // ── 6. NANO BANANA (Gemini Flash Image) ───────────────────────────────────
  // Structure: clear description of main object + visual style
  case "nano_banana": {
   const parts: string[] = [];
   const subjectStr = [charBlock, scene].filter(Boolean).join(", ");
   if (subjectStr) parts.push(subjectStr.endsWith(".") ? subjectStr : subjectStr + ".");
   const visual = [style, light].filter(Boolean).join(", ");
   if (visual) parts.push(`${visual}.`);
   if (camera) parts.push(`${camera} lens.`);
   if (withSkin) parts.push("Hyper-realistic skin texture, natural imperfections.");
   return parts.join(" ").replace(/\s+/g, " ").trim();
  }
 }
}

// ─── VIDEO PROMPT BUILDERS ────────────────────────────────────────────────────

// Maps movement key to a cinematic EN term
const CINEMATIC_CAM_EN: Record<string, string> = {
 "Drone Flyover": "Aerial drone flyover",
 "Pan Left": "Slow pan left",
 "Pan Right": "Slow pan right",
 "Tilt Up": "Tilt up reveal",
 "Tilt Down": "Tilt down reveal",
 "Zoom In": "Slow dolly push-in",
 "Zoom Out": "Slow pull-back",
 "Tracking Shot": "Tracking shot",
 "Handheld/Tremedo": "Handheld documentary shot",
 "Estático": "Static locked shot",
 "Fpv": "FPV drone shot",
};

// Maps movement key to a cinematic PT term
const CINEMATIC_CAM_PT: Record<string, string> = {
 "Drone Flyover": "Drone aéreo descendo suavemente",
 "Pan Left": "Panorâmica lenta para a esquerda",
 "Pan Right": "Panorâmica lenta para a direita",
 "Tilt Up": "Tilt revelador para cima",
 "Tilt Down": "Tilt revelador para baixo",
 "Zoom In": "Dolly push-in lento",
 "Zoom Out": "Dolly pull-back lento",
 "Tracking Shot": "Câmera em tracking",
 "Handheld/Tremedo": "Câmera na mão (documentário)",
 "Estático": "Plano fixo",
 "Fpv": "Câmera FPV",
};

// Maps movement key to Runway transformation keyword
const RUNWAY_TRANS_EN: Record<string, string> = {
 "Drone Flyover": "Aerial flyover",
 "Pan Left": "Pan left reveal",
 "Pan Right": "Pan right reveal",
 "Tilt Up": "Tilt up reveal",
 "Tilt Down": "Tilt down reveal",
 "Zoom In": "Slow zoom-in",
 "Zoom Out": "Slow zoom-out",
 "Tracking Shot": "Tracking push-in",
 "Handheld/Tremedo": "Handheld rush",
 "Estático": "Morphing",
 "Fpv": "FPV sweep",
};

const RUNWAY_TRANS_PT: Record<string, string> = {
 "Drone Flyover": "Drone avança suavemente",
 "Pan Left": "Panorâmica revela à esquerda",
 "Pan Right": "Panorâmica revela à direita",
 "Tilt Up": "Tilt revela o topo",
 "Tilt Down": "Tilt revela o fundo",
 "Zoom In": "Zoom aproxima lentamente",
 "Zoom Out": "Zoom afasta revelando",
 "Tracking Shot": "Câmera em tracking avança",
 "Handheld/Tremedo": "Câmera na mão avança",
 "Estático": "Morphing",
 "Fpv": "FPV avança",
};

export function buildVideoPrompt(platformId: string, params: VideoPromptParams): string {
 const { generalIdea, characters, config } = params;
 const scene = generalIdea.trim();

 const cinematicCam = CINEMATIC_CAM_EN[config.movement] || CAM_MOV_MAP[config.movement] || "static shot";
 const camCap = cinematicCam.charAt(0).toUpperCase() + cinematicCam.slice(1);
 const style = STYLE_MAP[config.tone] || STYLE_MAP[config.style] || "cinematic";
 const light = LIGHT_MAP[config.lighting] || config.lighting || "natural lighting";
 const grade = GRADE_MAP[config.color_grade] || config.color_grade || "";
 const lens = config.camera || "35mm";
 const location = config.location || "";
 const timeOfDay = config.time_of_day || "";
 const environment = config.environment || "";
 const tone = STYLE_MAP[config.tone] || config.tone || "";

 switch (platformId) {

  // ── KLING 1.5 ──────────────────────────────────────────────────────────────
  // [Close-up/shot type] of [character with physical details],
  // [action with physical detail — steam, texture, weight],
  // [camera movement], [lighting], 4K, [style], film grain
  case "kling":
  default: {
   const charBlock = buildCharacterBlock(characters);
   const hasChars = characters.some(c => c.physical_details || c.name);
   const shotType = hasChars ? "Close-up" : "Medium shot";

   const subjectParts: string[] = [];
   if (hasChars && charBlock) subjectParts.push(charBlock.replace(/\.\s*$/, ""));
   if (scene) subjectParts.push(scene.replace(/\.\s*$/, ""));
   const subject = subjectParts.join(", ");

   const techParts = [
    camCap,
    light,
    `${lens} lens`,
    "4K",
    `${style} style`,
    "film grain",
    "cinematic",
   ].filter(Boolean);

   return `${shotType} of ${subject}, ${techParts.join(", ")}.`
    .replace(/\s+/g, " ").trim();
  }

  // ── VEO (Google) ───────────────────────────────────────────────────────────
  // [Cinematic camera movement]: [action]. [location, time of day].
  // [atmosphere]. [lighting]. [lens]. [color grade]. 4K cinematic.
  case "veo": {
   const charBlock = buildCharacterBlock(characters);
   const subjectStr = [charBlock?.replace(/\.\s*$/, ""), scene]
    .filter(Boolean).join(", ");

   const parts: string[] = [];

   if (subjectStr) {
    parts.push(`${camCap}: ${subjectStr}.`);
   } else {
    parts.push(`${camCap} shot.`);
   }

   const locParts = [
    location ? `in ${location}` : "",
    timeOfDay ? `during ${timeOfDay.toLowerCase()}` : "",
   ].filter(Boolean);
   if (locParts.length) parts.push(`${locParts.join(", ")}.`);
   if (environment) parts.push(`Background: ${environment}.`);

   const atmosphereParts = [tone, (style && style !== tone) ? style : ""]
    .filter(Boolean);
   if (atmosphereParts.length) {
    parts.push(`${atmosphereParts.join(", ")} atmosphere.`);
   }

   parts.push(`${light.charAt(0).toUpperCase() + light.slice(1)}.`);
   parts.push(`${lens} lens.`);
   if (grade) parts.push(`Color grade: ${grade}.`);
   parts.push("4K cinematic quality.");

   return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  // ── RUNWAY GEN-3 ───────────────────────────────────────────────────────────
  // [Initial state] → [Action/transformation keyword] → [Final state],
  // [camera style], [atmosphere effect]
  case "runway": {
   const charBlock = buildCharacterBlock(characters);
   const subjectStr = [charBlock?.replace(/\.\s*$/, ""), scene]
    .filter(Boolean).join(", ") || "the scene";
   const actionStr = characters.find(c => c.action)?.action || "";
   const transKeyword = RUNWAY_TRANS_EN[config.movement] || camCap;

   const stateA = location ? `${subjectStr} in ${location}` : subjectStr;
   const transition = actionStr ? `${transKeyword}: ${actionStr}` : transKeyword;
   const stateB = `${style} cinematic atmosphere${grade ? `, ${grade}` : ""}`;

   return `${stateA} → ${transition} → ${stateB}, ${light}, ${lens} lens, 4K, film grain, shallow depth of field.`
    .replace(/\s+/g, " ").trim();
  }

  // ── SORA (OpenAI) ──────────────────────────────────────────────────────────
  // Narrative paragraph: character (appearance + clothing + specific movement)
  // + background (surface details, background elements) + atmosphere
  // + camera integrated in narrative (NOT as a separate parameter)
  case "sora": {
   const charBlock = buildCharacterBlock(characters);
   const parts: string[] = [];

   if (charBlock) parts.push(charBlock.endsWith(".") ? charBlock : charBlock + ".");
   if (scene) parts.push(scene.endsWith(".") ? scene : scene + ".");

   const bgParts: string[] = [];
   if (location) bgParts.push(`in ${location}`);
   if (timeOfDay) bgParts.push(`during ${timeOfDay.toLowerCase()}`);
   if (environment) bgParts.push(environment);
   if (bgParts.length) {
    parts.push(`The scene unfolds ${bgParts.join(", ")}.`);
   }

   const atmosphereStr = tone || style || "cinematic";
   parts.push(`${light.charAt(0).toUpperCase() + light.slice(1)} fills the environment with a ${atmosphereStr} atmosphere.`);
   parts.push(`The camera ${cinematicCam.toLowerCase()} with a ${lens} lens, revealing every texture and depth in the scene.`);
   parts.push(`${atmosphereStr.charAt(0).toUpperCase() + atmosphereStr.slice(1)} aesthetic${grade ? `, ${grade}` : ""}, 8K, high detail, film grain.`);

   return parts.join(" ").replace(/\s+/g, " ").trim();
  }
 }
}

// ─── PT PROMPT BUILDERS (for UI display) ─────────────────────────────────────

// ─── PT HELPERS ───────────────────────────────────────────────────────────────

function ptCharBlock(
 characters: ImagePromptParams["characters"] | VideoPromptParams["characters"]
): string {
 const lines: string[] = [];
 for (const c of characters) {
  if (!c.name && !c.physical_details && !c.clothing_details) continue;
  const subject = c.name || "Personagem";
  const parts: string[] = [];
  if (c.physical_details) parts.push(`${subject}: ${c.physical_details}`);
  else parts.push(subject);
  if (c.clothing_details) parts.push(`usando ${c.clothing_details}`);
  if (c.expression) parts.push(`expressão ${c.expression}`);
  if (c.action) parts.push(c.action);
  lines.push(parts.join(", "));
 }
 return lines.join("\n");
}

// ─── PT IMAGE PROMPT BUILDERS ─────────────────────────────────────────────────

export function buildImagePromptPt(platformId: string, params: ImagePromptParams): string {
 const { generalIdea, characters, config, negativePrompt } = params;
 const scene = generalIdea.trim();
 const chars = ptCharBlock(characters);
 const withSkin = characters.some(c => c.physical_details || c.name);
 const style = config.style || "";
 const lighting = config.lighting || "";
 const camera = config.camera || "";
 const view = config.view || "";
 const angle = config.angle || "";

 switch (platformId) {

  // Flux — prosa natural espelhando o EN: sujeito → cena → técnica → qualidade
  case "flux":
  default: {
   const parts: string[] = [];
   if (chars) {
    const charsFlat = chars.replace(/\n/g, ". ");
    parts.push(charsFlat.endsWith(".") ? charsFlat : charsFlat + ".");
   }
   if (scene) parts.push(scene.endsWith(".") ? scene : scene + ".");
   const tech: string[] = [];
   if (style) tech.push(style);
   if (lighting) tech.push(lighting);
   if (camera) tech.push(`lente ${camera}`);
   if (view) tech.push(view);
   if (angle) tech.push(angle);
   if (tech.length) parts.push(`${tech.join(", ")}.`);
   if (withSkin) parts.push(`Protocolo de pele: textura hiper-realista, poros visíveis, subsurface scattering.`);
   parts.push(`Qualidade: hiper-realista, 8K, foco nítido, granulado cinematográfico.`);
   if (negativePrompt?.trim()) parts.push(`Evitar: ${negativePrompt.trim()}.`);
   return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  // DALL-E 3 — parágrafo descritivo completo, espelhando o EN
  case "dalle3": {
   const stylePrefix: Record<string, string> = {
    "Fotorrealista": "Fotografia fotorrealista de",
    "Cinematográfico": "Cena cinematográfica de",
    "Editorial de Moda": "Editorial de moda com",
    "Product Shot": "Fotografia de produto de",
    "3D Render": "Render 3D de",
    "Anime": "Ilustração anime de",
   };
   const prefix = stylePrefix[style] || "Imagem detalhada de";
   const parts: string[] = [];
   const subject = [chars?.replace(/\n/g, ", "), scene].filter(Boolean).join(", ");
   parts.push(`${prefix} ${subject || "cena não definida"}.`);
   const tech: string[] = [];
   if (lighting) tech.push(lighting);
   if (camera) tech.push(`lente ${camera}`);
   if (view) tech.push(view);
   if (angle) tech.push(angle);
   if (tech.length) parts.push(`${tech.join(", ")}.`);
   if (withSkin) parts.push(`Protocolo de pele: textura realista, poros visíveis.`);
   if (negativePrompt?.trim()) parts.push(`Evitar: ${negativePrompt.trim()}.`);
   return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  // Gemini Imagen 3 — shot + sujeito + iluminação + atmosfera + câmera
  case "gemini_imagen": {
   const moodMap: Record<string, string> = {
    "Cinematográfico": "dramática e cinematográfica",
    "Fotorrealista": "natural e realista",
    "Editorial de Moda": "elegante e refinada",
    "Product Shot": "limpa e profissional",
    "3D Render": "vibrante e tridimensional",
   };
   const mood = moodMap[style] || "vibrante e profissional";
   const shotType = angle || view || "plano geral";
   const parts: string[] = [];
   const subject = [chars?.replace(/\n/g, ", "), scene].filter(Boolean).join(", ");
   if (subject) parts.push(`Um ${shotType} de ${subject}.`);
   if (lighting) parts.push(`${lighting.charAt(0).toUpperCase() + lighting.slice(1)}.`);
   parts.push(`Texturas hiper-realistas, atmosfera ${mood}.`);
   if (camera) parts.push(`Fotografado com ${camera}.`);
   if (withSkin) parts.push(`Protocolo de pele aplicado.`);
   if (negativePrompt?.trim()) parts.push(`Evitar: ${negativePrompt.trim()}.`);
   return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  // Midjourney v6+ — keywords em PT + parâmetros -- (formato nativo da plataforma)
  case "midjourney": {
   const ar = FORMAT_TO_MJ_AR[config.format] || "--ar 16:9";
   const keywords: string[] = [];
   if (chars) keywords.push(chars.replace(/\n/g, ", "));
   if (scene) keywords.push(scene.replace(/\./g, ""));
   if (style) keywords.push(style);
   if (lighting) keywords.push(lighting);
   if (camera) keywords.push(camera);
   if (withSkin) keywords.push("pele hiper-realista, poros visíveis");
   keywords.push("granulado de filme, foco nítido, fotografia profissional");
   const neg = negativePrompt?.trim() || "texto, logo, pele plástica, deformado";
   return `${keywords.join(", ")} ${ar} --style raw --v 6.1 --q 2 --no ${neg}`
    .replace(/\s+/g, " ").trim();
  }

  // Stable Diffusion — tags ponderadas em PT (formato nativo da plataforma)
  case "stable_diffusion": {
   const qualityTags = "(masterpiece:1.2), (best quality:1.2), (ultra-detalhado:1.1), 8K, RAW photo, foco nítido";
   const subjectTags: string[] = [];
   if (chars) subjectTags.push(`(${chars.replace(/\n/g, ", ").trim()}:1.1)`);
   if (scene) subjectTags.push(scene.replace(/\./g, "").trim());
   const styleTags: string[] = [];
   if (style) styleTags.push(`(${style}:1.1)`);
   if (lighting) styleTags.push(lighting);
   if (camera) styleTags.push(`lente ${camera}`);
   if (withSkin) styleTags.push(`(pele hiper-realista, poros visíveis, subsurface scattering:1.1)`);
   const mainPrompt = [qualityTags, ...subjectTags, ...styleTags].join(", ").replace(/\s+/g, " ").trim();
   if (negativePrompt?.trim()) {
    return `${mainPrompt}\nNegative: (deformado:1.3), (baixa qualidade:1.5), ${negativePrompt.trim()}`;
   }
   return mainPrompt;
  }

  // Nano Banana — descrição concisa + estilo visual (espelhando o EN)
  case "nano_banana": {
   const parts: string[] = [];
   const subject = [chars?.replace(/\n/g, ", "), scene].filter(Boolean).join(", ");
   if (subject) parts.push(subject.endsWith(".") ? subject : subject + ".");
   const visual: string[] = [];
   if (style) visual.push(style);
   if (lighting) visual.push(lighting);
   if (visual.length) parts.push(`${visual.join(", ")}.`);
   if (camera) parts.push(`Lente ${camera}.`);
   if (withSkin) parts.push(`Textura de pele hiper-realista, imperfeições naturais.`);
   return parts.join(" ").replace(/\s+/g, " ").trim();
  }
 }
}

// ─── PT VIDEO PROMPT BUILDERS ─────────────────────────────────────────────────

export function buildVideoPromptPt(platformId: string, params: VideoPromptParams): string {
 const { generalIdea, characters, config, negativePrompt } = params;
 const scene = generalIdea.trim();
 const chars = ptCharBlock(characters);
 const tone = STYLE_MAP[config.tone] || config.tone || "";
 const style = STYLE_MAP[config.style] || config.style || "";
 const grade = GRADE_MAP[config.color_grade] || config.color_grade || "";
 const light = LIGHT_MAP[config.lighting] || config.lighting || "";
 const lens = config.camera || "35mm";
 const location = config.location || "";
 const timeOfDay = config.time_of_day || "";
 const environment = config.environment || "";

 const cinematicCamPt = CINEMATIC_CAM_PT[config.movement] || config.movement || "plano estático";
 const transKeyPt = RUNWAY_TRANS_PT[config.movement] || config.movement || "Morphing";

 switch (platformId) {

  // Kling 1.5 — estrutura espelhada do EN, em português natural
  case "kling":
  default: {
   const hasChars = characters.some(c => c.physical_details || c.name);
   const shotTypePt = hasChars ? "Plano fechado" : "Plano médio";

   const subjectParts: string[] = [];
   if (hasChars && chars) subjectParts.push(chars.replace(/\n/g, ", "));
   if (scene) subjectParts.push(scene.replace(/\.\s*$/, ""));
   const subject = subjectParts.join(", ");

   const techParts = [
    cinematicCamPt,
    light || "iluminação natural",
    `lente ${lens}`,
    "4K",
    `estilo ${tone || style || "cinematográfico"}`,
    "granulado de filme",
    "cinematográfico",
   ].filter(Boolean);

   return `${shotTypePt} de ${subject}, ${techParts.join(", ")}.`
    .replace(/\s+/g, " ").trim();
  }

  // Veo — cinematográfico com câmera em destaque, estrutura espelhada do EN
  case "veo": {
   const subjectStr = [chars?.replace(/\n/g, ", "), scene].filter(Boolean).join(", ");
   const parts: string[] = [];

   if (subjectStr) {
    parts.push(`${cinematicCamPt}: ${subjectStr}.`);
   } else {
    parts.push(`${cinematicCamPt}.`);
   }

   const locParts = [
    location ? `em ${location}` : "",
    timeOfDay ? `durante ${timeOfDay.toLowerCase()}` : "",
   ].filter(Boolean);
   if (locParts.length) parts.push(`${locParts.join(", ")}.`);
   if (environment) parts.push(`Ambiente: ${environment}.`);

   const atmosphereParts = [tone || style].filter(Boolean);
   if (atmosphereParts.length) {
    parts.push(`Atmosfera ${atmosphereParts.join(", ")}.`);
   }

   if (light) parts.push(`${light.charAt(0).toUpperCase() + light.slice(1)}.`);
   parts.push(`Lente ${lens}.`);
   if (grade) parts.push(`Color grade: ${grade}.`);
   parts.push("4K cinematográfico.");
   if (negativePrompt?.trim()) parts.push(`Evitar: ${negativePrompt.trim()}.`);

   return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  // Runway Gen-3 — estado A → transformação → estado B
  case "runway": {
   const allMarkers = [
    " para ", " em ", " se tornando ", " vira ", " transforma ",
    " → ", " torna-se ", " passa a ", " muda para ",
    " to ", " into ", " becomes ", " transforms ", " morphs ", " turning into ",
   ];
   const hasTransition = allMarkers.some(m => scene.toLowerCase().includes(m));

   const lines: string[] = [];

   if (!hasTransition && scene) {
    lines.push(`⚠️ Descreva uma mudança de estado para o Runway funcionar melhor.`);
    lines.push(`Dica: reescreva como "estado inicial → ação/transformação → estado final".`);
    lines.push("");
   }

   const subjectStr = [chars?.replace(/\n/g, ", "), scene]
    .filter(Boolean).join(", ") || "a cena";
   const actionStr = characters.find(c => c.action)?.action || "";
   const stateA = location ? `${subjectStr} em ${location}` : subjectStr;
   const transition = actionStr ? `${transKeyPt}: ${actionStr}` : transKeyPt;
   const stateB = `atmosfera ${tone || style || "cinematográfica"}${grade ? `, ${grade}` : ""}`;

   lines.push(`${stateA} → ${transition} → ${stateB}`);
   if (light) lines.push(`${light}.`);
   lines.push(`Lente ${lens}, 4K, granulado de filme, profundidade de campo.`);
   if (negativePrompt?.trim()) lines.push(`Evitar: ${negativePrompt.trim()}.`);

   return lines.join("\n").trim();
  }

  // Sora — narração detalhada como roteiro, câmera integrada na narrativa
  case "sora": {
   const parts: string[] = [];

   if (chars) {
    const charsNarrative = chars.replace(/\n/g, ". ");
    parts.push(charsNarrative.endsWith(".") ? charsNarrative : charsNarrative + ".");
   }
   if (scene) parts.push(scene.endsWith(".") ? scene : scene + ".");

   const bgParts: string[] = [];
   if (location) bgParts.push(`em ${location}`);
   if (timeOfDay) bgParts.push(timeOfDay.toLowerCase());
   if (environment) bgParts.push(environment);
   if (bgParts.length) {
    parts.push(`O cenário se passa ${bgParts.join(", ")}.`);
   }

   const atmosphereStr = tone || style || "cinematográfico";
   if (light) {
    parts.push(`${light.charAt(0).toUpperCase() + light.slice(1)} cria uma atmosfera ${atmosphereStr} na cena.`);
   } else {
    parts.push(`A cena carrega uma atmosfera ${atmosphereStr}.`);
   }

   const movPtCap = cinematicCamPt.charAt(0).toUpperCase() + cinematicCamPt.slice(1);
   parts.push(`A câmera realiza ${movPtCap} com lente ${lens}, revelando cada textura e profundidade do ambiente.`);
   parts.push(`Estética ${atmosphereStr}${grade ? `, ${grade}` : ""}, 8K, riqueza de detalhes, granulado de filme.`);
   if (negativePrompt?.trim()) parts.push(`Evitar: ${negativePrompt.trim()}.`);

   return parts.join(" ").replace(/\s+/g, " ").trim();
  }
 }
}

// ─── TENANT PLATFORM CONFIG ───────────────────────────────────────────────────

export interface TenantPlatformConfig {
 tenant_slug: string;
 platform_id: string;
 is_enabled: boolean;
 api_key_encrypted?: string;
 custom_endpoint?: string;
 extra_params?: Record<string, any>;
}

export function getDefaultPlatformForTenant(
 type: PlatformType,
 configs: TenantPlatformConfig[]
): string {
 const enabled = configs.filter(c => c.is_enabled);
 const platforms = type === "image" ? IMAGE_PLATFORMS : VIDEO_PLATFORMS;
 for (const cfg of enabled) {
  if (platforms.find(p => p.id === cfg.platform_id)) return cfg.platform_id;
 }
 return type === "image" ? "flux" : "kling";
}
