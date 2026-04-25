#!/usr/bin/env python3
"""
Converte texto em português para respelling ortográfico,
colocando acento na vogal da sílaba tônica de cada palavra.
"""

import re
import sys
from phonemizer import phonemize

# Mapeamento IPA → vogal base
IPA_TO_BASE = {
    'a': 'a', 'ɐ': 'a', 'i': 'i',
    'e': 'e', 'ɛ': 'e', 'o': 'o',
    'ɔ': 'o', 'u': 'u'
}

# Vogal base → forma acentuada
ACCENT = {
    'a': 'á', 'e': 'é',
    'i': 'í', 'o': 'ó',
    'u': 'ú'
}

def respell_word(word: str) -> str:
    """Retorna a palavra com acento na vogal tônica."""
    ipa = phonemize(
        word, language='pt-br', backend='espeak',
        strip=True
    )
    # Lista de vogais IPA encontradas
    vowels_ipa = [ch for ch in ipa if ch in IPA_TO_BASE]
    # Tenta achar o fonema tônico após 'ˈ'
    stressed = None
    if 'ˈ' in ipa:
        after = ipa.split('ˈ', 1)[1]
        for ch in after:
            if ch in IPA_TO_BASE:
                stressed = ch
                break
    # Se não achou stress marker, usa a primeira vogal
    if not stressed and vowels_ipa:
        stressed = vowels_ipa[0]

    # Se não houver vogal, retorna a palavra original
    if not vowels_ipa or not stressed:
        return word

    # Índice da vogal tônica na sequência de vogais IPA
    idx_vowel = vowels_ipa.index(stressed)

    # Posições de todas as vogais na palavra original
    orth_indices = [
        m.start() for m in re.finditer(r'[aeiouAEIOU]', word)
    ]
    # Se o idx for maior que o número de vogais da palavra, aborta
    if idx_vowel >= len(orth_indices):
        return word

    # Substitui a vogal correta por sua forma acentuada
    pos = orth_indices[idx_vowel]
    base = IPA_TO_BASE[stressed]
    accented = ACCENT.get(base, base)
    # Preserva maiúscula, se necessário
    if word[pos].isupper():
        accented = accented.upper()

    return word[:pos] + accented + word[pos+1:]


def respell_text(text: str) -> str:
    """Aplica respell_word a cada token alfabético."""
    tokens = re.findall(r'\w+|\W+', text, flags=re.UNICODE)
    return ''.join(
        respell_word(tok) if tok.isalpha() else tok
        for tok in tokens
    )


def main():
    if len(sys.argv) > 1:
        txt = ' '.join(sys.argv[1:])
    else:
        txt = input("Cole o texto em português e tecle Enter:\n")
    print(respell_text(txt))


if __name__ == '__main__':
    main()
