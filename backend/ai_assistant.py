import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

def get_ai_response(message: str, context: Optional[str] = None) -> str:
    """
    AI assistant that provides course-related help using OpenAI API.
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip().strip('"').strip("'")
    
    if not api_key:
        # Fallback response if API key is not configured
        if context:
            return f"Based on your course context: {context}\n\nI can help you with: {message}. Here's a helpful explanation and steps to approach this topic.\n\n⚠️ Note: OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file for full AI functionality."
        else:
            return f"I can help you with: {message}. Let me provide some guidance on this topic.\n\n⚠️ Note: OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file for full AI functionality."
    
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=api_key)
        
        # Build the system prompt with context if available
        system_prompt = """You are a helpful study assistant for students. You help them understand course concepts, 
        solve problems, and provide clear explanations. Be concise, accurate, and encouraging.

Format your responses using Markdown:
- Use **bold** for important terms
- Use *italic* for emphasis
- Use bullet points (-) or numbered lists for steps
- Use code blocks (```) for code examples
- Use headings (##) to organize longer explanations
- Break up long paragraphs for readability"""
        
        if context:
            system_prompt += f"\n\nCourse Context:\n{context}"
        
        # Make the API call
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # You can change to gpt-4 or gpt-4-turbo if you have access
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        return response.choices[0].message.content.strip()
        
    except ImportError:
        return "OpenAI library not installed. Please install it with: pip install openai"
    except Exception as e:
        # Return error message but don't crash
        return f"I encountered an error while processing your request: {str(e)}\n\nPlease check your OpenAI API key and try again."

