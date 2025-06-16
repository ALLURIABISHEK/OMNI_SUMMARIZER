import mysql.connector
from mysql.connector import Error
from datetime import datetime

# ✅ DB configuration (update if deployed on different environment)
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'RadhaBhaskar@1',
    'database': 'omni_summarizer'
}

def get_connection():
    return mysql.connector.connect(**db_config)

def insert_interaction(image_data=None, summary=None, caption=None, question=None, answer=None, section=None, model_used=None):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        sql = """
        INSERT INTO image_summary_interactions
        (image_data, summary, caption, question, answer, section, model_used, timestamp)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """

        timestamp = datetime.now()
        values = (image_data, summary, caption, question, answer, section, model_used, timestamp)

        cursor.execute(sql, values)
        conn.commit()
        print(f"✅ Inserted interaction for model: {model_used} at {timestamp}")

    except Error as e:
        print(f"❌ Database Error: {e}")

def insert_text_summary(original_text, short_summary, points_summary):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        sql = """
        INSERT INTO text_summarization_history
        (original_text, short_summary, points_summary)
        VALUES (%s, %s, %s)
        """
        cursor.execute(sql, (original_text, short_summary, points_summary))
        conn.commit()

    except Exception as e:
        print(f"❌ Error inserting text summary: {e}")

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
