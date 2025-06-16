import os
import tempfile
import requests
import base64
import cv2
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# API Configuration
API_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyAHO8XdOU6EzMcviNCtLc3ML1DkH0rSGjE")
API_URL = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={API_KEY}"

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

@app.route('/')
def index():
    return render_template('index.html')

@app.route("/summarize", methods=["POST"])
def summarize():
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

# Add a favicon route to prevent 404 errors
@app.route('/favicon.ico')
def favicon():
    return '', 204  # No content response

if __name__ == "__main__":
    app.run(debug=True)