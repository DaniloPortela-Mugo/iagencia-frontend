from dotenv import load_dotenv
from agno.agent import Agent
from agno.models.groq import Groq

load_dotenv()

agent = Agent(
    model=Groq(id="llama-3.3-70b-versatile"),
    instructions="Responda em PT-BR.",
    markdown=False
)

run = agent.run("Olá, meu nome é Danilo.")   # <= retorna um RunOutput
print(run.content)                            # <= texto da resposta

