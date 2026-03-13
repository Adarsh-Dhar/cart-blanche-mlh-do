from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize gpt-4o-mini via GitHub Models
llm = ChatOpenAI(
    model="gpt-4o-mini",
    openai_api_key=os.environ["GITHUB_TOKEN"],
    openai_api_base="https://models.inference.ai.azure.com",
    temperature=0 # Crucial for protocol consistency
)