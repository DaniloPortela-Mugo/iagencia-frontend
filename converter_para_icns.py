from PIL import Image
import os

# Caminho da imagem original
imagem_origem = "vox.jpg"

# Nome da pasta de ícones temporária
pasta_iconset = "vox.iconset"

# Tamanhos exigidos para .icns (Apple guidelines)
tamanhos = [
    (16, False), (16, True),
    (32, False), (32, True),
    (128, False), (128, True),
    (256, False), (256, True),
    (512, False), (512, True)
]

# Criar pasta
os.makedirs(pasta_iconset, exist_ok=True)

# Abrir imagem original
img = Image.open(imagem_origem)

# Gerar imagens redimensionadas
for tamanho, retina in tamanhos:
    tamanho_final = tamanho * 2 if retina else tamanho
    nome = f"icon_{tamanho}x{tamanho}{'@2x' if retina else ''}.png"
    caminho = os.path.join(pasta_iconset, nome)
    img.resize((tamanho_final, tamanho_final), Image.LANCZOS).save(caminho)

# Criar .icns com utilitário do macOS
os.system(f"iconutil -c icns {pasta_iconset}")

# Limpeza opcional
# os.system(f"rm -r {pasta_iconset}")

print("✅ vox.icns gerado com sucesso!")
