from agno.agent import Agent
from agno.tools.tavily import TavilyTools
from dotenv import load_dotenv
from agno.models.openai import OpenAIChat
from agno.os import AgentOS
from agno.os.interfaces.agui import AGUI

chat_agent = Agent(model=OpenAIChat(id="gpt-4o"))

agent_os = AgentOS(agents=[chat_agent], interfaces=[AGUI(agent=chat_agent)])
app = agent_os.get_app()

if __name__ == "__main__":
    agent_os.serve(app="my_os:app", reload=True)
load_dotenv()

agent = Agent(
 #   model=Groq(id="llama-3.3-70b-versatile"),
    model=OpenAIChat(id="gpt-4.1-mini"),
    tools=[TavilyTools()]
)

agent.print_response("Pesquise a pevisão do tempo para São Paulo amanhã.")