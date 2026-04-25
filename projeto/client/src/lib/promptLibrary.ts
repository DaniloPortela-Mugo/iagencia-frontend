import { ShoppingBag, Camera, Aperture, Briefcase, Search, Clock } from "lucide-react";

export const SUPER_PRESETS = [
  { id: "packshot", label: "Packshot Luxo", icon: ShoppingBag, config: { style: "Product Shot", lighting: "Studio", camera: "Macro", angle: "Nível dos Olhos" }, magicPrompt: "soft neutral studio background with diffused shadows, high-end commercial photography, ultra-detailed, matte finish, non-metallic, 8K ultra-photorealistic, pure and minimalistic." },
  { id: "lifestyle", label: "Lifestyle 35mm", icon: Camera, config: { style: "Cinematográfico", lighting: "Natural", camera: "35mm", angle: "Nível dos Olhos" }, magicPrompt: "shot on 35mm lens, Kodak Portra 400 film colors, soft natural light, shallow depth of field, cinematic outdoor portrait, pure and refreshing atmosphere, authentic documentary realism." },
  { id: "editorial", label: "Editorial", icon: Aperture, config: { style: "Editorial de Moda", lighting: "Dramática", camera: "85mm", angle: "Nível dos Olhos" }, magicPrompt: "dramatic studio flash lighting, cinematic composition, high-fashion elegance, fine details of pores, realistic material response, 85mm high precision photography." },
  { id: "corporativo", label: "Corporativo", icon: Briefcase, config: { style: "Fotorrealista", lighting: "Natural", camera: "Sony a7S", angle: "Nível dos Olhos" }, magicPrompt: "natural daylight, minimalistic interior design, soft shadows, clean background in white and soft gray, corporate trust atmosphere, natural postures, realistic lighting." },
  { id: "close", label: "Macro Detalhe", icon: Search, config: { style: "Fotorrealista", lighting: "Studio", camera: "Macro", angle: "Close-up" }, magicPrompt: "Ultra close-up macro shot, even and clinical lighting, highlighting texture and micro-details, hyper-realistic study, high detail, 8k resolution." },
  { id: "retro", label: "Retrô 2000s", icon: Clock, config: { style: "Fotorrealista", lighting: "Flash Direto", camera: "Point & Shoot", angle: "Nível dos Olhos" }, magicPrompt: "cheap compact digital camera, built-in flash, somewhat harsh lighting, soft colors, imperfect framing, nostalgic aesthetic, visible medium film grain, vintage 2000s vibe." }
];

export const PROMPT_LIBRARY: Record<string, string[]> = {
  "Produto & Packshot": [
    "O produto está em primeiro plano sobre uma superfície limpa com luz natural da manhã e sombras suaves, enquanto o fundo permanece suavemente desfocado e calmo. O acabamento é fotorrealista e premium com textura nítida.",
    "A câmera se aproxima do produto em close-up com fundo desfocado e cores nostálgicas, e a iluminação cinematográfica revela detalhes finos e textura realista.",
    "O objeto central recebe reflexos dourados com névoa suave envolvendo a base, e o cenário minimalista de alta moda cria um clima editorial sensual com luz cinematográfica.",
    "A visão frontal mostra o produto contra um fundo branco limpo, com iluminação difusa e uniforme e sombras sutis que o ancoram na superfície. A composição é minimalista e luxuosa.",
    "A fotografia de produto é ultradetalhada com acabamento fosco e sem brilho metálico, e o objeto se destaca em primeiro plano com nitidez absoluta.",
    "O fundo de estúdio é neutro e suave com sombras difusas, e a cena apresenta cosméticos em primeiro plano com reflexos sutis e visual limpo de alta qualidade."
  ],
  "Lifestyle & Casual": [
    "Sob luz solar clara, o retrato cinematográfico mostra a pessoa em primeiro plano com foco suave e tons pastel, enquanto o fundo mantém uma atmosfera pura e refrescante de calma.",
    "A luz natural quente projeta sombras suaves, e o visual é limpo e comercial com cores naturais e tons pastel, com o sujeito em destaque no primeiro plano.",
    "A iluminação cinematográfica cria uma atmosfera energética e determinada, com sensação de ritmo constante e um ambiente organizado ao fundo.",
    "A luz natural da hora dourada cria uma atmosfera nostálgica e carinhosa, com sombras suaves e narrativa emocional em fotografia realista de médio formato.",
    "A pessoa mantém uma pose relaxada em primeiro plano, fotografada com uma DSLR profissional e lente 50mm f 1.8 sem flash, e a luz natural com preenchimento suave revela poros e textura de tecido com imperfeições autênticas."
  ],
  "Corporativo": [
    "A postura dinâmica mostra trabalho ativo em primeiro plano, fotografado com lente 85mm em resolução extremamente alta, com gradação de cores natural e profundidade de campo rasa.",
    "Sombras suaves e iluminação realista criam atmosfera corporativa de confiança, com posturas naturais e ambiente organizado ao fundo."
  ],
  "Esportes & Ação": [
    "A iluminação cinematográfica vívida acompanha uma fotografia esportiva dinâmica com o atleta em primeiro plano e o ambiente desfocado ao fundo.",
    "Em meio ao movimento, um respingo de água fica suspenso no ar enquanto a pose é poderosa e elegante, com cores vibrantes e profundidade de campo rasa que realça a ação.",
    "O contraste é nítido e a pose dinâmica, com desfoque de movimento controlado, destaques brilhantes e composição energética em um editorial esportivo altamente detalhado."
  ],
  "Retrato": [
    "O retrato de estúdio traz tom de cor em alto contraste, destaques brilhantes e textura suave com flash direto e estética de moda crua.",
    "A luz natural suave e a profundidade de campo rasa destacam o rosto em primeiro plano, com lente 35mm e visual editorial de alta qualidade em cores ricas."
  ],
  "Selfie": [
    "A selfie em close-up recebe luz solar no rosto com fundo desfocado e iluminação clara, capturada com smartphone em estilo casual e espontâneo.",
    "A selfie frontal em close-up é capturada com câmera frontal de smartphone em resolução alta, com luz suave de LED e teto criando brilho realista na pele e microdetalhes naturais.",
    "A foto tem baixa qualidade e bastante ruído, feita com luz natural que realça características e cores naturais, capturada por smartphone em estilo UGC autêntico."
  ],
  "Close-up & Macro": [
    "A foto macro em close-up extremo usa iluminação uniforme e precisa para realçar textura e microdetalhes, com nitidez extrema e estudo hiper realista.",
    "A fotografia editorial ultra realista sem flash é feita com DSLR e lente 50mm f 1.8, com detalhes finos dos poros e resposta realista do material, além de imperfeições autênticas e luz natural com preenchimento suave."
  ],
  "Editorial & Moda": [
    "A iluminação dramática de flash de estúdio em tons suaves de rosa e azul celeste cria um clima editorial de moda com composição cinematográfica, linhas arquitetônicas limpas ao fundo e elegância de alta costura.",
    "A fotografia áspera e de alto contraste traz granulação forte, altas luzes estouradas e pretos profundos, com ambiente de estúdio minimalista e presença emocional crua em composição ousada.",
    "A postura profissional de passarela com expressão calma e serena aparece em primeiro plano, com estética de revista de moda de luxo, composição limpa e iluminação natural suave."
  ],
  "Ambientes": [
    "O ambiente apresenta linhas simples e superfícies desimpedidas com iluminação aconchegante, criando sensação de ordem e calma.",
    "A fotografia amadora hiper realista é capturada com smartphone e mostra uma realidade cotidiana com fundo também em foco, iluminação natural e pequenas imperfeições visíveis.",
    "O interior moderno e aconchegante recebe luz solar pelas janelas, com sombras realistas e móveis de madeira, em plano aberto de estilo cinematográfico.",
    "A fotografia realista mostra design contemporâneo elegante e decoração estilosa, com iluminação natural suave e ambiente convidativo sem pessoas em primeiro plano.",
    "A cena é ensolarada com belas sombras suaves, visual fotorrealista e linguagem cinematográfica.",
    "O tom visual enfatiza curvas arrojadas, texturas e cores quentes saturadas com realces de alto contraste, criando atmosfera cinematográfica de luxo com toque nostálgico de fotografia analógica.",
    "A iluminação natural suave cria um ambiente acolhedor e arejado, com texturas realistas e interior organizado, elegante e funcional."
  ]
};
