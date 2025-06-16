import requests
import os
import mysql.connector

# MySQL Database Configuration
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "text_summarizer1_db"
}

# Google Gemini API Configuration
API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyBEUiNw8LTcxQocL7a2uZdaChkD8QlaBLM")
API_URL = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={API_KEY}"

def generate_summary(text, summary_type):
    """Generate summary using Gemini API."""
    if summary_type == "points":
        prompt = f"Summarize the following text into clear bullet points:\n\n{text}\n\nFormat it as:\n- Point 1\n- Point 2\n- Point 3"
    else:
        prompt = f"Provide a short summary of the following text:\n\n{text}"

    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    headers = {"Content-Type": "application/json"}

    response = requests.post(API_URL, json=payload, headers=headers)

    if response.status_code == 200:
        result = response.json()
        return result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "No summary available")
    else:
        return f"Error: {response.status_code} - {response.text}"

def save_to_database(text, summary, summary_type):
    """Save user input and generated summary to MySQL database."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        query = """
            INSERT INTO summaries (input_text, summary_type, output_summary, timestamp) 
            VALUES (%s, %s, %s, NOW())
        """  
        cursor.execute(query, (text, summary_type, summary))
        conn.commit()
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Database Error: {str(e)}")
