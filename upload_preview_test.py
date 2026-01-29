"""
upload_preview_test.py

Script mínimo que mostra como fazer upload de uma imagem (clicando no botão OU no próprio label)
e exibir o preview dentro do label assim que a imagem for escolhida.
"""

import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image, ImageTk


class UploadPreviewTest(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Teste de Upload e Preview")
        self.minsize(500, 400)

        # Variável para manter referência do PhotoImage (evita garbage collector)
        self.photo_ref = None

        # Label de instrução
        lbl_instr = ttk.Label(
            self, text="Clique no botão ou na caixa abaixo para escolher uma imagem"
        )
        lbl_instr.pack(pady=(10, 5))

        # Label que vai mostrar o preview da imagem (ou o texto "Clique aqui")
        self.lbl_preview = ttk.Label(
            self,
            text="Clique aqui para carregar imagem",
            relief="solid",
            borderwidth=1,
            width=40,
            anchor="center",
            padding=20,
        )
        self.lbl_preview.pack(pady=(0, 10), fill="both", expand=True)

        # Faz com que clicar no próprio label dispare o diálogo
        self.lbl_preview.bind("<Button-1>", lambda e: self.load_image())

        # Botão “Carregar Imagem”
        btn_upload = ttk.Button(self, text="Carregar Imagem", command=self.load_image)
        btn_upload.pack(pady=(0, 20))

    def load_image(self):
        """
        Abre o diálogo para seleção de arquivo. Depois, carrega a imagem e exibe o preview.
        """
        # Mostra mensagem no terminal para confirmar que o método foi acionado
        print("Tentando abrir diálogo de upload…")

        path = filedialog.askopenfilename(
            title="Selecione uma imagem",
            initialdir=".",  # começa no diretório atual
            filetypes=[("Arquivos de imagem", "*.png *.jpg *.jpeg *.webp")],
        )
        if not path:
            return

        try:
            # Abre a imagem com PIL
            pil_img = Image.open(path).convert("RGBA")
        except Exception as e:
            messagebox.showerror("Erro", f"Não foi possível abrir a imagem:\n{e}")
            return

        # Redimensiona para caber no label (largura máxima = 400 px, mantendo proporção)
        max_w = 400
        w, h = pil_img.size
        ratio = min(max_w / w, 1)
        new_size = (int(w * ratio), int(h * ratio))

        # Usa Image.LANCZOS (substituto de ANTIALIAS em versões recentes do Pillow)
        pil_resized = pil_img.resize(new_size, Image.LANCZOS)

        # Converte para PhotoImage e exibe
        self.photo_ref = ImageTk.PhotoImage(pil_resized)
        self.lbl_preview.configure(image=self.photo_ref, text="")  # esconde o texto

        # Opcional: mostrar path no título da janela para confirmar
        self.title(f"Imagem carregada: {os.path.basename(path)}")


if __name__ == "__main__":
    import os  # necessário para colocar basename no título
    app = UploadPreviewTest()
    app.mainloop()
