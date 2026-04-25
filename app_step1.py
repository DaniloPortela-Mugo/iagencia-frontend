import tkinter as tk
from tkinter import filedialog, ttk, messagebox
from PIL import Image, ImageDraw, ImageFont, ImageTk
import os

os.makedirs("camadas", exist_ok=True)
FONT_OPTIONS = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Georgia.ttf"
]
TEXT_POSITIONS = {"Topo": 100, "Centro": 500, "Base": 900}

root = tk.Tk()
root.title("App Step 2 - Múltiplos Personagens + Alinhamento de Texto")

# Variáveis principais
bg_color_var = tk.StringVar(value="#F0F0FF")
title_var = tk.StringVar(value="BORIS, o Bulldog CEO")
text_var = tk.StringVar(value="Mascote da sua marca")
font_title_var = tk.StringVar(value=FONT_OPTIONS[0])
font_text_var = tk.StringVar(value=FONT_OPTIONS[1])
font_size_var = tk.StringVar(value="70")
text_position_var = tk.StringVar(value="Base")
text_align_var = tk.StringVar(value="Centro")

# Lista de personagens
personagens_data = [{"path": tk.StringVar(), "x": tk.StringVar(value="100"),
                     "y": tk.StringVar(value="100"), "scale": tk.StringVar(value="1.0")}
                    for _ in range(3)]

def gerar_imagem():
    w, h = 1080, 1080
    bg = bg_color_var.get()
    title = title_var.get()
    subtitle = text_var.get()
    ft_title = font_title_var.get()
    ft_text = font_text_var.get()
    fs = int(font_size_var.get())
    y_pos = TEXT_POSITIONS[text_position_var.get()]
    align = text_align_var.get()

    bg_img = Image.new("RGBA", (w, h), bg)

    # Camada de personagens
    char_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for p in personagens_data:
        path = p["path"].get()
        if os.path.exists(path):
            img = Image.open(path).convert("RGBA")
            scale = float(p["scale"].get())
            img = img.resize((int(img.width * scale), int(img.height * scale)))
            x, y = int(p["x"].get()), int(p["y"].get())
            char_layer.paste(img, (x, y), img)

    # Texto
    text_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(text_layer)
    f1 = ImageFont.truetype(ft_title, fs)
    f2 = ImageFont.truetype(ft_text, int(fs * 0.8))

    def aligned_x(text, font):
        text_width = draw.textbbox((0, 0), text, font=font)[2]
        if align == "Centro":
            return (w - text_width) // 2
        elif align == "Direita":
            return w - text_width - 100
        else:
            return 100

    draw.text((aligned_x(title, f1), y_pos), title, font=f1, fill=(0, 0, 0, 255))
    draw.text((aligned_x(subtitle, f2), y_pos + fs + 10), subtitle, font=f2, fill=(0, 0, 0, 255))

    # Composição final
    comp = bg_img.copy()
    comp.alpha_composite(char_layer)
    comp.alpha_composite(text_layer)
    comp.save("camadas/composite_step2.png")

    preview = comp.copy()
    preview.thumbnail((300, 300))
    tk_img = ImageTk.PhotoImage(preview)
    preview_label.config(image=tk_img)
    preview_label.image = tk_img
    messagebox.showinfo("Imagem", "✅ Imagem gerada com múltiplos personagens!")

# GUI
tk.Label(root, text="Cor de fundo (hex):").pack()
tk.Entry(root, textvariable=bg_color_var).pack()

tk.Label(root, text="Título:").pack()
tk.Entry(root, textvariable=title_var).pack()

tk.Label(root, text="Subtítulo:").pack()
tk.Entry(root, textvariable=text_var).pack()

tk.Label(root, text="Fonte do Título:").pack()
ttk.Combobox(root, textvariable=font_title_var, values=FONT_OPTIONS).pack()

tk.Label(root, text="Fonte do Texto:").pack()
ttk.Combobox(root, textvariable=font_text_var, values=FONT_OPTIONS).pack()

tk.Label(root, text="Tamanho da Fonte:").pack()
tk.Entry(root, textvariable=font_size_var).pack()

tk.Label(root, text="Posição Vertical do Texto:").pack()
ttk.Combobox(root, textvariable=text_position_var, values=list(TEXT_POSITIONS.keys())).pack()

tk.Label(root, text="Alinhamento do Texto:").pack()
ttk.Combobox(root, textvariable=text_align_var, values=["Esquerda", "Centro", "Direita"]).pack()

tk.Label(root, text="Personagens:").pack()
for i, p in enumerate(personagens_data):
    frame = tk.Frame(root); frame.pack(pady=2)
    tk.Button(frame, text=f"Upload P{i+1}", command=lambda var=p["path"]: var.set(filedialog.askopenfilename())).grid(row=0, column=0)
    tk.Label(frame, text="X:").grid(row=0, column=1)
    tk.Entry(frame, textvariable=p["x"], width=5).grid(row=0, column=2)
    tk.Label(frame, text="Y:").grid(row=0, column=3)
    tk.Entry(frame, textvariable=p["y"], width=5).grid(row=0, column=4)
    tk.Label(frame, text="Escala:").grid(row=0, column=5)
    tk.Entry(frame, textvariable=p["scale"], width=5).grid(row=0, column=6)

tk.Button(root, text="Gerar Imagem", command=gerar_imagem).pack(pady=10)

preview_label = tk.Label(root)
preview_label.pack(pady=10)

root.mainloop()
