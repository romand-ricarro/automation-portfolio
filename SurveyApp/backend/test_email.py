# /Users/romand/Documents/GitHub/SurveyApp/backend/test_email.py
import os
from dotenv import load_dotenv
from services.email_service import send_test_email

load_dotenv()
# Change this to your authenticated Resend email
result = send_test_email("tools@foodstyles.com") 
print(result)