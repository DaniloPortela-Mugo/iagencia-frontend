import svgwrite
from PIL import Image

image_path = "camadas/composite_step2.png"
output_png = "camadas/composite_transparent.png"
output_svg = "camadas/composite.svg"

# PNG transparente
img = Image.open(image_path).convert("RGBA")
img.save(output_png)

# SVG básico com imagem + texto vetorial
w, h = img.size
dwg = svgwrite.Drawing(output_svg, size=(w, h))

dwg.add(dwg.image(href=output_png, insert=(0, 0), size=(w, h)))
dwg.add(dwg.text("BORIS, o Bulldog CEO", insert=(100, 100), fill="black", font_size="40px", font_family="Arial"))
dwg.add(dwg.text("Mascote da sua marca", insert=(100, 150), fill="black", font_size="28px", font_family="Georgia"))

dwg.save()
print("PNG e SVG exportados na pasta 'camadas'")
