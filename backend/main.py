from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import os
from dotenv import load_dotenv

from database import SessionLocal, engine, Base
from models import User, Course, StudyPlan, StudySession, Resource, Quiz, QuizAttempt, Weakness, Test
from schemas import (
    UserCreate, UserResponse, Token,
    CourseCreate, CourseResponse,
    StudyPlanCreate, StudyPlanResponse,
    ResourceCreate, ResourceResponse,
    QuizCreate, QuizResponse, QuizAttemptCreate, QuizAttemptResponse,
    WeaknessResponse, SyllabusImportRequest, GeneratePlanRequest,
    UpdateSessionRequest, ChatRequest,
    TestCreate, TestUpdate, TestResponse
)
from auth import get_current_user, create_access_token, verify_password, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
from syllabus_parser import parse_syllabus, extract_text_from_pdf, extract_text_from_ppt
from ai_assistant import get_ai_response
from quiz_generator import generate_quiz_questions_from_topics
from summarizer import summarize_syllabus
from plan_explainer import explain_study_plan
from topic_explainer import explain_topic
from test_recommender import generate_test_study_plan

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Study Buddy API", version="1.0.0")

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
    
    # Update login streak
    now = datetime.utcnow()
    today = now.date()
    
    if user.last_login_date:
        last_login = user.last_login_date.date()
        days_diff = (today - last_login).days
        
        if days_diff == 0:
            # Already logged in today, don't update streak
            pass
        elif days_diff == 1:
            # Consecutive day - increment streak
            user.login_streak = (user.login_streak or 0) + 1
            if user.login_streak > (user.longest_streak or 0):
                user.longest_streak = user.login_streak
        else:
            # Streak broken - reset to 1
            user.login_streak = 1
    else:
        # First login - start streak
        user.login_streak = 1
    
    user.last_login_date = now
    db.commit()
    
    # Use longer expiration time (30 minutes)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": user.email}, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/users/me/streak")
def get_user_streak(current_user: User = Depends(get_current_user)):
    """Get user's login streak information"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Calculate days since last login
        days_since_login = None
        if user.last_login_date:
            days_since_login = (datetime.utcnow().date() - user.last_login_date.date()).days
        
        return {
            "login_streak": user.login_streak or 0,
            "longest_streak": user.longest_streak or 0,
            "last_login_date": user.last_login_date.isoformat() if user.last_login_date else None,
            "days_since_login": days_since_login,
            "is_streak_active": days_since_login == 0 if days_since_login is not None else False
        }
    finally:
        db.close()

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
    files: List[UploadFile] = File(default=[]),
    syllabus_text: Optional[str] = Form(None),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    text_content = ""
    all_text_parts = []
    processed_files = []
    
    # Handle multiple file uploads
    if files and len(files) > 0:
        for file in files:
            if not file.filename:
                continue
                
            file_extension = file.filename.split('.')[-1].lower()
            
            try:
                if file_extension == "pdf":
                    content = await file.read()
                    extracted_text = extract_text_from_pdf(content)
                    if extracted_text and extracted_text.strip():
                        all_text_parts.append(f"\n\n--- Content from {file.filename} ---\n\n{extracted_text}")
                        processed_files.append(file.filename)
                elif file_extension in ["ppt", "pptx"]:
                    content = await file.read()
                    extracted_text = extract_text_from_ppt(content)
                    if extracted_text and extracted_text.strip():
                        all_text_parts.append(f"\n\n--- Content from {file.filename} ---\n\n{extracted_text}")
                        processed_files.append(file.filename)
                else:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Unsupported file format for {file.filename}. Please upload PDF or PPT/PPTX files."
                    )
            except HTTPException:
                # Re-raise HTTP exceptions
                raise
            except Exception as e:
                # Log error but continue with other files
                print(f"Error processing file {file.filename}: {str(e)}")
                # Don't fail completely, just skip this file
                continue
        
        # Combine all text from multiple files
        if all_text_parts:
            text_content = "\n".join(all_text_parts)
        else:
            raise HTTPException(
                status_code=400, 
                detail="No content extracted from any of the uploaded files. Please check that the files are valid PDF or PPT/PPTX files."
            )
    
    # Handle text input
    elif syllabus_text:
        text_content = syllabus_text
    else:
        raise HTTPException(status_code=400, detail="Either files or syllabus_text must be provided")
    
    if not text_content or not text_content.strip():
        raise HTTPException(status_code=400, detail="No content extracted from the files")
    
    # Parse syllabus to extract dates and topics
    parsed_data = parse_syllabus(text_content)
    
    # Update course with parsed data
    if parsed_data.get("topics"):
        course.topics = parsed_data["topics"]
    if parsed_data.get("deadlines"):
        course.deadlines = parsed_data["deadlines"]
    
    # Store the full syllabus content for summarization
    course.syllabus_content = text_content
    
    db.commit()
    
    file_count = len(processed_files) if processed_files else (len(files) if files else 0)
    has_topics = parsed_data.get("topics") and len(parsed_data["topics"]) > 0
    
    return {
        "message": "Syllabus imported successfully", 
        "data": parsed_data,
        "has_topics": has_topics,
        "topics_count": len(parsed_data.get("topics", [])) if has_topics else 0,
        "files_processed": file_count,
        "processed_file_names": processed_files if processed_files else []
    }

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
    # Handle date format - support both 'yyyy-MM-dd' and ISO format
    try:
        if len(request.start_date) == 10:  # Format: 'yyyy-MM-dd'
            start = datetime.strptime(request.start_date, '%Y-%m-%d')
        else:
            start = datetime.fromisoformat(request.start_date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {request.start_date}. Please use YYYY-MM-DD format.")
    
    # Parse end_date if provided, otherwise calculate it
    if request.end_date:
        try:
            if len(request.end_date) == 10:  # Format: 'yyyy-MM-dd'
                end_date = datetime.strptime(request.end_date, '%Y-%m-%d')
            else:
                end_date = datetime.fromisoformat(request.end_date)
            
            # Validate that end_date is after start_date
            if end_date <= start:
                raise HTTPException(status_code=400, detail="End date must be after start date.")
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Invalid end date format: {request.end_date}. Please use YYYY-MM-DD format.")
    else:
        # Calculate end date based on number of topics (allow 2-3 days per topic)
        # Or use 8 weeks minimum, whichever is longer
        days_needed = max(len(course.topics or []) * 2, 56)  # At least 8 weeks (56 days)
        end_date = start + timedelta(days=days_needed)
    
    sessions = []
    
    # Get topics from course - ensure they're in list format
    topics = course.topics or []
    if isinstance(topics, str):
        # If topics is stored as a string, try to parse it
        try:
            import json
            topics = json.loads(topics)
        except:
            topics = [topics] if topics else []
    
    # Ensure topics is a list
    if not isinstance(topics, list):
        topics = []
    
    deadlines = course.deadlines or []
    
    if not topics:
        raise HTTPException(
            status_code=400, 
            detail="No topics found for this course. Please import a syllabus first to extract topics."
        )
    
    # Distribute topics evenly across the study period
    total_days = (end_date - start).days
    if len(topics) > 0:
        days_per_topic = max(1, total_days // len(topics))
    else:
        days_per_topic = 2
    
    # Create a study session for each topic
    for i, topic in enumerate(topics):
        # Skip empty or invalid topics
        if not topic or not isinstance(topic, str) or len(topic.strip()) == 0:
            continue
        
        # Calculate session date - distribute evenly
        session_date = start + timedelta(days=i * days_per_topic)
        
        # Ensure session date doesn't exceed end date
        if session_date > end_date:
            session_date = end_date - timedelta(days=1)
        
        session = StudySession(
            topic=topic.strip(),
            scheduled_date=session_date,
            duration_minutes=60,
            status="planned"
        )
        sessions.append(session)
    
    if not sessions:
        raise HTTPException(
            status_code=400,
            detail="No valid topics found to create study sessions. Please check your syllabus import."
        )
    
    # Update end date to match the last session (only if end_date was auto-calculated)
    if not request.end_date and sessions:
        last_session_date = max(session.scheduled_date for session in sessions)
        end_date = last_session_date + timedelta(days=1)
    
    plan = StudyPlan(
        course_id=request.course_id,
        user_id=current_user.id,
        start_date=start,
        end_date=end_date,
        sessions=sessions
    )
    
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan

@app.get("/courses/{course_id}/summarize")
def summarize_course_syllabus(course_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if not course.syllabus_content:
        raise HTTPException(
            status_code=400, 
            detail="No syllabus content found. Please import a syllabus first (PDF/PPT or text)."
        )
    
    try:
        summary = summarize_syllabus(course.syllabus_content, course.name)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate summary: {str(e)}")

@app.get("/study-plans/{plan_id}/explain")
def explain_plan(plan_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plan = db.query(StudyPlan).filter(StudyPlan.id == plan_id, StudyPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found")
    
    course = db.query(Course).filter(Course.id == plan.course_id).first()
    course_name = course.name if course else "Unknown Course"
    
    # Convert sessions to dict format for the explainer
    sessions_data = []
    for session in plan.sessions:
        sessions_data.append({
            "topic": session.topic,
            "scheduled_date": session.scheduled_date.strftime('%B %d, %Y'),
            "duration_minutes": session.duration_minutes,
            "status": session.status
        })
    
    try:
        explanation = explain_study_plan(
            course_name=course_name,
            sessions=sessions_data,
            start_date=plan.start_date,
            end_date=plan.end_date
        )
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate explanation: {str(e)}")

@app.get("/study-sessions/{session_id}/explain")
def explain_session_topic(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Explain a specific study session topic with examples using AI."""
    session = db.query(StudySession).filter(StudySession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Study session not found")
    
    # Verify the session belongs to the user's study plan
    plan = db.query(StudyPlan).filter(StudyPlan.id == session.plan_id, StudyPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=403, detail="You don't have access to this session")
    
    # Get course information for context
    course = db.query(Course).filter(Course.id == plan.course_id).first()
    course_name = course.name if course else None
    syllabus_context = course.syllabus_content if course else None
    
    try:
        explanation = explain_topic(
            topic=session.topic,
            course_name=course_name,
            syllabus_context=syllabus_context
        )
        return {"explanation": explanation, "topic": session.topic}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate explanation: {str(e)}")

@app.delete("/study-plans/{plan_id}")
def delete_study_plan(plan_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plan = db.query(StudyPlan).filter(StudyPlan.id == plan_id, StudyPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Study plan not found")
    
    # Sessions will be deleted automatically due to cascade relationship
    db.delete(plan)
    db.commit()
    return {"message": "Study plan deleted successfully"}

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
    
    # Apply query filter (title/description search)
    if query:
        resources = resources.filter(
            Resource.title.contains(query) | 
            (Resource.description.isnot(None) & Resource.description.contains(query))
        )
    
    # Apply resource_type filter
    if resource_type:
        resources = resources.filter(Resource.resource_type == resource_type)
    
    # Get all resources that match query and resource_type filters
    all_resources = resources.all()
    
    # Apply topic filter in Python (since topics is JSON field)
    if topic:
        import json
        filtered_resources = []
        for resource in all_resources:
            if resource.topics:
                # Handle different formats: list, JSON string, or None
                if isinstance(resource.topics, list):
                    topics_list = resource.topics
                elif isinstance(resource.topics, str):
                    try:
                        topics_list = json.loads(resource.topics)
                    except:
                        topics_list = [resource.topics]
                else:
                    topics_list = []
                
                # Check if topic matches any in the list (case-insensitive)
                if any(topic.lower() in str(t).lower() for t in topics_list):
                    filtered_resources.append(resource)
        return filtered_resources
    
    return all_resources

# Quiz endpoints
@app.get("/quizzes", response_model=List[QuizResponse])
def get_quizzes(
    course_id: Optional[int] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    quizzes = db.query(Quiz).filter(Quiz.user_id == current_user.id)
    
    # Filter by course if provided
    if course_id:
        quizzes = quizzes.filter(Quiz.course_id == course_id)
    
    return quizzes.all()

@app.post("/quizzes", response_model=QuizResponse)
def create_quiz(quiz: QuizCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_quiz = Quiz(**quiz.dict(), user_id=current_user.id)
    db.add(db_quiz)
    db.commit()
    db.refresh(db_quiz)
    return db_quiz

@app.post("/courses/{course_id}/generate-quiz", response_model=QuizResponse)
def generate_quiz_from_course(course_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Generate a quiz from course topics"""
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    topics = course.topics or []
    if isinstance(topics, str):
        try:
            import json
            topics = json.loads(topics)
        except:
            topics = [topics] if topics else []
    
    if not isinstance(topics, list):
        topics = []
    
    if not topics or len(topics) == 0:
        raise HTTPException(
            status_code=400,
            detail="No topics found for this course. Please import a syllabus first to extract topics."
        )
    
    try:
        # Generate questions from topics
        questions = generate_quiz_questions_from_topics(
            topics,
            course.name,
            num_questions=10
        )
        
        # Create quiz for this course
        quiz_title = f"{course.name} - Syllabus Quiz"
        db_quiz = Quiz(
            title=quiz_title,
            course_id=course.id,
            user_id=current_user.id,
            questions=questions
        )
        db.add(db_quiz)
        db.commit()
        db.refresh(db_quiz)
        return db_quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")

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

@app.delete("/weaknesses/{weakness_id}")
def delete_weakness(weakness_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a weakness when user has improved"""
    weakness = db.query(Weakness).filter(Weakness.id == weakness_id, Weakness.user_id == current_user.id).first()
    if not weakness:
        raise HTTPException(status_code=404, detail="Weakness not found")
    
    db.delete(weakness)
    db.commit()
    return {"message": "Weakness removed successfully"}

@app.get("/weaknesses/{weakness_id}/recommendations")
def get_weakness_recommendations(weakness_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get AI-powered study recommendations for a specific weakness"""
    weakness = db.query(Weakness).filter(Weakness.id == weakness_id, Weakness.user_id == current_user.id).first()
    if not weakness:
        raise HTTPException(status_code=404, detail="Weakness not found")
    
    try:
        from ai_assistant import get_ai_response
        
        prompt = f"""I'm struggling with the topic "{weakness.topic}" and have gotten {weakness.count} questions wrong about it. 
        Please provide:
        1. A brief explanation of why this topic might be challenging
        2. Specific study strategies to improve
        3. Recommended practice activities
        4. Key concepts to focus on
        5. Resources or approaches that would help
        
        Format your response in clear sections with bullet points."""
        
        recommendations = get_ai_response(prompt)
        return {"recommendations": recommendations, "topic": weakness.topic}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")

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

# Test endpoints
@app.post("/tests", response_model=TestResponse)
def create_test(test: TestCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new test/exam entry"""
    course = db.query(Course).filter(Course.id == test.course_id, Course.user_id == current_user.id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Parse test_date string
    try:
        if 'T' in test.test_date:
            test_date = datetime.fromisoformat(test.test_date.replace('Z', '+00:00'))
        else:
            test_date = datetime.strptime(test.test_date, '%Y-%m-%d')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    
    db_test = Test(
        user_id=current_user.id,
        course_id=test.course_id,
        name=test.name,
        test_date=test_date,
        test_type=test.test_type,
        score=test.score,
        max_score=test.max_score or 100,
        weight=test.weight or 0.0,
        topics=test.topics,
        notes=test.notes
    )
    db.add(db_test)
    db.commit()
    db.refresh(db_test)
    return db_test

@app.get("/tests", response_model=List[TestResponse])
def get_tests(
    course_id: Optional[int] = None,
    upcoming_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all tests, optionally filtered by course or upcoming only"""
    tests = db.query(Test).filter(Test.user_id == current_user.id)
    
    if course_id:
        tests = tests.filter(Test.course_id == course_id)
    
    if upcoming_only:
        tests = tests.filter(Test.test_date >= datetime.utcnow())
    
    return tests.order_by(Test.test_date.asc()).all()

@app.get("/tests/{test_id}", response_model=TestResponse)
def get_test(test_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a specific test"""
    test = db.query(Test).filter(Test.id == test_id, Test.user_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return test

@app.put("/tests/{test_id}", response_model=TestResponse)
def update_test(test_id: int, test_update: TestUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update a test"""
    test = db.query(Test).filter(Test.id == test_id, Test.user_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    if test_update.name is not None:
        test.name = test_update.name
    if test_update.test_date is not None:
        try:
            if 'T' in test_update.test_date:
                test.test_date = datetime.fromisoformat(test_update.test_date.replace('Z', '+00:00'))
            else:
                test.test_date = datetime.strptime(test_update.test_date, '%Y-%m-%d')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    if test_update.test_type is not None:
        test.test_type = test_update.test_type
    if test_update.score is not None:
        test.score = test_update.score
    if test_update.max_score is not None:
        test.max_score = test_update.max_score
    if test_update.weight is not None:
        test.weight = test_update.weight
    if test_update.topics is not None:
        test.topics = test_update.topics
    if test_update.notes is not None:
        test.notes = test_update.notes
    
    db.commit()
    db.refresh(test)
    return test

@app.delete("/tests/{test_id}")
def delete_test(test_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a test"""
    test = db.query(Test).filter(Test.id == test_id, Test.user_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    db.delete(test)
    db.commit()
    return {"message": "Test deleted successfully"}

@app.get("/tests/{test_id}/study-plan")
def get_test_study_plan(test_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get AI-generated study plan recommendation for a test"""
    test = db.query(Test).filter(Test.id == test_id, Test.user_id == current_user.id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    
    course = db.query(Course).filter(Course.id == test.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Calculate days until test
    now = datetime.utcnow()
    days_until = (test.test_date - now).days
    
    if days_until < 0:
        raise HTTPException(status_code=400, detail="Test date has already passed")
    
    # Get user's weaknesses for this course
    weaknesses = db.query(Weakness).filter(
        Weakness.user_id == current_user.id
    ).all()
    weakness_topics = [w.topic for w in weaknesses]
    
    # Get topics for the test (use test topics if available, otherwise course topics)
    topics = test.topics if test.topics else (course.topics if course.topics else [])
    if isinstance(topics, str):
        try:
            import json
            topics = json.loads(topics)
        except:
            topics = [topics] if topics else []
    
    if not isinstance(topics, list):
        topics = []
    
    try:
        study_plan = generate_test_study_plan(
            course_name=course.name,
            test_name=test.name,
            test_date=test.test_date,
            topics=topics,
            days_until_test=days_until,
            existing_weaknesses=weakness_topics
        )
        return {
            "study_plan": study_plan,
            "days_until_test": days_until,
            "test_name": test.name,
            "course_name": course.name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate study plan: {str(e)}")

@app.get("/")
def root():
    return {"message": "AI Study Buddy API", "version": "1.0.0"}

