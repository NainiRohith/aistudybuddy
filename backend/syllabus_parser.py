import re
import io
import json
from typing import Dict, List, Any
from datetime import datetime

def extract_text_from_pdf(pdf_content: bytes) -> str:
    """Extract text from PDF file content."""
    try:
        import pdfplumber
        
        text_parts = []
        with pdfplumber.open(io.BytesIO(pdf_content)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)
        return "\n".join(text_parts)
    except ImportError:
        # Fallback to PyPDF2 if pdfplumber is not available
        try:
            from PyPDF2 import PdfReader
            pdf_reader = PdfReader(io.BytesIO(pdf_content))
            text_parts = []
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)
            return "\n".join(text_parts)
        except Exception as e:
            raise Exception(f"Failed to extract text from PDF: {str(e)}")

def extract_text_from_ppt(ppt_content: bytes) -> str:
    """Extract text from PowerPoint file content."""
    try:
        from pptx import Presentation
        
        text_parts = []
        presentation = Presentation(io.BytesIO(ppt_content))
        
        for slide in presentation.slides:
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    text = shape.text.strip()
                    if text:
                        text_parts.append(text)
        
        return "\n".join(text_parts)
    except ImportError:
        raise Exception("python-pptx library is required for PPT/PPTX files")
    except Exception as e:
        raise Exception(f"Failed to extract text from PPT: {str(e)}")

def extract_topics_with_ai(syllabus_text: str) -> List[str]:
    """
    Use AI to extract proper topic headings from syllabus text.
    """
    import os
    api_key = os.getenv("OPENAI_API_KEY", "").strip().strip('"').strip("'")
    
    if not api_key:
        return []
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        
        # Truncate if too long
        truncated_text = syllabus_text[:6000] if len(syllabus_text) > 6000 else syllabus_text
        
        prompt = f"""Extract ONLY the main topic headings/chapters from this course syllabus. 
Return ONLY topic names (2-5 words each), NOT full sentences or explanations.

Examples of good topics:
- "Python Loops"
- "Data Structures"
- "Object-Oriented Programming"
- "File Handling"
- "Exception Handling"

Examples of BAD topics (do NOT include these):
- "for is the basic loop in python."
- "list(range(5)) would generate a list of items in the range."
- "Publications are very helpful."

Syllabus content:
{truncated_text}

Return a JSON array of topic names only. Each topic should be:
- 2-5 words maximum
- A concept or subject area, not a sentence
- Properly capitalized
- No periods or sentence endings

Format: ["Topic 1", "Topic 2", "Topic 3", ...]"""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a syllabus parser. Extract only topic headings, not sentences. Return valid JSON arrays."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        response_text = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()
        
        topics = json.loads(response_text)
        if isinstance(topics, list):
            # Filter to ensure they're proper topics (2-5 words, no periods)
            filtered_topics = []
            for topic in topics:
                if isinstance(topic, str):
                    topic_clean = topic.strip()
                    word_count = len(topic_clean.split())
                    # Check if it's a proper topic (2-5 words, no sentence endings)
                    if (2 <= word_count <= 5 and 
                        not topic_clean.endswith('.') and 
                        not topic_clean.endswith('!') and
                        len(topic_clean) < 60):  # Max 60 chars
                        filtered_topics.append(topic_clean)
            return filtered_topics[:25]  # Limit to 25 topics
        
        return []
    except Exception as e:
        print(f"AI topic extraction failed: {str(e)}")
        return []

def parse_syllabus(syllabus_text: str) -> Dict[str, Any]:
    """
    Enhanced syllabus parser that extracts topics and deadlines from text.
    Uses AI to extract proper topics instead of sentences.
    """
    topics = []
    deadlines = []
    
    # First, try AI extraction for better topic identification
    ai_topics = extract_topics_with_ai(syllabus_text)
    if ai_topics and len(ai_topics) >= 3:
        topics.extend(ai_topics)
    
    # Also extract using pattern matching as fallback/supplement
    topic_patterns = [
        r'(?:Topic|Chapter|Unit|Module|Week)\s*\d*[:\-]\s*([^\n]{2,60}?)(?:\.|$|\n)',  # Topic headings (limit length)
        r'\d+\.\s+([A-Z][^\n]{2,60}?)(?:\.|$|\n)',  # Numbered topics (limit length, stop at period)
        r'[-•*]\s+([A-Z][^\n]{2,60}?)(?:\.|$|\n)',  # Bullet topics (limit length)
    ]
    
    for pattern in topic_patterns:
        matches = re.findall(pattern, syllabus_text, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            topic = match.strip()
            # Filter: must be 2-5 words, no sentence endings, reasonable length
            word_count = len(topic.split())
            if (2 <= word_count <= 8 and 
                not topic.endswith('.') and 
                not topic.endswith('!') and
                len(topic) < 60 and
                topic not in ['Introduction', 'Conclusion', 'Summary', 'References', 'Bibliography']):
                topics.append(topic)
    
    # Extract from lines that look like headings
    lines = syllabus_text.split('\n')
    for line in lines:
        line = line.strip()
        if len(line) < 4 or len(line) > 60:
            continue
        
        # Skip lines that are clearly sentences (end with period, have many words)
        if line.endswith('.') and len(line.split()) > 8:
            continue
        
        # Look for short heading-like lines (2-6 words, title case or all caps)
        word_count = len(line.split())
        if 2 <= word_count <= 6:
            # Check if it looks like a heading (starts with capital, no period, etc.)
            if (line[0].isupper() and 
                not line.endswith('.') and 
                not line.endswith('!') and
                not any(word.lower() in ['the', 'is', 'are', 'was', 'were', 'will', 'would', 'should'] for word in line.split()[:3])):
                topics.append(line)
    
    # Extract dates and deadlines
    date_patterns = [
        r'(\w+\s+\d{1,2},?\s+\d{4})',
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
    ]
    
    deadline_keywords = ['exam', 'assignment', 'due', 'deadline', 'quiz', 'test', 'project', 'midterm', 'final']
    
    for line in lines:
        line_lower = line.lower()
        if any(keyword in line_lower for keyword in deadline_keywords):
            for pattern in date_patterns:
                dates = re.findall(pattern, line)
                if dates:
                    deadlines.append({
                        "description": line.strip(),
                        "date": dates[0]
                    })
                    break
    
    # Clean up topics: remove duplicates, filter sentences, normalize
    seen = set()
    unique_topics = []
    
    # Common sentence starters/patterns to exclude
    sentence_indicators = [
        'is the', 'are the', 'was the', 'were the',
        'would', 'should', 'could', 'will',
        'this', 'that', 'these', 'those',
        'for is', 'list(range', 'mylist'
    ]
    
    for topic in topics:
        topic_clean = ' '.join(topic.split())
        topic_clean = topic_clean.strip()
        
        # Skip if too short or too long
        if len(topic_clean) < 3 or len(topic_clean) > 60:
            continue
        
        # Skip if it contains sentence indicators
        topic_lower = topic_clean.lower()
        if any(indicator in topic_lower for indicator in sentence_indicators):
            continue
        
        # Skip if it's a sentence (ends with period, has many words)
        word_count = len(topic_clean.split())
        if topic_clean.endswith('.') and word_count > 5:
            continue
        
        # Skip if it looks like code or technical detail rather than a topic
        if any(char in topic_clean for char in ['(', ')', '[', ']', '=', '==', '!=']):
            if word_count < 3:  # Very short technical things might be topics
                pass
            else:
                continue
        
        topic_key = topic_clean.lower()
        if topic_key not in seen:
            seen.add(topic_key)
            unique_topics.append(topic_clean)
    
    # If we have AI topics, prioritize them and limit to reasonable number
    if ai_topics and len(ai_topics) >= 3:
        # Use AI topics as primary, supplement with pattern matches
        final_topics = []
        ai_set = set(t.lower() for t in ai_topics)
        for topic in unique_topics:
            if topic.lower() not in ai_set:
                final_topics.append(topic)
        # Combine: AI topics first, then others
        topics = ai_topics + final_topics[:10]  # Limit additional topics
    else:
        topics = unique_topics
    
    return {
        "topics": topics[:30],  # Final limit
        "deadlines": deadlines
    }

