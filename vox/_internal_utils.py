def to_native_string(text):
    if isinstance(text, bytes):
        return text.decode("utf-8")
    return str(text)

def unicode_is_ascii(text):
    try:
        text.encode("ascii")
        return True
    except UnicodeEncodeError:
        return False
