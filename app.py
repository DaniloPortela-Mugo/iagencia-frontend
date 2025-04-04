from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import auth
import chat
import utils

app = Flask(__name__)
app.secret_key = 'segredo-super-seguro'  # Trocar em produção

# ==== ROTA DE LOGIN ====

@app.route('/', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        login = request.form['login']
        senha = request.form['senha']
        if auth.validar_usuario(login, senha):
            session['usuario'] = login
            return redirect(url_for('clientes'))
        else:
            return render_template('login.html', erro='Login ou senha inválidos')
    return render_template('login.html')

# ==== ROTA DE CLIENTES ====

@app.route('/clientes')
def clientes():
    if 'usuario' not in session:
        return redirect(url_for('login'))
    lista = utils.carregar_clientes()
    return render_template('clientes.html', clientes=lista)

# ==== ROTA DE CHAT ====

@app.route('/chat/<cliente_id>')
def chat_view(cliente_id):
    if 'usuario' not in session:
        return redirect(url_for('login'))
    return render_template('chat.html', cliente_id=cliente_id)

@app.route('/api/chat', methods=['POST'])
def api_chat():
    data = request.json
    mensagem = data.get('mensagem')
    cliente = data.get('cliente_id')
    resposta = chat.enviar_mensagem(cliente, mensagem)
    return jsonify({'resposta': resposta})

# ==== LOGOUT ====

@app.route('/logout')
def logout():
    session.pop('usuario', None)
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True)