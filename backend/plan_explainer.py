import os
from typing import List, Dict, Any
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

def explain_study_plan(
    course_name: str,
    sessions: List[Dict[str, Any]],
    start_date: datetime,
    end_date: datetime
) -> str:
    """
    Generate an AI explanation of a study plan using OpenAI API.
    """
    api_key = os.getenv("OPENAI_API_KEY", "").strip().strip('"').strip("'")
    
    if not api_key:
        # Fallback explanation if API key is not configured
        topics_list = [session.get('topic', 'Unknown') for session in sessions[:10]]
        return f"""## Study Plan Overview for {course_name}

**Duration:** {start_date.strftime('%B %d, %Y')} to {end_date.strftime('%B %d, %Y')}

**Total Sessions:** {len(sessions)}

**Topics Covered:**
{chr(10).join(f'- {topic}' for topic in topics_list[:10])}
{f'{chr(10)}... and {len(sessions) - 10} more topics' if len(sessions) > 10 else ''}

This study plan is designed to help you systematically cover all course topics over the specified period.

⚠️ Note: OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file for detailed AI-powered explanations."""
    
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=api_key)
        
        # Format sessions information with dates for better scheduling
        from datetime import datetime as dt
        sessions_by_week = {}
        all_sessions_list = []
        
        for session in sessions:
            session_date_str = session.get('scheduled_date', '')
            topic = session.get('topic', 'Unknown')
            duration = session.get('duration_minutes', 60)
            
            # Try to parse date and organize by week
            try:
                if isinstance(session_date_str, str):
                    # Try different date formats
                    try:
                        session_date = dt.strptime(session_date_str, '%B %d, %Y')
                    except:
                        try:
                            session_date = dt.strptime(session_date_str, '%Y-%m-%d')
                        except:
                            session_date = dt.strptime(session_date_str, '%m/%d/%Y')
                elif isinstance(session_date_str, datetime):
                    session_date = session_date_str
                else:
                    session_date = None
                
                if session_date:
                    week_num = ((session_date - start_date).days // 7) + 1
                    if week_num not in sessions_by_week:
                        sessions_by_week[week_num] = []
                    sessions_by_week[week_num].append({
                        'topic': topic,
                        'date': session_date_str,
                        'duration': duration
                    })
            except:
                # If date parsing fails, just add to flat list
                all_sessions_list.append({
                    'topic': topic,
                    'date': session_date_str,
                    'duration': duration
                })
        
        # Format sessions text with weekly organization
        sessions_text = ""
        if sessions_by_week:
            for week_num in sorted(sessions_by_week.keys())[:8]:  # First 8 weeks
                sessions_text += f"\n**Week {week_num}:**\n"
                for session in sessions_by_week[week_num][:10]:  # Max 10 per week
                    sessions_text += f"- {session['topic']} ({session['date']}, {session['duration']} min)\n"
            
            # Add remaining sessions count
            total_sessions = len(sessions)
            shown_sessions = sum(len(sessions_by_week[w]) for w in list(sessions_by_week.keys())[:8])
            if total_sessions > shown_sessions:
                sessions_text += f"\n... and {total_sessions - shown_sessions} more sessions across remaining weeks"
        else:
            # Fallback: just list sessions
            for i, session in enumerate(sessions[:30]):
                sessions_text += f"- {i+1}. {session.get('topic', 'Unknown')} ({session.get('scheduled_date', 'TBD')}, {session.get('duration_minutes', 60)} min)\n"
            if len(sessions) > 30:
                sessions_text += f"\n... and {len(sessions) - 30} more sessions"
        
        prompt = f"""Analyze and create a comprehensive study schedule for the following study plan for the course "{course_name}".

Study Plan Details:
- Start Date: {start_date.strftime('%B %d, %Y')}
- End Date: {end_date.strftime('%B %d, %Y')}
- Total Sessions: {len(sessions)}
- Duration: {(end_date - start_date).days} days

Study Sessions:
{sessions_text}

Please create a comprehensive, actionable study schedule that includes:

1. **📋 Plan Overview**: 
   - Summary of the study plan structure
   - Total duration and session count
   - Overall learning objectives

2. **📅 Weekly Schedule Table**: 
   Create a clear weekly breakdown showing:
   - Week number and dates
   - Topics covered that week
   - Recommended study hours per week
   - Key milestones for each week
   Use a table format if possible.

3. **🗓️ Daily Study Routine**:
   - Suggested daily schedule (morning/afternoon/evening)
   - Optimal study times based on the plan
   - Break recommendations
   - Review session timing

4. **📚 Topic Grouping & Learning Path**:
   - Group related topics together
   - Suggest logical learning sequences
   - Identify prerequisite relationships
   - Recommended order for complex topics

5. **🎯 Study Strategy by Topic Category**:
   For each major topic group, provide:
   - Recommended study approach
   - Key concepts to master
   - Practice activities
   - Time allocation per topic

6. **✅ Milestone Checkpoints**:
   - Weekly review dates
   - Self-assessment points
   - Progress evaluation schedule
   - Important deadlines to remember

7. **⏰ Time Management Schedule**:
   - How to allocate time across topics
   - When to review vs. learn new material
   - Daily/weekly time distribution
   - Buffer time for difficult topics

8. **💡 Study Techniques & Tips**:
   - Active learning methods for this plan
   - Memory retention strategies
   - Note-taking recommendations
   - Practice and application suggestions

Format your response using Markdown with:
- Clear headings and sections
- Tables for weekly schedules (if applicable)
- Bullet points for easy reading
- Actionable, specific recommendations
- Dates and timelines where relevant

Make it practical and easy to follow day-by-day."""
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an educational assistant that creates detailed, actionable study schedules and plans. Use markdown formatting with clear sections, tables, and bullet points."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        return response.choices[0].message.content.strip()
        
    except ImportError:
        return "OpenAI library not installed. Please install it with: pip install openai"
    except Exception as e:
        # Return error message but don't crash
        return f"Error generating explanation: {str(e)}\n\nPlease check your OpenAI API key and try again."

