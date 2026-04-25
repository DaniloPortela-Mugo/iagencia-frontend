# _internal_utils.py

def to_native_string(text):
    """
    Converte texto para string nativa, útil em compatibilidade com Python 2/3 (herança histórica).
    """
    if isinstance(text, bytes):
        return text.decode("utf-8")
    return str(text)

def unicode_is_ascii(text):
    """
    Verifica se uma string contém apenas caracteres ASCII.
    """
    try:
        text.encode("ascii")
        return True
    except UnicodeEncodeError:
        return False
