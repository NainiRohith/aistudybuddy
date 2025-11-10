import os
import json
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

def generate_quiz_questions_from_topics(topics: List[str], course_name: str, num_questions: int = 10) -> List[dict]:
    """
    Generate quiz questions from course topics using OpenAI API.
    Returns a list of question dictionaries.
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip().strip('"').strip("'")
    
    if not api_key:
        # Fallback: create simple questions from topics
        questions = []
        for i, topic in enumerate(topics[:num_questions]):
            questions.append({
                "question": f"What is {topic}?",
                "options": [
                    f"A concept related to {topic}",
                    f"An advanced topic in {topic}",
                    f"A fundamental aspect of {topic}",
                    f"A practical application of {topic}"
                ],
                "correct_answer": f"A fundamental aspect of {topic}",
                "topic": topic
            })
        return questions
    
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=api_key)
        
        # Build prompt for generating quiz questions
        topics_str = ", ".join(topics[:20])  # Limit to first 20 topics
        prompt = f"""Generate {num_questions} multiple-choice quiz questions based on these course topics: {topics_str}

Course: {course_name}

Requirements:
- Each question should test understanding of one of the topics
- Each question should have exactly 4 options
- One option must be clearly correct
- Questions should be educational and test real understanding
- Include the topic name for each question

Return ONLY a valid JSON array with this exact structure:
[
  {{
    "question": "Question text here",
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
    "correct_answer": "Correct option text",
    "topic": "Topic name"
  }}
]

Do not include any markdown formatting, explanations, or text outside the JSON array."""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a quiz question generator. Return only valid JSON arrays."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        # Parse the JSON response
        response_text = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        questions = json.loads(response_text)
        
        # Validate and ensure we have the right number of questions
        if isinstance(questions, list) and len(questions) > 0:
            # Ensure each question has required fields
            for q in questions:
                if "question" not in q:
                    q["question"] = "Question text"
                if "options" not in q or len(q["options"]) != 4:
                    q["options"] = ["Option A", "Option B", "Option C", "Option D"]
                if "correct_answer" not in q:
                    q["correct_answer"] = q["options"][0]
                if "topic" not in q:
                    q["topic"] = topics[0] if topics else "General"
            
            return questions[:num_questions]
        else:
            raise ValueError("Invalid response format")
            
    except json.JSONDecodeError:
        # Fallback if JSON parsing fails
        return _generate_fallback_questions(topics, num_questions)
    except Exception as e:
        print(f"Error generating quiz questions: {str(e)}")
        return _generate_fallback_questions(topics, num_questions)

def _generate_fallback_questions(topics: List[str], num_questions: int) -> List[dict]:
    """Generate simple fallback questions when AI generation fails."""
    questions = []
    for i, topic in enumerate(topics[:num_questions]):
        questions.append({
            "question": f"Which of the following best describes {topic}?",
            "options": [
                f"A key concept in {topic}",
                f"An advanced technique in {topic}",
                f"A fundamental principle of {topic}",
                f"A practical application of {topic}"
            ],
            "correct_answer": f"A fundamental principle of {topic}",
            "topic": topic
        })
    return questions

