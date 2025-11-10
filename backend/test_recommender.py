import os
from openai import OpenAI
from typing import List, Dict, Any
from datetime import datetime

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def generate_test_study_plan(
    course_name: str,
    test_name: str,
    test_date: datetime,
    topics: List[str],
    days_until_test: int,
    existing_weaknesses: List[str] = None
) -> str:
    """
    Generate AI-powered study plan recommendations based on test date and topics.
    """
    
    weaknesses_text = ""
    if existing_weaknesses and len(existing_weaknesses) > 0:
        weaknesses_text = f"\n\nAreas where you need more practice: {', '.join(existing_weaknesses)}"
    
    topics_text = ", ".join(topics) if topics and len(topics) > 0 else "all course topics"
    
    prompt = f"""You are an expert study planner. Create a personalized study plan for a student preparing for a test.

Course: {course_name}
Test: {test_name}
Test Date: {test_date.strftime('%B %d, %Y')}
Days Until Test: {days_until_test}
Topics to Cover: {topics_text}{weaknesses_text}

Based on the time remaining until the test, create a detailed study plan that:
1. Prioritizes topics based on importance and difficulty
2. Allocates study time efficiently across the available days
3. Includes review sessions for previously covered material
4. Suggests specific study techniques (active recall, practice problems, concept mapping, etc.)
5. Includes buffer time for final review before the test
6. Adapts the intensity based on days remaining (more intensive if less time, more spread out if more time)

Format your response as a clear, actionable study plan with:
- Daily breakdown of what to study
- Recommended study duration per day
- Specific study methods for each topic
- Practice recommendations
- Review schedule

Be specific and practical. If there are fewer than 7 days, focus on intensive review and practice. If there are more than 14 days, create a more gradual learning plan."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an expert educational advisor who creates personalized, effective study plans."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating test study plan: {str(e)}")
        # Fallback response
        days_per_topic = max(1, days_until_test // max(1, len(topics) if topics else 1))
        return f"""**Study Plan for {test_name}**

**Time Remaining:** {days_until_test} days

**Recommended Study Schedule:**

1. **Days 1-{max(1, days_until_test // 3)}**: Focus on understanding core concepts
   - Review lecture notes and textbook chapters
   - Create summary notes for each topic
   - Allocate {max(2, days_until_test // 6)} hours per day

2. **Days {max(2, days_until_test // 3 + 1)}-{max(1, 2 * days_until_test // 3)}**: Practice and application
   - Work through practice problems
   - Take practice quizzes
   - Review past assignments
   - Allocate {max(2, days_until_test // 6)} hours per day

3. **Days {max(1, 2 * days_until_test // 3 + 1)}-{days_until_test}**: Final review
   - Review all topics
   - Focus on weak areas
   - Take full practice tests if available
   - Allocate {max(3, days_until_test // 4)} hours per day

**Study Tips:**
- Use active recall: test yourself without looking at notes
- Space out your study sessions (don't cram)
- Take breaks every 45-60 minutes
- Get adequate sleep before the test
- Review the day before, but don't overstudy

**Topics to Cover:** {topics_text}
"""

