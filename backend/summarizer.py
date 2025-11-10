import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

def summarize_syllabus(syllabus_text: str, course_name: str) -> str:
    """
    Generate an AI summary of the syllabus using OpenAI API.
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip().strip('"').strip("'")
    
    if not api_key:
        # Fallback summary if API key is not configured
        return f"Summary for {course_name}:\n\nThis syllabus contains course information. Please configure OpenAI API key for detailed AI-generated summary."
    
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=api_key)
        
        # Truncate syllabus if too long (OpenAI has token limits)
        # Keep first 8000 characters to stay within limits
        truncated_text = syllabus_text[:8000] if len(syllabus_text) > 8000 else syllabus_text
        
        prompt = f"""Please provide a comprehensive summary of the following course syllabus for "{course_name}".

Focus on:
- Course objectives and learning outcomes
- Main topics and modules covered
- Important deadlines and assessments
- Key concepts students should understand
- Course structure and organization

Syllabus content:
{truncated_text}

Provide a well-structured summary with clear sections. Use markdown formatting for better readability."""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an educational assistant that creates clear, concise summaries of course syllabi. Use markdown formatting."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        return response.choices[0].message.content.strip()
        
    except ImportError:
        return "OpenAI library not installed. Please install it with: pip install openai"
    except Exception as e:
        # Return error message but don't crash
        return f"Error generating summary: {str(e)}\n\nPlease check your OpenAI API key and try again."

