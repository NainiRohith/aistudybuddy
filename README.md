# Study Planner - Smart Learning Companion

A comprehensive study planning and learning management application that helps students manage multiple courses, find study materials, and get personalized feedback.

## Features

- **Course Management**: Add and manage your courses
- **Syllabus Import**: Import and parse course syllabi to extract topics and deadlines
- **Study Plan Generator**: Automatically generate weekly study plans based on course content
- **Resource Finder**: Search and manage study resources (notes, past papers, videos)
- **Diagnostic Quizzes**: Take quizzes to assess your knowledge and identify weak areas
- **Weakness Tracker**: Visualize topics that need more practice
- **AI Assistant**: Get help with course-related questions

## Tech Stack

### Backend
- **FastAPI**: Python web framework
- **SQLAlchemy**: ORM for database operations
- **PostgreSQL/SQLite**: Database (SQLite for development)
- **JWT**: Authentication
- **Pydantic**: Data validation

### Frontend
- **React 18**: UI library
- **TypeScript**: Type safety
- **Vite**: Build tool
- **React Router**: Navigation
- **Axios**: HTTP client

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file (optional, defaults are provided):
```bash
cp .env.example .env
```

5. Run the backend server:
```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

## API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation (Swagger UI).

## Key User Tasks (from requirements)

- **T2**: Generate & edit weekly plan - Available in `/planner`
- **T3**: Find notes/past papers for a topic - Available in `/resources`
- **T4**: Quick diagnostic + weakness results - Available in `/quiz` and `/weaknesses`

## Project Structure

```
app2/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── models.py            # Database models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # Authentication utilities
│   ├── database.py           # Database configuration
│   ├── syllabus_parser.py   # Syllabus parsing logic
│   ├── ai_assistant.py      # AI chat integration
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── context/         # React context (Auth)
│   │   ├── services/        # API service
│   │   └── App.tsx          # Main app component
│   └── package.json         # Node dependencies
└── README.md
```

## Development Notes

- The application uses SQLite by default for easy setup. For production, configure PostgreSQL in the `.env` file.
- The AI assistant currently uses a placeholder implementation. To use OpenAI, add your API key to `.env` and update `ai_assistant.py`.
- The syllabus parser uses simple pattern matching. For production, consider using NLP libraries or structured parsing.

## Usability Goals (from requirements)

- Setup speed: First-time plan creation ≤ 5 minutes
- Task success: 85% of users can locate materials in ≤ 60 seconds
- Cognitive load: SUS ≥ 78 and NASA-TLX effort ≤ 35/100

