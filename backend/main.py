from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import os
from dotenv import load_dotenv

from database import SessionLocal, engine, Base
from models import User, Course, StudyPlan, StudySession, Resource, Quiz, QuizAttempt, Weakness
from schemas import (
    UserCreate, UserResponse, Token,
    CourseCreate, CourseResponse,
    StudyPlanCreate, StudyPlanResponse,
    ResourceCreate, ResourceResponse,
    QuizCreate, QuizResponse, QuizAttemptCreate, QuizAttemptResponse,
    WeaknessResponse, SyllabusImportRequest, GeneratePlanRequest,
    UpdateSessionRequest, ChatRequest
)
from auth import get_current_user, create_access_token, verify_password, get_password_hash
from syllabus_parser import parse_syllabus, extract_text_from_pdf, extract_text_from_ppt
from ai_assistant import get_ai_response

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Study Planner API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# Course endpoints
@app.post("/courses", response_model=CourseResponse)
def create_course(course: CourseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_course = Course(**course.dict(), user_id=current_user.id)
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

@app.get("/courses", response_model=List[CourseResponse])
def get_courses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    courses = db.query(Course).filter(Course.user_id == current_user.id).all()
    return courses

@app.post("/courses/{course_id}/import-syllabus")
async def import_syllabus(
    course_id: int, 
    file: Optional[UploadFile] = File(None),
    syllabus_text: Optional[str] = Form(None),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    text_content = ""
    
    # Handle file upload
    if file:
        file_extension = file.filename.split('.')[-1].lower() if file.filename else ""
        
        if file_extension == "pdf":
            content = await file.read()
            text_content = extract_text_from_pdf(content)
        elif file_extension in ["ppt", "pptx"]:
            content = await file.read()
            text_content = extract_text_from_ppt(content)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file format. Please upload PDF or PPT/PPTX files.")
    
    # Handle text input
    elif syllabus_text:
        text_content = syllabus_text
    else:
        raise HTTPException(status_code=400, detail="Either file or syllabus_text must be provided")
    
    if not text_content:
        raise HTTPException(status_code=400, detail="No content extracted from the file")
    
    # Parse syllabus to extract dates and topics
    parsed_data = parse_syllabus(text_content)
    
    # Update course with parsed data
    if parsed_data.get("topics"):
        course.topics = parsed_data["topics"]
    if parsed_data.get("deadlines"):
        course.deadlines = parsed_data["deadlines"]
    
    db.commit()
    return {"message": "Syllabus imported successfully", "data": parsed_data}

# Study Plan endpoints
@app.post("/study-plans", response_model=StudyPlanResponse)
def create_study_plan(plan: StudyPlanCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_plan = StudyPlan(**plan.dict(), user_id=current_user.id)
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)
    return db_plan

@app.get("/study-plans", response_model=List[StudyPlanResponse])
def get_study_plans(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plans = db.query(StudyPlan).filter(StudyPlan.user_id == current_user.id).all()
    return plans

@app.post("/study-plans/generate")
def generate_study_plan(request: GeneratePlanRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == request.course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Generate weekly plan based on course deadlines and topics
    start = datetime.fromisoformat(request.start_date)
    sessions = []
    
    # Simple algorithm: distribute topics across weeks
    topics = course.topics or []
    deadlines = course.deadlines or []
    
    for i, topic in enumerate(topics):
        session_date = start + timedelta(days=i * 2)  # Every 2 days
        session = StudySession(
            topic=topic,
            scheduled_date=session_date,
            duration_minutes=60,
            status="planned"
        )
        sessions.append(session)
    
    plan = StudyPlan(
        course_id=request.course_id,
        user_id=current_user.id,
        start_date=start,
        end_date=start + timedelta(weeks=8),
        sessions=sessions
    )
    
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan

@app.put("/study-plans/{plan_id}/sessions/{session_id}")
def update_session(plan_id: int, session_id: int, request: UpdateSessionRequest,
                  db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plan = db.query(StudyPlan).filter(StudyPlan.id == plan_id, StudyPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found")
    
    session = next((s for s in plan.sessions if s.id == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if request.new_date:
        session.scheduled_date = datetime.fromisoformat(request.new_date)
    if request.duration:
        session.duration_minutes = request.duration
    if request.status:
        session.status = request.status
    
    db.commit()
    return session

# Resource endpoints
@app.post("/resources", response_model=ResourceResponse)
def create_resource(resource: ResourceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_resource = Resource(**resource.dict(), user_id=current_user.id)
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource

@app.get("/resources", response_model=List[ResourceResponse])
def search_resources(query: Optional[str] = None, topic: Optional[str] = None, 
                    resource_type: Optional[str] = None,
                    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    resources = db.query(Resource).filter(Resource.user_id == current_user.id)
    
    if query:
        resources = resources.filter(Resource.title.contains(query) | Resource.description.contains(query))
    if topic:
        resources = resources.filter(Resource.topics.contains(topic))
    if resource_type:
        resources = resources.filter(Resource.resource_type == resource_type)
    
    return resources.all()

# Quiz endpoints
@app.get("/quizzes", response_model=List[QuizResponse])
def get_quizzes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quizzes = db.query(Quiz).filter(Quiz.user_id == current_user.id).all()
    return quizzes

@app.post("/quizzes", response_model=QuizResponse)
def create_quiz(quiz: QuizCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_quiz = Quiz(**quiz.dict(), user_id=current_user.id)
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)
    return db_quiz

@app.get("/quizzes/{quiz_id}", response_model=QuizResponse)
def get_quiz(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.user_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

@app.delete("/quizzes/{quiz_id}")
def delete_quiz(quiz_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.user_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Delete associated quiz attempts first (cascade delete)
    attempts = db.query(QuizAttempt).filter(QuizAttempt.quiz_id == quiz_id).all()
    for attempt in attempts:
        db.delete(attempt)
    
    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted successfully"}

@app.post("/quizzes/{quiz_id}/attempt", response_model=QuizAttemptResponse)
def submit_quiz_attempt(quiz_id: int, attempt: QuizAttemptCreate, 
                       db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id, Quiz.user_id == current_user.id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Calculate score
    correct = sum(1 for q, a in zip(quiz.questions, attempt.answers) if q["correct_answer"] == a)
    score = (correct / len(quiz.questions)) * 100 if quiz.questions else 0
    
    db_attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_id=current_user.id,
        answers=attempt.answers,
        score=score,
        completed_at=datetime.utcnow()
    )
    db.add(db_attempt)
    
    # Update weakness tracking
    for i, (question, answer) in enumerate(zip(quiz.questions, attempt.answers)):
        if question["correct_answer"] != answer:
            topic = question.get("topic", "general")
            weakness = db.query(Weakness).filter(
                Weakness.user_id == current_user.id,
                Weakness.topic == topic
            ).first()
            
            if weakness:
                weakness.count += 1
            else:
                weakness = Weakness(
                    user_id=current_user.id,
                    topic=topic,
                    count=1
                )
                db.add(weakness)
    
    db.commit()
    db.refresh(db_attempt)
    return db_attempt

@app.get("/weaknesses", response_model=List[WeaknessResponse])
def get_weaknesses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    weaknesses = db.query(Weakness).filter(Weakness.user_id == current_user.id).order_by(Weakness.count.desc()).all()
    return weaknesses

# AI Assistant endpoint
@app.post("/ai/chat")
def chat_with_ai(request: ChatRequest,
                db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    context = None
    if request.course_id:
        course = db.query(Course).filter(Course.id == request.course_id, Course.user_id == current_user.id).first()
        if course:
            context = f"Course: {course.name}\nTopics: {', '.join(course.topics or [])}"
    
    response = get_ai_response(request.message, context)
    return {"response": response}

@app.get("/")
def root():
    return {"message": "Study Planner API", "version": "1.0.0"}

