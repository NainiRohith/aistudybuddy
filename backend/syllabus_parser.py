import re
import io
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

def parse_syllabus(syllabus_text: str) -> Dict[str, Any]:
    """
    Simple syllabus parser that extracts topics and deadlines from text.
    In a production system, this would use NLP or structured parsing.
    """
    topics = []
    deadlines = []
    
    # Extract topics (simple pattern matching)
    # Look for numbered lists, bullet points, or "Topic:" patterns
    topic_patterns = [
        r'(?:Topic|Chapter|Unit)\s*\d*[:\-]\s*([^\n]+)',
        r'\d+\.\s*([A-Z][^\n]+)',
        r'[-•]\s*([A-Z][^\n]+)',
    ]
    
    for pattern in topic_patterns:
        matches = re.findall(pattern, syllabus_text, re.IGNORECASE)
        topics.extend([m.strip() for m in matches if len(m.strip()) > 3])
    
    # Extract dates and deadlines
    date_patterns = [
        r'(\w+\s+\d{1,2},?\s+\d{4})',
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
    ]
    
    deadline_keywords = ['exam', 'assignment', 'due', 'deadline', 'quiz', 'test', 'project']
    
    lines = syllabus_text.split('\n')
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
    
    # Remove duplicates
    topics = list(set(topics))[:20]  # Limit to 20 topics
    
    return {
        "topics": topics,
        "deadlines": deadlines
    }

