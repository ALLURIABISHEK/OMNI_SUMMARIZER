import os
import secrets
import uuid
import tempfile
import base64
import requests
import replicate
import torch
import cv2
from PIL import Image
from io import BytesIO
import threading
import time
import traceback

from flask import Flask, request, jsonify, render_template, session, send_file
from db_helper import insert_interaction
from db_helper import insert_text_summary
from db_helper import get_connection



# Import existing modules for text/PDF summarization
from LOGIC.text_summarize import generate_summary, save_to_database
from LOGIC.pdf_summarizer import (
    extract_text_from_pdf, 
    summarize_text, 
    ask_question_about_text, 
    create_pdf_from_text, 
    text_to_speech,
    save_extracted_text,
    get_extracted_text
)

# Import image summarization modules
from LOGIC.blip_model import summarize_image
from LOGIC.vit_gpt2 import vit_summarize

from LOGIC.git_model import summarize_with_git
from LOGIC.gemini_story import generate_summaries
from LOGIC.llava_summary import generate_summary_from_clip_gpt2


app = Flask(__name__)

# Configure secret key for session (required)
app.secret_key = secrets.token_hex(32)  # Randomly generated key

# Upload folder setup
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Replicate client setup
client = replicate.Client(api_token="")

# Database configuration for image summarizer
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "RadhaBhaskar@1",
    "database": "image_summarizer_db"
}
#another API KEY "#AIzaSyCaysB15oEdu9CV5y2v3szm9fF0uzTBgNw ""
# API key for Google Gemini
API_KEY = os.getenv("GEMINI_API_KEY", "")
API_URL = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={API_KEY}"

# Hugging Face API key
HUGGINGFACE_API_KEY = ""

#################################
# Helper Functions for Image Processing
#################################

def process_image(file_path, prompt):
    """Send image to Gemini API with a specific prompt."""
    try:
        with open(file_path, "rb") as file:
            image_data = file.read()
            base64_image = base64.b64encode(image_data).decode("utf-8")

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {"inline_data": {"mime_type": "image/jpeg", "data": base64_image}}
                    ]
                }
            ]
        }

        headers = {"Content-Type": "application/json"}
        response = requests.post(API_URL, json=payload, headers=headers)

        if response.status_code == 200:
            result = response.json()
            return result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "No response available")
        else:
            return f"Error: {response.status_code} - {response.text}"

    except Exception as e:
        return f"Error: {str(e)}"

def save_summary_to_database(image_data, summary):
    """Save image and summary to MySQL database."""
    try:
        # Uncomment when MySQL connector is available
        # conn = mysql.connector.connect(**DB_CONFIG)
        # cursor = conn.cursor()
        # query = """INSERT INTO summaries (image, summary) VALUES (%s, %s)"""
        # cursor.execute(query, (image_data, summary))
        # conn.commit()
        # cursor.close()
        # conn.close()
        print(f"Saved summary to database: {summary[:50]}...")
    except Exception as e:
        print(f"Database Error: {str(e)}")

def save_analysis_to_database(image_data, category, text, question=None):
    """Save image, category (caption/VQA), and text to MySQL database."""
    try:
        # Uncomment when MySQL connector is available
        # conn = mysql.connector.connect(**DB_CONFIG)
        # cursor = conn.cursor()
        # query = """INSERT INTO image_analysis (image, category, text, question) VALUES (%s, %s, %s, %s)"""
        # cursor.execute(query, (image_data, category, text, question))
        # conn.commit()
        # cursor.close()
        # conn.close()
        print(f"Saved analysis to database: {category}, {text[:50]}...")
    except Exception as e:
        print(f"Database Error: {str(e)}")

#################################
# New Helper Functions for Video Summarizer
#################################

def extract_key_frames(video_path):
    """Extract key frames from video and return them as base64 images."""
    cap = cv2.VideoCapture(video_path)
    frames = []
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    interval = max(frame_count // 5, 1)

    for i in range(5):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i * interval)
        ret, frame = cap.read()
        if ret:
            _, buffer = cv2.imencode('.jpg', frame)
            frames.append(base64.b64encode(buffer).decode('utf-8'))
    cap.release()
    return frames

def analyze_video_with_gemini(video_path, mode):
    """Analyze the video file with Gemini based on the mode (summary or notes)."""
    prompt_text = ""
    
    if mode == "summary":
        prompt_text = "Summarize this video in 3-5 lines. Return a clean summary only."
    elif mode == "notes":
        prompt_text = "Create a point-wise list of the key information and important points from this video. Format as short, clear bullet points. Return only the bullet points without explanations."
    else:
        return "Invalid analysis mode"

    try:
        with open(video_path, "rb") as video_file:
            video_data = video_file.read()
            
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt_text
                        },
                        {
                            "inline_data": {
                                "mime_type": "video/mp4",
                                "data": base64.b64encode(video_data).decode("utf-8")
                            }
                        }
                    ]
                }
            ]
        }

        headers = {"Content-Type": "application/json"}
        response = requests.post(API_URL, json=payload, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            return result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "No result available")
        else:
            return f"Error: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Failed to analyze video: {str(e)}"

#################################
# Routes for Original App (Text/PDF)
#################################

@app.route('/')
def home():
    return render_template('HOME.html')

@app.route('/text-summarizer')
def text_summarizer_page():
    return render_template('TEXT_SUMMARIZER.html')

@app.route('/pdf-summarizer')
def pdf_summarizer_page():
    # Initialize session with a unique ID if not already present
    if 'pdf_session_id' not in session:
        session['pdf_session_id'] = str(uuid.uuid4())
    return render_template('PDF_SUMMARIZER.html')



@app.route("/summarize", methods=["POST"])
def summarize():
    # Text summarization part
    if request.is_json:
        data = request.json
        text = data.get("text", "").strip()
        summary_type = data.get("type", "short").lower()  # "short", "points", or "both"

        if not text:
            return jsonify({"error": "No text provided"}), 400

        # Generate both summaries (you can adapt generate_summary to handle these)
        short_summary = generate_summary(text, "short")
        points_summary = generate_summary(text, "points")

        # Store in a separate table for text summaries
        insert_text_summary(original_text=text, short_summary=short_summary, points_summary=points_summary)

        # Return requested summary type
        if summary_type == "short":
            return jsonify({"summary": short_summary})
        elif summary_type == "points":
            return jsonify({"summary": points_summary})
        else:  # both
            return jsonify({
                "short_summary": short_summary,
                "points_summary": points_summary
            })

    # Image summarization part
    elif "file" in request.files:
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
                file.save(temp_file.name)
                temp_filename = temp_file.name

            summary = process_image(temp_filename, "Describe the following image in 6-8 sentences:")

            with open(temp_filename, "rb") as img_file:
                image_data = img_file.read()

            # Store in DB (image summarization)
            insert_interaction(image_data=image_data, summary=summary, caption=None, question=None, answer=None, section='image_summarization', model_used='GEMINI')

            return jsonify({"result": summary})

        finally:
            if os.path.exists(temp_filename):
                os.remove(temp_filename)

    return jsonify({"error": "Invalid request"}), 400




@app.route("/summarize_pdf", methods=["POST"])
def summarize_pdf():
    if "pdf" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    pdf_file = request.files["pdf"]
    if pdf_file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    
    # Get session ID or create new one
    session_id = session.get('pdf_session_id')
    if not session_id:
        session_id = str(uuid.uuid4())
        session['pdf_session_id'] = session_id
    
    file_path = os.path.join(UPLOAD_FOLDER, pdf_file.filename)
    pdf_file.save(file_path)

    # Extract text from PDF
    extracted_text = extract_text_from_pdf(file_path)
    
    # Save text to file instead of session
    text_file_path, _ = save_extracted_text(extracted_text, session_id)
    
    # Get summary
    summary = summarize_text(extracted_text)
    
    return jsonify({
        "summary": summary,
        "text_available": True,
        "session_id": session_id
    })

@app.route("/ask_question", methods=["POST"])
def ask_question():
    if "file" in request.files and "question" in request.form:
        file = request.files["file"]
        question = request.form["question"]

        if file.filename == "" or question.strip() == "":
            return jsonify({"error": "No file or question provided"}), 400

        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
                file.save(temp_file.name)
                temp_filename = temp_file.name

            answer = process_image(temp_filename, f"Answer this question based on the image: {question}")

            with open(temp_filename, "rb") as img_file:
                image_data = img_file.read()

            insert_interaction(image_data=image_data, summary=None, caption=None, question=question, answer=answer, section='VQA', model_used='GEMINI')

            return jsonify({"result": answer})

        finally:
            if os.path.exists(temp_filename):
                os.remove(temp_filename)

    # ... (rest of your PDF question code unchanged)

    # Otherwise, it's a PDF question request
    try:
        data = request.get_json()
        question = data.get("question", "").strip()
        
        if not question:
            return jsonify({"error": "No question provided."}), 400
        
        # Get session ID
        session_id = session.get('pdf_session_id')
        if not session_id:
            return jsonify({"error": "Session expired. Please upload your PDF again."}), 400
        
        # Get text from file
        extracted_text = get_extracted_text(session_id)
        if not extracted_text:
            return jsonify({"error": "No PDF text available. Upload a PDF first."}), 400
        
        # Get answer
        answer = ask_question_about_text(extracted_text, question)
        return jsonify({"answer": answer})
    except Exception as e:
        print(f"Exception in ask_question: {str(e)}")
        return jsonify({"error": f"Error processing question: {str(e)}"}), 500

@app.route("/create_pdf", methods=["POST"])
def create_pdf():
    data = request.get_json()
    text_content = data.get("text", "").strip()

    if not text_content:
        return jsonify({"error": "No text provided."}), 400

    pdf_path = create_pdf_from_text(text_content)
    return jsonify({"pdf_url": f"/download_pdf?file={os.path.basename(pdf_path)}"})

@app.route("/download_pdf")
def download_pdf():
    file_name = request.args.get("file")
    file_path = os.path.join(UPLOAD_FOLDER, file_name)

    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404
    
    return send_file(file_path, as_attachment=True)

@app.route("/text_to_speech", methods=["GET"])
def text_to_speech_route():
    # Get session ID
    session_id = session.get('pdf_session_id')
    if not session_id:
        return jsonify({"error": "Session expired. Please upload your PDF again."}), 400
    
    # Get text from file
    extracted_text = get_extracted_text(session_id)
    if not extracted_text:
        return jsonify({"error": "No text available to convert."}), 400
    
    audio_path = text_to_speech(extracted_text)
    return send_file(audio_path, as_attachment=True)

#################################
# Routes for Image Summarization
#################################

@app.route('/image-summarizer')
def image_summarizer_page():
    return render_template('IMAGE_SUMMARIZER.html')

@app.route("/generate_caption", methods=["POST"])
def generate_caption():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            file.save(temp_file.name)
            temp_filename = temp_file.name

        caption = process_image(temp_filename, "Generate a short caption for the following image:")

        with open(temp_filename, "rb") as img_file:
            image_data = img_file.read()

        insert_interaction(image_data=image_data, summary=None, caption=caption, question=None, answer=None, section='caption_generation', model_used='GEMINI')

        return jsonify({"result": caption})

    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)



from db_helper import insert_interaction  # Make sure this is imported

@app.route("/blip_summarize", methods=["POST"])
def blip_summarize_route():
    try:
        if "file" not in request.files:
            print("🚨 No 'file' key in request.files!")
            return jsonify({"error": "No image provided"}), 400
        
        image_file = request.files["file"]
        image_path = os.path.join(UPLOAD_FOLDER, image_file.filename)
        image_file.save(image_path)
        
        print(f"✅ Image saved: {image_path}")

        # Perform summarization
        summary = summarize_image(image_path)

        # Read image data as BLOB
        with open(image_path, "rb") as img_file:
            image_data = img_file.read()

        # Insert interaction into DB
        insert_interaction(
            image_data=image_data,
            summary=summary,
            caption=None,
            question=None,
            answer=None,
            section="image_summarization",
            model_used="BLIP-2"
        )
        
        return jsonify({"result": summary})
    
    except Exception as e:
        print(f"❌ Error in BLIP summarization: {str(e)}")
        return jsonify({"error": str(e)}), 500

    finally:
        # Clean up saved file if it exists
        if os.path.exists(image_path):
            os.remove(image_path)


@app.route("/vit_summarize", methods=["POST"])
def vit_summarize_route():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            file.save(temp_file.name)
            temp_filename = temp_file.name

        print(f"✅ Processing VIT-GPT2 for image: {temp_filename}")
        
        summary = vit_summarize(temp_filename)

        with open(temp_filename, "rb") as img_file:
            image_data = img_file.read()

        # Insert into DB
        insert_interaction(
            image_data=image_data,
            summary=summary,
            caption=None,
            question=None,
            answer=None,
            section="image_summarization",
            model_used="VIT-GPT2"
        )
        
        print(f"✅ VIT-GPT2 summary generated and saved")
        return jsonify({"result": summary})
    
    except Exception as e:
        print(f"❌ Error in VIT-GPT2 route: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)

# Add a timeout handler for the GIT model============================================================
@app.route("/git_summarize", methods=["POST"])
def summarize_git():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            file.save(temp_file.name)
            temp_filename = temp_file.name

        summary = summarize_with_git(temp_filename)

        with open(temp_filename, "rb") as img_file:
            image_data = img_file.read()

        insert_interaction(
            image_data=image_data,
            summary=summary,
            caption=None,
            question=None,
            answer=None,
            section="image_summarization",
            model_used="GIT"
        )

        return jsonify({"result": summary})
    
    except Exception as e:
        print(f"❌ Error in GIT summarize route: {str(e)}")
        return jsonify({"error": str(e)}), 500

    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
            
@app.route("/generate_summary_from_clip_gpt2", methods=["POST"])
def clip_gpt2_summary_endpoint():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            file.save(temp_file.name)
            temp_filename = temp_file.name

        summary = generate_summary_from_clip_gpt2(temp_filename)

        with open(temp_filename, "rb") as img_file:
            image_data = img_file.read()

        insert_interaction(
            image_data=image_data,
            summary=summary,
            caption=None,
            question=None,
            answer=None,
            section="image_summarization",
            model_used="CLIP-GPT2"
        )

        return jsonify({'result': summary})
    
    except Exception as e:
        print(f"❌ Error in CLIP-GPT2 summarize route: {str(e)}")
        return jsonify({"error": str(e)}), 500
    
    finally:
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
@app.route("/generate_summaries", methods=["POST"])
def generate_image_summaries():
    if "image1" not in request.files:
        return jsonify({"error": "No images uploaded"}), 400

    images = {f"image{i}": request.files[f"image{i}"] for i in range(1, 5) if f"image{i}" in request.files}
    result = generate_summaries(images, API_KEY)
    
    # We return summaries, but they will NOT be shown to the user
    return jsonify(result)

@app.route("/generate_story", methods=["POST"])
def generate_story():
    data = request.json
    summaries = data.get("summaries", [])

    if not summaries or len(summaries) < 4:
        return jsonify({"error": "Invalid summaries data"}), 400

    # Construct prompt for Gemini to generate a story
    story_prompt = "Create a connected short story based on these descriptions:\n\n in simple language" + "\n\n".join(summaries)

    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": story_prompt}]}]
    }

    response = requests.post(url, headers=headers, json=payload)
    result = response.json()

    if response.status_code == 200 and "candidates" in result:
        story_text = result["candidates"][0]["content"]["parts"][0]["text"]  # Extract generated story
        return jsonify({"story": story_text})
    else:
        error_message = result.get("error", {}).get("message", "Failed to generate story")
        return jsonify({"error": error_message}), 500

@app.route('/summarize-image', methods=['POST'])
def summarize_image_live():
    try:
        data = request.get_json()
        image_data = data['image'].split(',')[1]  # Get base64 part only
        image = Image.open(BytesIO(base64.b64decode(image_data)))
        
        # Run your summarization logic here...
        summary = "This is a dummy summary of the image"

        return jsonify({'summary': summary})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

#################################
# Routes for Video Summarizer
#################################

@app.route('/video-summarizer')
def video_summarizer_page():
    return render_template('VIDEO_SUMMARIZER.html')

@app.route('/favicon.ico')
def favicon():
    return '', 204  # No content response

@app.route("/summarize_video", methods=["POST"])
def summarize_video():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_file:
            file.save(temp_file.name)
            temp_filename = temp_file.name

        video_summary = analyze_video_with_gemini(temp_filename, "summary")
        frames = extract_key_frames(temp_filename)

        response_data = {
            "summary": video_summary,
            "keyframes": frames
        }

        return jsonify(response_data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if 'temp_filename' in locals() and os.path.exists(temp_filename):
            os.remove(temp_filename)

@app.route("/notes", methods=["POST"])
def generate_notes():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_file:
            file.save(temp_file.name)
            temp_filename = temp_file.name

        video_notes = analyze_video_with_gemini(temp_filename, "notes")

        response_data = {
            "notes": video_notes
        }

        return jsonify(response_data)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        if 'temp_filename' in locals() and os.path.exists(temp_filename):
            os.remove(temp_filename)



#'''///////////////////////////////////////////////////////////histiry ============
@app.route("/get_text_summary_history", methods=["GET"])
def get_text_summary_history():
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id, original_text, short_summary, points_summary, created_at FROM text_summarization_history ORDER BY created_at DESC")
        rows = cursor.fetchall()

        history = []
        for row in rows:
            history.append({
                "id": row["id"],
                "text": row["original_text"],
                "short_summary": row["short_summary"],
                "points_summary": row["points_summary"],
                "timestamp": row["created_at"].strftime("%Y-%m-%d %H:%M:%S") if row["created_at"] else ""
            })

        return jsonify(history)

    

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
@app.route("/delete_text_summary/<int:id>", methods=["DELETE"])
def delete_text_summary(id):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM text_summarization_history WHERE id = %s", (id,))
        conn.commit()

        return jsonify({"message": "Deleted successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    app.run(debug=True, port=5001)