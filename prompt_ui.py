import json
import os
import threading
import tkinter as tk
import traceback
from tkinter import filedialog, messagebox, simpledialog, ttk

# Tenta importar do prompt_logic, se falhar cria mocks para não quebrar a UI
try:
    from prompt_logic import (
        SUGESTAO_EXPRESSAO,
        OPCOES_ILUMINACAO,
        OPCOES_TEMPO,
        TIPOS_CAMERA,
        PLATFORMS_BY_MEDIA,
        build_full_prompt,
        traduzir_texto_longo,
    )
except ImportError:
    SUGESTAO_EXPRESSAO = {}
    OPCOES_ILUMINACAO = []
    OPCOES_TEMPO = []
    TIPOS_CAMERA = []
    PLATFORMS_BY_MEDIA = {"Imagem": ["Stable Diffusion"], "Vídeo": ["Runway"]}

    def build_full_prompt(data):
        return "Prompt PT Mock", "Prompt EN Mock", None, {"score": None, "warnings": []}

    def traduzir_texto_longo(texto: str) -> str:
        return texto


# ---- Constantes de arquivos ----
HISTORICO_PATH = "historico_prompts.json"
PROFILES_PATH = "profiles.json"
ADVANCED_INSTRUCTIONS_PRESETS_PATH = "advanced_instructions_presets.json"

# Opções para “Movimento de Câmera” (vídeo)
CAMERA_MOVEMENTS = ["Pan", "Tilt", "Zoom", "Dolly", "Track", "Nenhum"]

# Opções para “Cores Predominantes”
OPCOES_CORES = [
    "Quente (warm tones)",
    "Frio (cool tones)",
    "Pastel (pastel palette)",
    "Monocromático (monochromatic)",
    "Vibrante (vibrant colors)",
    "Neutro (neutral palette)",
    "",
]

# Ângulos e POV
ANGULOS_POV = [
    "Nível dos Olhos",
    "Vista Lateral",
    "Vista Frontal",
    "Vista Traseira",
    "Vista Superior",
    "Vista Inferior",
    "Sobre o Ombro",
    "Ponto de Vista (POV)",
    "Selfie",
    "Close",
    "Close Extremo",
    "Grande Angular",
    "Plano Médio",
    "Plano Longo",
    "Vista Aérea",
    "",
]

ANGULOS_CENA = [
    "Nenhum",
    "Ângulo Alto",
    "Ângulo Baixo",
    "Vista de Pássaro",
    "Vista de Minhoca",
    "Ângulo Holandês",
    "Ângulo Inclinado",
]

SAMPLERS_SD = [
    "Euler a",
    "Euler",
    "LMS",
    "DPM++ 2M Karras",
    "DPM++ SDE Karras",
    "DDIM",
    "Heun",
    "DPM2 a Karras",
]

# Sugestões para personagem
SUGESTOES_GENERO = ["Masculino", "Feminino", "Não-binário", ""]
SUGESTOES_IDADE = ["Criança", "Adolescente", "Jovem Adulto", "Adulto", "Idoso", ""]
SUGESTOES_CABELO = [
    "Liso",
    "Cacheado",
    "Ondulado",
    "Curto",
    "Longo",
    "Preto",
    "Loiro",
    "Castanho",
    "Ruivo",
    "Colorido",
    "Careca",
    "",
]
SUGESTOES_ROUPA = ["Casual", "Esportivo", "Formal", "Vintage", "Futurista", "Fantasia", "Uniforme", ""]
SUGESTOES_ACESSORIOS = [
    "Óculos",
    "Chapéu",
    "Joias",
    "Bolsa",
    "Mochila",
    "Fone de ouvido",
    "Cachecol",
    "Luvas",
    "Relógio",
    "",
]

# Modos
DA_MODES = ["DA PRO (Publicidade)", "Social (Digital / Social Media)"]

MODE_CONFIG = {
    "DA PRO (Publicidade)": {
        "show_advanced": True,
        "prompt_editable": True,
        "show_sampler": True,
        "show_negative": True,
        "show_camera_advanced": True,
        "max_characters": 5,
        "prefer_reference": False,
        "default_media_type": None,
    },
    "Social (Digital / Social Media)": {
        "show_advanced": False,
        "prompt_editable": False,
        "show_sampler": False,
        "show_negative": False,
        "show_camera_advanced": False,
        "max_characters": 2,
        "prefer_reference": True,
        "default_media_type": "Imagem",
    },
}


class PromptGeneratorApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Gerador de Prompts (IAgência)")
        self.root.geometry("1000x850")
        self.root.minsize(900, 800)

        # Scroll + Canvas
        self.canvas = tk.Canvas(self.root)
        self.vscroll = ttk.Scrollbar(self.root, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=self.vscroll.set)

        self.canvas.grid(row=0, column=0, sticky="nsew")
        self.vscroll.grid(row=0, column=1, sticky="ns")

        self.scrollable_frame = ttk.Frame(self.canvas)
        self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor="nw")
        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")),
        )

        self.root.grid_rowconfigure(0, weight=1)
        self.root.grid_columnconfigure(0, weight=1)

        self.canvas.bind_all("<MouseWheel>", self._on_mousewheel)
        self.canvas.bind_all("<Button-4>", self._on_mousewheel)
        self.canvas.bind_all("<Button-5>", self._on_mousewheel)

        # Persistência
        self.historico_prompts = []
        self.profiles = {}
        self.advanced_instructions_presets = []
        self._load_historico()
        self._load_profiles()
        self._load_advanced_instructions_presets()

        # Estado/UI
        self.campos = {}
        self.character_fields = []
        self.fix_vars = {}

        self.profile_var = tk.StringVar()
        self.tokens_var = tk.StringVar()
        self.quality_var = tk.StringVar(value="")

        self.reference_path = ""
        self.no_character_var = tk.BooleanVar()
        self.is_product_prompt_var = tk.BooleanVar()

        self.last_prompt_en = ""
        self.last_prompt_pt = ""

        # Modo DA
        self.da_mode_var = tk.StringVar(value=DA_MODES[0])

        # Campos principais
        self.labels_entries_main = [
            ("Tipo de Mídia", "media_type", ["Imagem", "Vídeo"]),
            ("Plataforma", "platform", []),
            ("Cenário", "scene", None),
            ("Hora do Dia", "time", OPCOES_TEMPO),
            ("Iluminação", "lighting", OPCOES_ILUMINACAO),
            ("Cores Predominantes", "colors", OPCOES_CORES),
            ("Câmera/Lente", "camera", ["Nenhuma"] + TIPOS_CAMERA),
            ("Ponto de Vista", "pov_angle", ANGULOS_POV),
            ("Ângulo da Cena", "scene_angle", ANGULOS_CENA),
            ("Formato", "format", ["16:9", "9:16", "1:1", "4:5", "21:9", ""]),
        ]

        self.labels_character_fields = [
            ("Gênero", "gender", SUGESTOES_GENERO),
            ("Idade", "age", SUGESTOES_IDADE),
            ("Cabelo", "hair", SUGESTOES_CABELO),
            ("Roupa", "clothing", SUGESTOES_ROUPA),
            ("Acessórios", "accessories", SUGESTOES_ACESSORIOS),
            ("Expressão Facial", "expression", list(SUGESTAO_EXPRESSAO.keys())),
        ]

        self.labels_camera_movement = ("Mov. de Câmera (vídeo)", "camera_movement", CAMERA_MOVEMENTS)

        self.sampler_var = tk.StringVar()
        self.weight_var = tk.DoubleVar(value=1.0)

        self._create_widgets()

    # -----------------------------
    # Core: gerar
    # -----------------------------
    def gerar(self):
        try:
            media = self.campos["media_type"]["var"].get().strip()
            plataforma = self.campos["platform"]["var"].get().strip()

            if not media or not plataforma:
                messagebox.showwarning(
                    "Campos Obrigatórios",
                    "Por favor, preencha o Tipo de Mídia e a Plataforma.",
                )
                return

            self._set_processing_ui()

            thread = threading.Thread(target=self._gerar_em_thread, daemon=True)
            thread.start()

        except Exception as e:
            self._finish_with_error(f"Erro no botão Gerar: {e}\n\n{traceback.format_exc()}")

    def _set_processing_ui(self):
        self.prompt_text_widget.config(state="normal")
        self.prompt_text_widget.delete("1.0", "end")
        self.prompt_text_widget.insert("1.0", "Processando... por favor, aguarde.")

        self.tokens_var.set("")
        self.quality_var.set("")
        self.last_prompt_en = ""
        self.last_prompt_pt = ""

        self._disable_buttons()

        try:
            self.progress.grid(row=9, column=0, columnspan=3, pady=5, sticky="ew")
            self.progress.start(10)
        except Exception:
            pass

    def _gerar_em_thread(self):
        try:
            data = self._collect_raw_inputs()

            # build_full_prompt retorna: (prompt_pt, prompt_en, err, diag)
            prompt_pt, prompt_en, err, diag = build_full_prompt(data)

            if err:
                raise Exception(err)

            self.last_prompt_pt = prompt_pt or ""
            self.last_prompt_en = prompt_en or ""

            token_count = len((self.last_prompt_en or "").split())
            tokens_text = f"Estimativa de tokens (EN): {token_count}"

            diag_local = diag if isinstance(diag, dict) else {}

            self.root.after(
                0,
                lambda: self._update_result(
                    prompt_text_pt=self.last_prompt_pt,
                    tokens_text=tokens_text,
                    diagnostics=diag_local,
                ),
            )

        except Exception as e:
            msg = f"Erro: {e}\n\nTRACEBACK:\n{traceback.format_exc()}"
            self.root.after(0, lambda m=msg: self._finish_with_error(m))

    def _collect_raw_inputs(self) -> dict:
        data = {
            "media_type": self.campos["media_type"]["var"].get().strip(),
            "platform": self.campos["platform"]["var"].get().strip(),
            "reference_path": self.reference_path or "",
            "scene_raw": self.campos["scene"]["var"].get().strip(),
            "time": self.campos["time"]["var"].get().strip(),
            "lighting": self.campos["lighting"]["var"].get().strip(),
            "colors_raw": self.campos["colors"]["var"].get().strip(),
            "camera": self.campos["camera"]["var"].get().strip(),
            "pov_angle": self.campos["pov_angle"]["var"].get().strip(),
            "scene_angle": self.campos["scene_angle"]["var"].get().strip(),
            "format": self.campos["format"]["var"].get().strip(),
            "overlay_raw": self.overlay_text_widget.get("1.0", "end").strip(),
            "locucao_raw": self.locucao_text_widget.get("1.0", "end").strip(),
            "general_idea_raw": self.general_idea_widget.get("1.0", "end").strip(),
            "additional_instructions_raw": self.additional_instructions_widget.get("1.0", "end").strip(),
            "is_product_prompt": bool(self.is_product_prompt_var.get()),
            "negative_prompt": self.negative_text_widget.get("1.0", "end").strip(),
            "sampler": self.sampler_var.get().strip(),
            "peso_personagem": float(self.weight_var.get()) if self.weight_var.get() else None,
            "all_characters_raw": [],
            "no_character_var": bool(self.no_character_var.get()),
        }

        if not data["no_character_var"]:
            for char_block_dict in self.character_fields:
                char_data = {}
                for _, key, _ in self.labels_character_fields:
                    char_data[key] = char_block_dict[key]["var"].get().strip()
                data["all_characters_raw"].append(char_data)

        if data["media_type"] == "Vídeo":
            data["camera_movement"] = self.campos["camera_movement"]["var"].get().strip()
        else:
            data["camera_movement"] = ""

        return data

    # -----------------------------
    # Copiar / salvar (sempre EN)
    # -----------------------------
    def _get_prompt_en_from_editor(self) -> str:
        if not hasattr(self, "prompt_text_widget"):
            return ""

        editor_text = self.prompt_text_widget.get("1.0", "end").strip()
        if not editor_text:
            return ""

        if self.last_prompt_en:
            mode = self.da_mode_var.get().strip()
            cfg = MODE_CONFIG.get(mode, MODE_CONFIG[DA_MODES[0]])

            if not cfg["prompt_editable"]:
                return self.last_prompt_en

            if self.last_prompt_pt and editor_text == self.last_prompt_pt:
                return self.last_prompt_en

            return traduzir_texto_longo(editor_text)

        return traduzir_texto_longo(editor_text)

    def copiar(self):
        prompt_en = self._get_prompt_en_from_editor()
        if not prompt_en:
            messagebox.showinfo("Copiar", "Nenhum prompt para copiar. Gere primeiro.")
            return
        try:
            self.root.clipboard_clear()
            self.root.clipboard_append(prompt_en)
            messagebox.showinfo("Copiado", "Prompt (EN) copiado para a área de transferência.")
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao copiar: {e}")

    def salvar_prompt(self):
        prompt_en = self._get_prompt_en_from_editor()
        if not prompt_en:
            messagebox.showinfo("Salvar", "Nenhum prompt para salvar. Gere primeiro.")
            return

        caminho = filedialog.asksaveasfilename(
            defaultextension=".txt",
            filetypes=[("Arquivos de texto", "*.txt"), ("Todos os arquivos", "*.*")],
            title="Salvar prompt (EN) como...",
        )
        if not caminho:
            return

        try:
            prompt_pt = self.prompt_text_widget.get("1.0", "end").strip()
            with open(caminho, "w", encoding="utf-8") as f:
                f.write("=== PROMPT (PT - Visualização) ===\n")
                f.write(prompt_pt + "\n\n")
                f.write("=== PROMPT (EN - Envio) ===\n")
                f.write(prompt_en)
            messagebox.showinfo("Salvo", f"Prompt salvo em:\n{caminho}")
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao salvar: {e}")

    def mostrar_prompt_en(self):
        prompt_en = (self.last_prompt_en or "").strip()
        if not prompt_en:
            messagebox.showwarning(
                "Prompt EN vazio",
                "Ainda não há Prompt EN gerado. Clique em 'Gerar Prompt' primeiro.",
            )
            return

        win = tk.Toplevel(self.root)
        win.title("Prompt (EN) – Envio")
        win.geometry("900x520")

        txt = tk.Text(win, wrap="word")
        txt.pack(fill="both", expand=True, padx=10, pady=10)

        scroll = ttk.Scrollbar(win, orient="vertical", command=txt.yview)
        scroll.pack(side="right", fill="y")
        txt.configure(yscrollcommand=scroll.set)

        txt.insert("1.0", prompt_en)
        txt.focus_set()

        btns = ttk.Frame(win)
        btns.pack(fill="x", padx=10, pady=(0, 10))

        def _copy():
            try:
                self.root.clipboard_clear()
                self.root.clipboard_append(prompt_en)
                messagebox.showinfo("Copiado", "Prompt (EN) copiado para a área de transferência.")
            except Exception as e:
                messagebox.showerror("Erro", f"Erro ao copiar: {e}")

        ttk.Button(btns, text="Copiar", command=_copy).pack(side="left")
        ttk.Button(btns, text="Fechar", command=win.destroy).pack(side="right")

    # -----------------------------
    # UI helpers
    # -----------------------------
    def _disable_buttons(self):
        for name in ("botao_gerar", "copiar_btn", "salvar_btn", "historico_btn", "botao_limpar"):
            if hasattr(self, name):
                try:
                    getattr(self, name).config(state="disabled")
                except Exception:
                    pass

    def _enable_buttons(self):
        for name in ("botao_gerar", "copiar_btn", "salvar_btn", "historico_btn", "botao_limpar"):
            if hasattr(self, name):
                try:
                    getattr(self, name).config(state="normal")
                except Exception:
                    pass

    def _set_quality(self, diagnostics: dict):
        score = diagnostics.get("score", None)
        warnings = diagnostics.get("warnings", []) or []

        if score is None:
            self.quality_var.set("")
            return

        if warnings:
            self.quality_var.set(f"Qualidade: {score}/100 | Avisos: {len(warnings)}")
        else:
            self.quality_var.set(f"Qualidade: {score}/100 | OK")

    def _update_result(self, prompt_text_pt: str, tokens_text: str, diagnostics: dict):
        try:
            self.progress.stop()
            self.progress.grid_remove()
        except Exception:
            pass

        self.prompt_text_widget.config(state="normal")
        self.prompt_text_widget.delete("1.0", "end")
        self.prompt_text_widget.insert("1.0", prompt_text_pt)

        self.tokens_var.set(tokens_text)
        self._set_quality(diagnostics)

        self._enable_buttons()

        try:
            self._apply_mode()
        except Exception:
            pass

        # salva no histórico
        try:
            self.historico_prompts.append(
                {
                    "prompt_pt": self.last_prompt_pt,
                    "prompt_en": self.last_prompt_en,
                    "media_type": self.campos["media_type"]["var"].get().strip(),
                    "plataforma": self.campos["platform"]["var"].get().strip(),
                    "diagnostics": diagnostics or {},
                }
            )
            self._save_historico()
        except Exception:
            pass

    def _finish_with_error(self, msg: str):
        try:
            self.progress.stop()
            self.progress.grid_remove()
        except Exception:
            pass

        self.prompt_text_widget.config(state="normal")
        self.prompt_text_widget.delete("1.0", "end")
        self.prompt_text_widget.insert("1.0", msg)

        self.tokens_var.set("")
        self.quality_var.set("")

        self._enable_buttons()

        try:
            self._apply_mode()
        except Exception:
            pass

    # -----------------------------
    # Scroll
    # -----------------------------
    def _on_mousewheel(self, event):
        delta = getattr(event, "delta", 0)

        if delta:
            passos = int(delta / 120) if abs(delta) >= 120 else (1 if delta > 0 else -1)
            self.canvas.yview_scroll(-passos, "units")
            return

        num = getattr(event, "num", None)
        if num == 4:
            self.canvas.yview_scroll(-1, "units")
        elif num == 5:
            self.canvas.yview_scroll(1, "units")

    # -----------------------------
    # Modo / regras
    # -----------------------------
    def _apply_mode(self):
        if not hasattr(self, "advanced_frame"):
            return

        mode = self.da_mode_var.get().strip()
        cfg = MODE_CONFIG.get(mode, MODE_CONFIG[DA_MODES[0]])

        if cfg["show_advanced"]:
            self.advanced_frame.grid()
        else:
            self.advanced_frame.grid_remove()

        if cfg["show_negative"]:
            self.negative_text_widget.config(state="normal")
        else:
            self.negative_text_widget.config(state="disabled")
            self.negative_text_widget.delete("1.0", "end")

        self._update_sampler_state(
            self.campos["media_type"]["var"].get(),
            self.campos["platform"]["var"].get(),
        )

        self._apply_camera_advanced(cfg["show_camera_advanced"])
        self._apply_character_limits(cfg["max_characters"])
        self._apply_prompt_editable(cfg["prompt_editable"])

        if cfg["default_media_type"]:
            self.campos["media_type"]["var"].set(cfg["default_media_type"])

        if cfg["prefer_reference"]:
            self.reference_frame.configure(text="Passo 2: Imagem de Referência (Recomendado)")
        else:
            self.reference_frame.configure(text="Passo 2: Imagem de Referência (Opcional)")

        self._toggle_character_fields()
        self._on_media_type_change()

    def _apply_prompt_editable(self, editable: bool):
        self.prompt_text_widget.config(state="normal")
        self.prompt_text_widget.unbind("<Key>")

        if editable:
            self.prompt_text_widget.config(background="white")
        else:
            self.prompt_text_widget.bind("<Key>", lambda e: "break")
            self.prompt_text_widget.config(background="lightgray")

    def _apply_camera_advanced(self, show_advanced: bool):
        for key in ("camera", "pov_angle", "scene_angle"):
            if key not in self.campos:
                continue
            widget = self.campos[key]["widget"]
            if show_advanced:
                widget.config(state="readonly")
            else:
                widget.config(state="disabled")
                self.campos[key]["var"].set("")

    def _apply_character_limits(self, max_chars: int):
        while len(self.character_fields) > max_chars:
            self._remove_character_block()

        if len(self.character_fields) >= max_chars:
            self.add_char_btn.config(state="disabled")
        else:
            if not self.no_character_var.get():
                self.add_char_btn.config(state="normal")

    # -----------------------------
    # Media/platform
    # -----------------------------
    def _refresh_platform_options(self):
        media = self.campos["media_type"]["var"].get().strip()
        options = PLATFORMS_BY_MEDIA.get(media, [])

        self.platform_combobox["values"] = options

        current = self.campos["platform"]["var"].get().strip()
        if current not in options:
            self.campos["platform"]["var"].set(options[0] if options else "")

    def _on_media_type_change(self, *_args):
        self._refresh_platform_options()
        media = self.campos["media_type"]["var"].get()
        platform = self.campos["platform"]["var"].get()
        self._update_sampler_state(media, platform)

    def _on_platform_change(self, *_args):
        media = self.campos["media_type"]["var"].get()
        platform = self.campos["platform"]["var"].get()
        self._update_sampler_state(media, platform)

    def _update_sampler_state(self, media_type, platform):
        mode = self.da_mode_var.get().strip()
        cfg = MODE_CONFIG.get(mode, MODE_CONFIG[DA_MODES[0]])

        if cfg["show_sampler"] and platform == "Stable Diffusion" and media_type == "Imagem":
            self.sampler_combobox.config(state="readonly")
        else:
            self.sampler_combobox.config(state="disabled")
            self.sampler_var.set("")

    # -----------------------------
    # Personagens
    # -----------------------------
    def _toggle_character_fields(self):
        state = "disabled" if self.no_character_var.get() else "normal"

        for char_block_dict in self.character_fields:
            for _, key, _ in self.labels_character_fields:
                if (
                    self.character_fields.index(char_block_dict) == 0
                    and key in self.fix_vars
                    and self.fix_vars[key].get()
                ):
                    continue
                char_block_dict[key]["widget"].config(state=state)

        self.add_char_btn.config(state=state)

        if hasattr(self, "remove_char_btn"):
            self.remove_char_btn.config(state=state)

        self.weight_entry.config(state=state)

    def _add_character_block(self):
        char_idx = len(self.character_fields)

        char_frame = ttk.LabelFrame(self.character_container, text=f"Personagem {char_idx + 1}", padding=10)
        char_frame.pack(fill="x", padx=5, pady=5)
        char_frame.grid_columnconfigure(1, weight=1)

        char_data_dict = {}

        for idx, (label_text, key, options) in enumerate(self.labels_character_fields):
            ttk.Label(char_frame, text=label_text).grid(row=idx, column=0, sticky="w", pady=2)
            var = tk.StringVar()

            widget = ttk.Combobox(char_frame, textvariable=var, values=options, state="normal")
            widget.set("")
            widget.grid(row=idx, column=1, sticky="ew", pady=2)

            char_data_dict[key] = {"var": var, "widget": widget}

            if char_idx == 0 and key in ("gender", "age", "hair", "clothing", "accessories"):
                fix_var = tk.BooleanVar(value=False)
                chk = ttk.Checkbutton(char_frame, text="Fixar", variable=fix_var)
                chk.grid(row=idx, column=2, padx=5)
                self.fix_vars[key] = fix_var

        self.character_fields.append(char_data_dict)

        if len(self.character_fields) > 1 and not hasattr(self, "remove_char_btn"):
            self.remove_char_btn = ttk.Button(
                self.characters_section_frame,
                text="Remover Último Personagem",
                command=self._remove_character_block,
            )
            self.remove_char_btn.pack(pady=5)

        self._toggle_character_fields()
        self._apply_mode()

    def _remove_character_block(self):
        if len(self.character_fields) > 1:
            self.character_fields.pop()
            self.character_container.winfo_children()[-1].destroy()

        if len(self.character_fields) == 1 and hasattr(self, "remove_char_btn"):
            self.remove_char_btn.destroy()
            del self.remove_char_btn

        self._apply_mode()

    # -----------------------------
    # Referência
    # -----------------------------
    def _load_reference_image(self):
        try:
            filetypes = [
                ("Imagens", ("*.png", "*.jpg", "*.jpeg", "*.bmp", "*.gif")),
                ("Todos os arquivos", "*.*"),
            ]
            caminho = filedialog.askopenfilename(title="Selecione a imagem de referência", filetypes=filetypes)
            if not caminho:
                self.reference_path = ""
                self.ref_filename_label.config(text="")
                return

            self.reference_path = caminho.replace("\\", "/")
            self.ref_filename_label.config(text=os.path.basename(caminho))

        except Exception as e:
            messagebox.showerror("Erro ao carregar imagem", f"Ocorreu um erro:\n{e}")
            self.reference_path = ""
            self.ref_filename_label.config(text="")

    # -----------------------------
    # UI Layout
    # -----------------------------
    def _create_widgets(self):
        style = ttk.Style()
        style.configure("TLabel", font=("Segoe UI", 10))
        style.configure("TButton", font=("Segoe UI", 10), padding=5)
        style.configure("TLabelFrame", font=("Segoe UI", 11, "bold"))
        style.configure("TCombobox", padding=3)

        self.main_frame = self.scrollable_frame
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_columnconfigure(1, weight=3)

        # 0) Modo
        self.mode_frame = ttk.LabelFrame(self.main_frame, text="Modo de Trabalho (DA)", padding=10)
        self.mode_frame.grid(row=0, column=0, columnspan=3, sticky="ew", padx=5, pady=5)
        self.mode_frame.grid_columnconfigure(1, weight=1)

        ttk.Label(self.mode_frame, text="Modo:").grid(row=0, column=0, sticky="w")
        mode_combo = ttk.Combobox(
            self.mode_frame,
            textvariable=self.da_mode_var,
            values=DA_MODES,
            state="readonly",
        )
        mode_combo.grid(row=0, column=1, sticky="ew", padx=5)
        mode_combo.bind("<<ComboboxSelected>>", lambda _e: self._apply_mode())

        # 1) Perfis
        profile_frame = ttk.LabelFrame(self.main_frame, text="Perfis de Personagem (Opcional)", padding=10)
        profile_frame.grid(row=1, column=0, columnspan=3, sticky="ew", padx=5, pady=5)
        profile_frame.grid_columnconfigure(1, weight=1)

        ttk.Label(profile_frame, text="Perfil:").grid(row=0, column=0, sticky="w")
        self.profile_combobox = ttk.Combobox(
            profile_frame,
            textvariable=self.profile_var,
            values=list(self.profiles.keys()),
            state="normal",
        )
        self.profile_combobox.set("")
        self.profile_combobox.grid(row=0, column=1, sticky="ew", padx=2)
        self.profile_combobox.bind("<<ComboboxSelected>>", self._on_profile_selected)

        self.save_profile_btn = ttk.Button(profile_frame, text="Salvar 1º Perfil Atual", command=self._save_profile)
        self.save_profile_btn.grid(row=0, column=2, sticky="ew", padx=2)

        # 2) Campos gerais
        self.general_fields_frame = ttk.LabelFrame(
            self.main_frame,
            text="Passo 1: Detalhes da Cena e da Câmera",
            padding=10,
        )
        self.general_fields_frame.grid(row=2, column=0, columnspan=3, sticky="nsew", padx=5, pady=5)
        self.general_fields_frame.grid_columnconfigure(1, weight=1)

        for idx, (label_text, key, options) in enumerate(self.labels_entries_main):
            ttk.Label(self.general_fields_frame, text=label_text).grid(row=idx, column=0, sticky="w", pady=2)
            var = tk.StringVar()

            if options is None:
                widget = ttk.Entry(self.general_fields_frame, textvariable=var)
            else:
                widget = ttk.Combobox(
                    self.general_fields_frame,
                    textvariable=var,
                    values=options,
                    state="readonly",
                )
                widget.set("" if "" in options else (options[0] if options else ""))

            widget.grid(row=idx, column=1, sticky="ew", pady=2)
            self.campos[key] = {"var": var, "widget": widget}

            if key == "media_type":
                var.trace_add("write", self._on_media_type_change)
            if key == "platform":
                var.trace_add("write", self._on_platform_change)

            if key == "platform":
                self.platform_combobox = widget

        # Movimento de câmera
        idx_cam = len(self.labels_entries_main)
        label_text, key, options = self.labels_camera_movement
        ttk.Label(self.general_fields_frame, text=label_text).grid(row=idx_cam, column=0, sticky="w", pady=2)

        var_cam = tk.StringVar()
        widget_cam = ttk.Combobox(
            self.general_fields_frame,
            textvariable=var_cam,
            values=options,
            state="disabled",
        )
        widget_cam.set(options[0])
        widget_cam.grid(row=idx_cam, column=1, sticky="ew", pady=2)
        self.campos[key] = {"var": var_cam, "widget": widget_cam}

        ttk.Checkbutton(
            self.general_fields_frame,
            text="É um Prompt de Produto?",
            variable=self.is_product_prompt_var,
        ).grid(row=idx_cam + 1, column=0, sticky="w", pady=5)

        ttk.Checkbutton(
            self.general_fields_frame,
            text="Cena sem personagem (ignora campos de personagem)",
            variable=self.no_character_var,
            command=self._toggle_character_fields,
        ).grid(row=idx_cam + 2, column=0, columnspan=2, sticky="w", pady=5)

        # 2.5) Personagens
        self.characters_section_frame = ttk.LabelFrame(
            self.main_frame,
            text="Passo 1.5: Personagens (Adicionar Múltiplos)",
            padding=10,
        )
        self.characters_section_frame.grid(row=3, column=0, columnspan=3, sticky="nsew", padx=5, pady=5)
        self.characters_section_frame.grid_columnconfigure(0, weight=1)

        self.character_container = ttk.Frame(self.characters_section_frame)
        self.character_container.pack(fill="both", expand=True)

        self.add_char_btn = ttk.Button(
            self.characters_section_frame,
            text="Adicionar Personagem",
            command=self._add_character_block,
        )
        self.add_char_btn.pack(pady=5)

        self._add_character_block()

        # 3) Referência
        self.reference_frame = ttk.LabelFrame(self.main_frame, text="Passo 2: Imagem de Referência (Opcional)", padding=10)
        self.reference_frame.grid(row=4, column=0, columnspan=3, sticky="nsew", padx=5, pady=5)
        self.reference_frame.grid_columnconfigure(1, weight=1)

        ttk.Label(self.reference_frame, text="Imagem de Referência:").grid(row=0, column=0, sticky="w")
        self.ref_filename_label = ttk.Label(self.reference_frame, text="", foreground="gray")
        self.ref_filename_label.grid(row=0, column=1, sticky="w")

        self.load_ref_btn = ttk.Button(self.reference_frame, text="Carregar Imagem", command=self._load_reference_image)
        self.load_ref_btn.grid(row=0, column=2, sticky="ew", padx=5)

        # 4) Texto / instruções
        self.extras_frame = ttk.LabelFrame(self.main_frame, text="Passo 3: Texto / Instruções", padding=10)
        self.extras_frame.grid(row=5, column=0, columnspan=3, sticky="nsew", padx=5, pady=5)
        self.extras_frame.grid_columnconfigure(1, weight=1)

        ttk.Label(self.extras_frame, text="Ideia Geral (visão da cena/imagem)").grid(row=0, column=0, sticky="nw", pady=2)
        self.general_idea_widget = tk.Text(self.extras_frame, wrap="word", height=4)
        self.general_idea_widget.grid(row=0, column=1, columnspan=2, sticky="nsew", pady=2)
        general_idea_scroll = ttk.Scrollbar(self.extras_frame, orient="vertical", command=self.general_idea_widget.yview)
        general_idea_scroll.grid(row=0, column=3, sticky="ns", pady=2)
        self.general_idea_widget.config(yscrollcommand=general_idea_scroll.set)

        ttk.Label(
            self.extras_frame,
            text="Presets de Instruções Avançadas (Ctrl/Cmd + Clique para múltiplos):",
        ).grid(row=1, column=0, sticky="nw", pady=2)

        listbox_frame = ttk.Frame(self.extras_frame)
        listbox_frame.grid(row=1, column=1, columnspan=2, sticky="nsew", padx=2, pady=2)
        listbox_frame.grid_columnconfigure(0, weight=1)

        self.preset_listbox = tk.Listbox(listbox_frame, selectmode=tk.EXTENDED, height=6, font=("Segoe UI", 10))
        for p in self.advanced_instructions_presets:
            self.preset_listbox.insert(tk.END, p.get("name", ""))
        self.preset_listbox.pack(side="left", fill="both", expand=True)

        listbox_scroll = ttk.Scrollbar(listbox_frame, orient="vertical", command=self.preset_listbox.yview)
        listbox_scroll.pack(side="right", fill="y")
        self.preset_listbox.config(yscrollcommand=listbox_scroll.set)

        self.apply_preset_btn = ttk.Button(self.extras_frame, text="Aplicar Seleções de Preset", command=self._apply_selected_presets)
        self.apply_preset_btn.grid(row=1, column=3, sticky="n", padx=5, pady=2)

        ttk.Label(self.extras_frame, text="Instruções Adicionais Geradas/Editáveis:").grid(row=2, column=0, sticky="nw", pady=2)
        self.additional_instructions_widget = tk.Text(self.extras_frame, wrap="word", height=6)
        self.additional_instructions_widget.grid(row=2, column=1, columnspan=2, sticky="nsew", pady=2)
        add_scroll = ttk.Scrollbar(self.extras_frame, orient="vertical", command=self.additional_instructions_widget.yview)
        add_scroll.grid(row=2, column=3, sticky="ns", pady=2)
        self.additional_instructions_widget.config(yscrollcommand=add_scroll.set)

        ttk.Label(self.extras_frame, text="Texto na Imagem").grid(row=3, column=0, sticky="nw", pady=2)
        self.overlay_text_widget = tk.Text(self.extras_frame, wrap="word", height=3)
        self.overlay_text_widget.grid(row=3, column=1, sticky="nsew", pady=2)
        overlay_scroll = ttk.Scrollbar(self.extras_frame, orient="vertical", command=self.overlay_text_widget.yview)
        overlay_scroll.grid(row=3, column=2, sticky="ns", pady=2)
        self.overlay_text_widget.config(yscrollcommand=overlay_scroll.set)

        ttk.Label(self.extras_frame, text="Locução").grid(row=4, column=0, sticky="nw", pady=2)
        self.locucao_text_widget = tk.Text(self.extras_frame, wrap="word", height=3)
        self.locucao_text_widget.grid(row=4, column=1, sticky="nsew", pady=2)
        loc_scroll = ttk.Scrollbar(self.extras_frame, orient="vertical", command=self.locucao_text_widget.yview)
        loc_scroll.grid(row=4, column=2, sticky="ns", pady=2)
        self.locucao_text_widget.config(yscrollcommand=loc_scroll.set)

        # 5) Avançado
        self.advanced_frame = ttk.LabelFrame(self.main_frame, text="Passo 4: Parâmetros Avançados", padding=10)
        self.advanced_frame.grid(row=6, column=0, columnspan=3, sticky="nsew", padx=5, pady=5)
        self.advanced_frame.grid_columnconfigure(1, weight=1)

        ttk.Label(self.advanced_frame, text="Negative Prompt").grid(row=0, column=0, sticky="nw", pady=2)
        self.negative_text_widget = tk.Text(self.advanced_frame, wrap="word", height=2)
        self.negative_text_widget.grid(row=0, column=1, sticky="ew", pady=2)
        neg_scroll = ttk.Scrollbar(self.advanced_frame, orient="vertical", command=self.negative_text_widget.yview)
        neg_scroll.grid(row=0, column=2, sticky="ns", pady=2)
        self.negative_text_widget.config(yscrollcommand=neg_scroll.set)

        ttk.Label(self.advanced_frame, text="Sampler (Stable Diffusion)").grid(row=1, column=0, sticky="w", pady=2)
        self.sampler_combobox = ttk.Combobox(
            self.advanced_frame,
            textvariable=self.sampler_var,
            values=SAMPLERS_SD,
            state="disabled",
        )
        self.sampler_combobox.set("")
        self.sampler_combobox.grid(row=1, column=1, sticky="ew", pady=2)

        ttk.Label(self.advanced_frame, text="Peso do Personagem (ex.: 1.0)").grid(row=2, column=0, sticky="w", pady=2)
        self.weight_entry = ttk.Entry(self.advanced_frame, textvariable=self.weight_var)
        self.weight_entry.grid(row=2, column=1, sticky="w", pady=2)

        # 6) Resultado
        self.result_frame = ttk.LabelFrame(self.main_frame, text="Passo 5: Prompt (PT) + Tokens (EN)", padding=10)
        self.result_frame.grid(row=7, column=0, columnspan=3, sticky="nsew", padx=5, pady=5)
        self.result_frame.grid_columnconfigure(0, weight=1)
        self.result_frame.grid_rowconfigure(0, weight=1)

        self.prompt_text_widget = tk.Text(self.result_frame, wrap="word", height=10, background="lightgray")
        self.prompt_text_widget.grid(row=0, column=0, sticky="nsew", pady=2)
        result_scroll = ttk.Scrollbar(self.result_frame, orient="vertical", command=self.prompt_text_widget.yview)
        result_scroll.grid(row=0, column=1, sticky="ns", pady=2)
        self.prompt_text_widget.config(yscrollcommand=result_scroll.set)

        self.tokens_label = ttk.Label(self.result_frame, textvariable=self.tokens_var, foreground="blue")
        self.tokens_label.grid(row=1, column=0, sticky="w", pady=2)

        # 7) Botões
        button_frame = ttk.Frame(self.main_frame, padding=5)
        button_frame.grid(row=8, column=0, columnspan=3, sticky="ew", pady=5)
        for i in range(5):
            button_frame.grid_columnconfigure(i, weight=1)

        self.botao_gerar = ttk.Button(button_frame, text="Gerar Prompt", command=self.gerar)
        self.botao_gerar.grid(row=0, column=0, sticky="ew", padx=2)

        self.copiar_btn = ttk.Button(button_frame, text="Copiar Prompt (EN)", command=self.copiar)
        self.copiar_btn.grid(row=0, column=1, sticky="ew", padx=2)

        self.salvar_btn = ttk.Button(button_frame, text="Salvar Prompt (EN)", command=self.salvar_prompt)
        self.salvar_btn.grid(row=0, column=2, sticky="ew", padx=2)

        self.historico_btn = ttk.Button(button_frame, text="Ver Histórico", command=self._mostrar_historico)
        self.historico_btn.grid(row=0, column=3, sticky="ew", padx=2)

        self.botao_limpar = ttk.Button(button_frame, text="Limpar Campos", command=self.limpar_campos)
        self.botao_limpar.grid(row=0, column=4, sticky="ew", padx=2)

        self.progress = ttk.Progressbar(self.main_frame, mode="indeterminate")

        # Estados iniciais
        self.campos["media_type"]["var"].set("Imagem")
        self._refresh_platform_options()
        self._toggle_character_fields()
        self._on_media_type_change()
        self._apply_mode()

    # -----------------------------
    # Histórico
    # -----------------------------
    def _load_historico(self):
        if os.path.exists(HISTORICO_PATH):
            try:
                with open(HISTORICO_PATH, "r", encoding="utf-8") as f:
                    self.historico_prompts = json.load(f)
            except Exception:
                self.historico_prompts = []
        else:
            self.historico_prompts = []

    def _save_historico(self):
        try:
            with open(HISTORICO_PATH, "w", encoding="utf-8") as f:
                json.dump(self.historico_prompts, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Erro ao salvar histórico: {e}")

    def _mostrar_historico(self):
        hist_window = tk.Toplevel(self.root)
        hist_window.title("Histórico de Prompts")
        hist_window.geometry("800x520")

        listbox = tk.Listbox(hist_window, font=("Segoe UI", 10))
        listbox.grid(row=0, column=0, sticky="nsew", padx=5, pady=5)
        hist_window.rowconfigure(0, weight=1)
        hist_window.columnconfigure(0, weight=1)

        detail_text = tk.Text(hist_window, wrap="word", state="disabled", background="lightgray")
        detail_text.grid(row=1, column=0, sticky="nsew", padx=5, pady=5)
        hist_window.rowconfigure(1, weight=1)

        for idx, registro in enumerate(self.historico_prompts):
            prompt_pt = registro.get("prompt_pt", "")
            breve = prompt_pt[:60] + ("..." if len(prompt_pt) > 60 else "")
            display = f"{idx + 1}. [{registro.get('media_type', '-')}/{registro.get('plataforma', '-')}] {breve}"
            listbox.insert("end", display)

        def on_select(_evt):
            sel = listbox.curselection()
            if not sel:
                return
            i = sel[0]
            prompt_pt = self.historico_prompts[i].get("prompt_pt", "")
            prompt_en = self.historico_prompts[i].get("prompt_en", "")

            detail_text.config(state="normal")
            detail_text.delete("1.0", "end")
            detail_text.insert("1.0", "=== PROMPT (PT - Visualização) ===\n")
            detail_text.insert("end", prompt_pt + "\n\n")
            detail_text.insert("end", "=== PROMPT (EN - Envio) ===\n")
            detail_text.insert("end", prompt_en)
            detail_text.config(state="disabled")

        listbox.bind("<<ListboxSelect>>", on_select)

    # -----------------------------
    # Perfis
    # -----------------------------
    def _load_profiles(self):
        if os.path.exists(PROFILES_PATH):
            try:
                with open(PROFILES_PATH, "r", encoding="utf-8") as f:
                    self.profiles = json.load(f)
            except Exception:
                self.profiles = {}
        else:
            self.profiles = {}

    def _save_profiles(self):
        try:
            with open(PROFILES_PATH, "w", encoding="utf-8") as f:
                json.dump(self.profiles, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Erro ao salvar perfis: {e}")

    def _save_profile(self):
        if not self.character_fields:
            messagebox.showwarning("Erro", "Nenhum personagem para salvar no perfil.")
            return

        perfil_data = {}
        first_char_data = self.character_fields[0]
        for _, key, _ in self.labels_character_fields:
            if key in ("gender", "age", "hair", "clothing", "accessories"):
                perfil_data[key] = first_char_data[key]["var"].get().strip()

        nome = simpledialog.askstring("Salvar Perfil", "Digite um nome para este perfil:", parent=self.root)
        if not nome or not nome.strip():
            return

        nome = nome.strip()
        self.profiles[nome] = perfil_data
        self._save_profiles()
        self.profile_combobox["values"] = list(self.profiles.keys())
        messagebox.showinfo("Perfil salvo", f"Perfil “{nome}” salvo com sucesso.")

    def _on_profile_selected(self, _event):
        nome = self.profile_var.get().strip()
        if not nome or nome not in self.profiles:
            return

        if not self.character_fields:
            self._add_character_block()

        dados = self.profiles[nome]
        first_char_data = self.character_fields[0]

        for key in ("gender", "age", "hair", "clothing", "accessories"):
            if key in first_char_data:
                first_char_data[key]["var"].set(dados.get(key, ""))
                if key in self.fix_vars:
                    self.fix_vars[key].set(True)
                    first_char_data[key]["widget"].config(state="disabled")

        self._toggle_character_fields()

    # -----------------------------
    # Presets avançados
    # -----------------------------
    def _load_advanced_instructions_presets(self):
        if os.path.exists(ADVANCED_INSTRUCTIONS_PRESETS_PATH):
            try:
                with open(ADVANCED_INSTRUCTIONS_PRESETS_PATH, "r", encoding="utf-8") as f:
                    self.advanced_instructions_presets = json.load(f)
            except Exception as e:
                messagebox.showerror("Erro ao carregar presets", f"Ocorreu um erro:\n{e}")
                self.advanced_instructions_presets = []
        else:
            self.advanced_instructions_presets = []

    def _apply_selected_presets(self):
        selected_indices = self.preset_listbox.curselection()
        combined = []

        for i in selected_indices:
            preset_name = self.preset_listbox.get(i)
            for preset in self.advanced_instructions_presets:
                if preset.get("name") == preset_name:
                    combined.append(preset.get("instructions_text", ""))
                    break

        text_to_add = ". ".join([t for t in combined if t.strip()])
        current_text = self.additional_instructions_widget.get("1.0", "end").strip()

        if current_text and text_to_add:
            if not current_text.endswith((".", "!", "?")):
                current_text += "."
            final_text = f"{current_text} {text_to_add}"
        else:
            final_text = current_text or text_to_add

        self.additional_instructions_widget.delete("1.0", "end")
        self.additional_instructions_widget.insert("1.0", final_text)

    # -----------------------------
    # Limpar
    # -----------------------------
    def limpar_campos(self):
        for key, field_info in self.campos.items():
            if key == "platform":
                continue
            field_info["var"].set("")

        self.general_idea_widget.delete("1.0", "end")
        self.additional_instructions_widget.delete("1.0", "end")
        self.preset_listbox.selection_clear(0, tk.END)
        self.overlay_text_widget.delete("1.0", "end")
        self.locucao_text_widget.delete("1.0", "end")

        self.is_product_prompt_var.set(False)

        while len(self.character_fields) > 1:
            self._remove_character_block()

        if self.character_fields:
            first_char_data = self.character_fields[0]
            for _, key, _ in self.labels_character_fields:
                if key in self.fix_vars and self.fix_vars[key].get():
                    continue
                first_char_data[key]["var"].set("")
                first_char_data[key]["widget"].config(state="normal")
                if key in self.fix_vars:
                    self.fix_vars[key].set(False)

        self.no_character_var.set(False)
        self._toggle_character_fields()

        self.reference_path = ""
        self.ref_filename_label.config(text="")

        self.negative_text_widget.delete("1.0", "end")
        self.sampler_var.set("")
        self.weight_var.set(1.0)

        self.prompt_text_widget.delete("1.0", "end")
        self.tokens_var.set("")
        self.quality_var.set("")
        self.last_prompt_en = ""
        self.last_prompt_pt = ""

        self.campos["media_type"]["var"].set("Imagem")
        self._refresh_platform_options()
        self._on_media_type_change()
        self._apply_mode()


if __name__ == "__main__":
    root = tk.Tk()
    app = PromptGeneratorApp(root)
    root.mainloop()
