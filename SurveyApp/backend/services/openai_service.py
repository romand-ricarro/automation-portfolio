import os
import time
import logging
from openai import OpenAI
import json

logger = logging.getLogger('insightpulse.openai_service')

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

MAX_RETRIES = 3
INITIAL_DELAY = 1


def call_openai_with_retry(messages, model="gpt-4o", max_tokens=2000):
    """
    Helper function to call OpenAI with retry logic and exponential backoff.
    """
    delay = INITIAL_DELAY
    for attempt in range(MAX_RETRIES):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            if attempt == MAX_RETRIES - 1:
                logger.error(f"Error calling OpenAI after {MAX_RETRIES} attempts: {e}")
                raise e
            logger.warning(f"Attempt {attempt + 1} failed. Retrying in {delay} seconds...")
            time.sleep(delay)
            delay *= 2


def get_prompt_from_template(slug: str, variables: dict) -> str:
    """
    Get rendered prompt from database template, with fallback to hardcoded.
    """
    try:
        from services.prompt_service import render_template
        return render_template(slug, variables)
    except Exception as e:
        logger.warning(f"Failed to load template '{slug}' from database, using fallback: {e}")
        return None


def analyze_question(question, responses):
    """
    Step 1: Analyze Each Open-Ended Question
    Uses customizable prompt template from database.
    """
    if not responses:
        return "No responses to analyze."

    responses_text = "\n".join([f"- {r}" for r in responses])
    count = len(responses)

    # Try to get prompt from database template
    variables = {
        'question_name': question,
        'responses': responses,
        'response_count': count,
    }

    prompt = get_prompt_from_template('question_analysis', variables)

    # Fallback to hardcoded prompt if template not available
    if not prompt:
        prompt = f"""You are assisting a manager in analyzing survey responses. For the following survey question and responses, please:

1. Summarize the main trends by grouping similar responses together.
2. Enumerate the exact number of respondents who shared each similar answer.
3. Ensure the total number of respondents in your analysis matches the total number of responses provided.
4. Present the findings in bullet form, specifying the number of respondents for each point.
5. Avoid miscalculations, misunderstandings, overcomplications, and misinterpretations by carefully reviewing each response and basing your analysis strictly on the information provided.
6. After the findings, provide a key insight.
7. Keep the insights concise and directly related to the data.
8. Make sure that subpoints are elaborate and clearly indicate and explain the issues mentioned by the respondents.

Format your response using markdown for readability:
- Use **bold** for each theme/category name (e.g., **Technical Skills:**)
- Use bullet points (-) for individual findings under each theme
- Include the respondent count in each bullet (e.g., "3 respondents mentioned...")
- End with "**Key Insight:** " followed by the insight on its own line
- Add a blank line between different themes/sections

Make sure to use simple and easy-to-understand language.
By reading the summary, I should clearly understand each bucket without needing to visit or re-read the actual responses.
Also, don't mention entry numbers—just include the number of mentions per bucket. No need to add dates or anything else.

Survey Question: {question}

Responses to analyse:
{responses_text}

Total respondents: {count}"""

    messages = [
        {"role": "user", "content": prompt}
    ]

    return call_openai_with_retry(messages, model="gpt-4o", max_tokens=2000)


def generate_common_issues_table(analyses):
    """
    Step 2: Create Common Issues Table
    Uses customizable prompt template from database.
    """
    if not analyses:
        return "No analyses to synthesize."

    # Combine all question analyses
    combined_analyses = "\n\n---\n\n".join(analyses)

    # Try to get prompt from database template
    variables = {
        'analyses': combined_analyses,
    }

    prompt = get_prompt_from_template('common_issues', variables)

    # Fallback to hardcoded prompt if template not available
    if not prompt:
        prompt = f"""Create a common issue table using the following survey analysis as data. We will put the info in a table for easier analysis.

{combined_analyses}

Format as a table with:
- Column 1: Common Issue (the main theme)
- Column 2: Evidence/Signal (supporting details)

Make it clear and structured."""

    messages = [
        {"role": "user", "content": prompt}
    ]

    return call_openai_with_retry(messages, model="gpt-4o", max_tokens=2000)