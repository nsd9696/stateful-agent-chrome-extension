import os
import dotenv
from langchain import hub
from composio_langchain import ComposioToolSet, App
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_functions_agent

dotenv.load_dotenv()

llm = ChatOpenAI(model="gpt-4.1")
composio_toolset = ComposioToolSet(api_key=os.getenv("COMPOSIO_API_KEY"))
composio_integrations = composio_toolset.get_integrations()
tools = []
for integration in composio_integrations:
    app_name = integration.appName.upper()
    app_enum = getattr(App, app_name, None)
    app_tools = composio_toolset.get_tools(apps=[app_enum])
    tools.extend(app_tools)
prompt = hub.pull("hwchase17/openai-functions-agent")
agent = create_openai_functions_agent(llm, tools, prompt)
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
agent_executor.invoke({"input": "get my latest gmail"})
