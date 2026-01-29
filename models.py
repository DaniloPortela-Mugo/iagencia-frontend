# models.py

from ._internal_utils import to_native_string, unicode_is_ascii

# Exemplo de classes modelo simples

class User:
    def __init__(self, username):
        self.username = to_native_string(username)

    def is_ascii(self):
        return unicode_is_ascii(self.username)

class Cliente:
    def __init__(self, nome, email):
        self.nome = to_native_string(nome)
        self.email = to_native_string(email)

    def is_ascii_nome(self):
        return unicode_is_ascii(self.nome)
