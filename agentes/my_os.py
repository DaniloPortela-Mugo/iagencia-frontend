from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.os import AgentOS

import os
from dotenv import load_dotenv
load_dotenv()

assistant = agent = Agent(
    name="Assistant",
    model=OpenAIChat(id="gpt-5.1", api_key=os.getenv("OPENAI_API_KEY")),
    instructions="You are a helpful AI assistent.",
    markdown=True,
)

agent.os = AgentOS(
    id="my-firt-os",
    description="My first AgentOS",
    agents=[assistant],
    
)

app = agent.os.get_app()

if __name__ == "__main__":
    agent.os.serve(app="my_os:app", reload=True)