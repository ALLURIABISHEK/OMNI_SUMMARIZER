import os
import uuid
import fitz  # PyMuPDF
import google.generativeai as genai
from fpdf import FPDF
from gtts import gTTS

# Configure Gemini API Key
GEMINI_API_KEY = "AIzaSyDO3et-LfhuEam-shGzgrkU0umdvgGrqhE"
genai.configure(api_key=GEMINI_API_KEY)

# Folder to store uploaded files
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Extract text from PDF
def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = "".join(page.get_text("text") for page in doc)
    return text if text.strip() else "No text found."

# Store extracted text in a file and return the file path
def save_extracted_text(text, session_id=None):
    if not session_id:
        session_id = str(uuid.uuid4())
    
    file_path = os.path.join(UPLOAD_FOLDER, f"extracted_text_{session_id}.txt")
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(text)
    
    return file_path, session_id

# Get text from a stored file
def get_extracted_text(session_id):
    file_path = os.path.join(UPLOAD_FOLDER, f"extracted_text_{session_id}.txt")
    
    if not os.path.exists(file_path):
        return None
    
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()

# Summarize text using Gemini API
def summarize_text(text):
    model = genai.GenerativeModel("gemini-1.5-flash")
    response = model.generate_content(f"Summarize this: {text}")
    return response.text if response.text else "Error summarizing."

# Answer question using Gemini API
def ask_question_about_text(text, question):
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(f"Based on this text: {text}, answer this question: {question}")
        return response.text if response.text else "I couldn't find an answer."
    except Exception as e:
        return f"Error while processing the question: {str(e)}"

def create_pdf_from_text(text_content):
    pdf_path = os.path.join(UPLOAD_FOLDER, "Created_Document.pdf")
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.multi_cell(0, 10, text_content)
    pdf.output(pdf_path)
    return pdf_path

# Text-to-Speech conversion
def text_to_speech(text):
    tts = gTTS(text=text, lang="en")
    audio_path = os.path.join(UPLOAD_FOLDER, "summary.mp3")
    tts.save(audio_path)
    return audio_path