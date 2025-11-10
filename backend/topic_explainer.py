import os
from typing import Optional
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

def explain_topic(
    topic: str,
    course_name: Optional[str] = None,
    syllabus_context: Optional[str] = None
) -> str:
    """
    Generate an AI explanation of a specific topic with examples using OpenAI API.
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip().strip('"').strip("'")
    
    if not api_key:
        # Fallback explanation if API key is not configured
        return f"""## {topic}

**Overview:**
This topic is part of {course_name if course_name else 'your course'}. 

**Key Points:**
- Fundamental concepts related to {topic}
- Important principles and applications
- Practical usage scenarios

**Examples:**
- Example 1: Basic application of {topic}
- Example 2: Advanced use case
- Example 3: Real-world scenario

⚠️ Note: OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file for detailed AI-powered explanations with examples."""
    
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=api_key)
        
        # Build context from syllabus if available
        context_section = ""
        if syllabus_context:
            context_section = f"\n\nCourse Syllabus Context:\n{syllabus_context[:1000]}"  # Limit context to avoid token limits
        
        course_section = f" for the course '{course_name}'" if course_name else ""
        
        prompt = f"""Explain the topic "{topic}"{course_section} in a clear, comprehensive way with practical examples.

Please provide:

1. **📖 Overview & Definition**:
   - Clear definition of {topic}
   - Why it's important
   - Where it fits in the broader course context

2. **🔑 Key Concepts**:
   - Main principles and concepts
   - Important terminology
   - Core ideas to understand

3. **💡 Practical Examples**:
   Provide at least 3-5 concrete examples:
   - Simple/basic example to start
   - Intermediate example
   - Advanced or real-world example
   - Code examples if applicable (use code blocks)
   - Step-by-step walkthroughs where relevant

4. **🎯 Common Use Cases**:
   - When and why you would use {topic}
   - Typical scenarios
   - Best practices

5. **⚠️ Common Mistakes & Pitfalls**:
   - What to watch out for
   - Common errors
   - How to avoid them

6. **✅ Practice Suggestions**:
   - How to practice this topic
   - Exercises to try
   - Self-assessment questions

Format your response using Markdown with:
- Clear headings (##, ###)
- **Bold** for important terms
- Code blocks (```) for code examples
- Numbered or bullet lists for steps
- Tables if helpful
- Emojis for visual organization (optional)

Make it engaging, practical, and easy to understand with plenty of examples.{context_section}"""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert educational assistant. You explain topics clearly with practical examples, making complex concepts easy to understand. Always include multiple examples and use cases."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=1500
        )
        
        return response.choices[0].message.content.strip()
        
    except ImportError:
        return f"## {topic}\n\nOpenAI library not installed. Please install it with: pip install openai"
    except Exception as e:
        return f"## {topic}\n\nI encountered an error while processing your request: {str(e)}\n\nPlease check your OpenAI API key and try again."

