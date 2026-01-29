# auth.py

usuarios = {
    "Bruno": "breno",
    "Danilo": "ju",
    "Luciana": "teste123",
    "Julia": "teste123"
}

def validar_usuario(login, senha):
    login = login.strip()
    senha = senha.replace(" ", "")
    return usuarios.get(login) == senha

