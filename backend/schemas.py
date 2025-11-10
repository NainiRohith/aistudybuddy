from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime

# User schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    login_streak: Optional[int] = 0
    last_login_date: Optional[datetime] = None
    longest_streak: Optional[int] = 0
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# Course schemas
class CourseCreate(BaseModel):
    name: str
    code: Optional[str] = None
    topics: Optional[List[str]] = None
    deadlines: Optional[List[Dict[str, Any]]] = None

class CourseResponse(BaseModel):
    id: int
    name: str
    code: Optional[str]
    topics: Optional[List[str]]
    deadlines: Optional[List[Dict[str, Any]]]
    syllabus_content: Optional[str] = None  # Not exposed in response by default
    created_at: datetime
    
    class Config:
        from_attributes = True

# Study Plan schemas
class StudySessionResponse(BaseModel):
    id: int
    topic: str
    scheduled_date: datetime
    duration_minutes: int
    status: str
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class StudyPlanCreate(BaseModel):
    course_id: int
    start_date: datetime
    end_date: datetime

class StudyPlanResponse(BaseModel):
    id: int
    course_id: int
    start_date: datetime
    end_date: datetime
    sessions: List[StudySessionResponse] = []
    created_at: datetime
    
    class Config:
        from_attributes = True

# Resource schemas
class ResourceCreate(BaseModel):
    title: str
    description: Optional[str] = None
    resource_type: Optional[str] = None
    url: Optional[str] = None
    topics: Optional[List[str]] = None

class ResourceResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    resource_type: Optional[str]
    url: Optional[str]
    topics: Optional[List[str]]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Quiz schemas
class QuizCreate(BaseModel):
    title: str
    course_id: Optional[int] = None
    questions: List[Dict[str, Any]]

class QuizResponse(BaseModel):
    id: int
    title: str
    course_id: Optional[int]
    questions: List[Dict[str, Any]]
    created_at: datetime
    
    class Config:
        from_attributes = True

class QuizAttemptCreate(BaseModel):
    answers: List[str]

class QuizAttemptResponse(BaseModel):
    id: int
    quiz_id: int
    score: float
    completed_at: datetime
    
    class Config:
        from_attributes = True

# Weakness schemas
class WeaknessResponse(BaseModel):
    id: int
    topic: str
    count: int
    last_updated: datetime
    
    class Config:
        from_attributes = True

# Test schemas
class TestCreate(BaseModel):
    course_id: int
    name: str
    test_date: str  # ISO format string
    test_type: Optional[str] = None
    score: Optional[float] = None
    max_score: Optional[float] = 100
    weight: Optional[float] = 0.0
    topics: Optional[List[str]] = None
    notes: Optional[str] = None

class TestUpdate(BaseModel):
    name: Optional[str] = None
    test_date: Optional[str] = None
    test_type: Optional[str] = None
    score: Optional[float] = None
    max_score: Optional[float] = None
    weight: Optional[float] = None
    topics: Optional[List[str]] = None
    notes: Optional[str] = None

class TestResponse(BaseModel):
    id: int
    course_id: int
    name: str
    test_date: datetime
    test_type: Optional[str]
    score: Optional[float]
    max_score: float
    weight: float
    topics: Optional[List[str]]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

# Request schemas
class SyllabusImportRequest(BaseModel):
    syllabus_text: str

class GeneratePlanRequest(BaseModel):
    course_id: int
    start_date: str
    end_date: Optional[str] = None

class UpdateSessionRequest(BaseModel):
    new_date: Optional[str] = None
    duration: Optional[int] = None
    status: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    course_id: Optional[int] = None

