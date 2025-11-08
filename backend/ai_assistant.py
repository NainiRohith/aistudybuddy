import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

def get_ai_response(message: str, context: Optional[str] = None) -> str:
    """
    AI assistant that provides course-related help.
    In production, this would connect to OpenAI API or another LLM service.
    """
    # For demo purposes, return a simple response
    # In production, replace with actual API call:
    # from openai import OpenAI
    # client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    # response = client.chat.completions.create(...)
    
    if context:
        return f"Based on your course context: {context}\n\nI can help you with: {message}. Here's a helpful explanation and steps to approach this topic."
    else:
        return f"I can help you with: {message}. Let me provide some guidance on this topic."

