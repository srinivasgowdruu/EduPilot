import os
import google.generativeai as genai
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from flask import Flask, jsonify, request, Response # Added 'request'
from sqlalchemy import inspect, text
from flask_cors import CORS
from dotenv import load_dotenv
import json
import re
from flask import send_file # For sending the file response
import io
import traceback
from xhtml2pdf import pisa
from markdown import markdown
from markdown_it import MarkdownIt
import PyPDF2
from docx import Document as DocxDocument
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime # For date handling if needed, though strings are simpler for DB
from flask_jwt_extended import create_access_token, jwt_required, JWTManager, get_jwt_identity
from flask_bcrypt import Bcrypt
from flask import request, jsonify

# Initialize Flask app
app = Flask(__name__)
CORS(
    app,
    # Try a pattern that explicitly matches multiple path segments
    resources={r"/api/.*": { # Use ".*" regex for zero or more characters
        "origins": ["http://localhost:5173"]
        }
    },
    allow_headers=["Authorization", "Content-Type"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    supports_credentials=True
)
# CORS(app)
# Load environment variables from .env file
load_dotenv()

# --- API Key Configuration ---
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
YOUTUBE_API_KEY = os.getenv('YOUTUBE_API_KEY')

if not GEMINI_API_KEY:
    raise ValueError("Missing Gemini API Key in .env file")
if not YOUTUBE_API_KEY:
    raise ValueError("Missing YouTube API Key in .env file")

# --- Initialize Services ---
# Configure Gemini client
genai.configure(api_key=GEMINI_API_KEY)
gemini_model = genai.GenerativeModel('gemini-3.5-flash-lite') # Or 'gemini-pro'

# Function to build YouTube service (avoids building it globally)
def get_youtube_service():
    return build('youtube', 'v3', developerKey=YOUTUBE_API_KEY)


# --- Database Configuration ---
# Define the base directory of the backend folder
basedir = os.path.abspath(os.path.dirname(__file__))
# Configure the SQLite database URI
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'study_plan.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Disable modification tracking overhead

# Initialize SQLAlchemy with the Flask app
db = SQLAlchemy(app)

# --- Initialize Extensions ---
bcrypt = Bcrypt(app) # For password hashing
jwt = JWTManager(app) # For JWT handling

# --- Configure JWT ---
# You MUST set a secret key for JWT. Use a strong, random secret in production.
# For local dev, you can use a simple one, but keep it secret.
# Store it in your .env file for better practice.
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "your-super-secret-jwt-key-change-me") # Add JWT_SECRET_KEY to your .env
# Configure token expiration time (optional, default is 15 minutes)
# app.config["JWT_ACCESS_TOKEN_EXPIRES"] = datetime.timedelta(hours=1)

# --- Define Database Models ---

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False) # Store hashed password

    # Relationship to saved sessions (one-to-many)
    # 'lazy=True' means sessions are loaded only when accessed
    # 'cascade="all, delete-orphan"' means deleting a user deletes their sessions
    sessions = db.relationship('SavedSession', backref='user', lazy=True, cascade="all, delete-orphan")

    def __repr__(self):
        return f'<User {self.username}>'


# --- NEW: SavedSession Model ---
class SavedSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    topic = db.Column(db.String(200), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    summary = db.Column(db.Text, nullable=True)
    youtube_videos = db.Column(db.Text, nullable=True) # Store as JSON string
    quiz_questions = db.Column(db.Text, nullable=True) # Store as JSON string
    flashcards = db.Column(db.Text, nullable=True) # Store as JSON string
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Foreign Key to link to the User model
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def __repr__(self):
        return f'<SavedSession {self.id}: {self.topic} by User {self.user_id}>'

# --- Update Database Creation ---
with app.app_context():
    print("Checking/Creating database tables...")
    db.create_all() # This will now create User, StudyPlanEntry, and SavedSession if they don't exist
    print("Database tables checked/created.")

# --- Define Database Model ---
class StudyPlanEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    topic = db.Column(db.String(200), nullable=False)
    review_date = db.Column(db.String(10), nullable=False) # Store date as YYYY-MM-DD string
    plan_data = db.Column(db.Text, nullable=True) # Store study/rest plan as JSON string
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    def __repr__(self):
        return f'<StudyPlanEntry {self.id}: {self.topic} on {self.review_date}>'

class QuizAttempt(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id'),
        nullable=False,
        index=True
    )

    session_id = db.Column(
        db.Integer,
        db.ForeignKey('saved_session.id'),
        nullable=False,
        index=True
    )

    topic = db.Column(
        db.String(200),
        nullable=False
    )

    score = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    total_questions = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    percentage = db.Column(
        db.Float,
        nullable=False,
        default=0.0
    )

    difficulty = db.Column(
        db.String(20),
        nullable=False,
        default='medium'
    )

    answers = db.Column(
        db.Text,
        nullable=True
    )  # JSON string containing user's answers

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    
# --- Create Database Tables (Run Once) ---
# This context ensures the app context is available for db operations
with app.app_context():
    # Check if the database file exists, if not create tables
    # A more robust approach might use Flask-Migrate, but this is simpler for local dev
    if not os.path.exists(os.path.join(basedir, 'study_plan.db')):
         print("Database not found, creating tables...")
         db.create_all()
         print("Database tables created.")
    else:
         # Ensure tables exist even if file exists (e.g., if model changed)
         # This won't hurt if tables are already there
         db.create_all()
         print("Database tables checked/ensured.")

# --- End Database Configuration ---

def ensure_column_exists(table_name, column_name, column_type, engine=None):
    """Ensure a SQLite table has a specific column, creating it if missing."""
    target_engine = engine or db.engine
    if target_engine.dialect.name != 'sqlite':
        return False

    inspector = inspect(target_engine)
    columns = {column['name'] for column in inspector.get_columns(table_name)}
    if column_name in columns:
        return True

    with target_engine.begin() as connection:
        connection.execute(text(f'ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}'))
    return True


with app.app_context():
    from sqlalchemy import inspect, text
    ensure_column_exists('study_plan_entry', 'plan_data', 'TEXT')
    print('Ensured study_plan_entry.plan_data column exists.')

# --- Helper Functions ---
def generate_gemini_content(prompt_text):
    """Calls the Gemini API and handles potential errors."""
    try:
        response = gemini_model.generate_content(prompt_text)
        # Handling potential safety blocks or empty responses
        if response.parts:
             return response.text
        else:
             # If response.parts is empty, check prompt_feedback for block reason
             if response.prompt_feedback.block_reason:
                 return f"Content generation blocked: {response.prompt_feedback.block_reason}"
             else:
                 return "Error: Received empty response from AI."
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return f"Error generating content: {e}" # Return error message


def get_fallback_quiz(notes_text, count=5):
    cleaned = re.sub(r"\s+", " ", notes_text or "").strip()
    if not cleaned:
        return []

    sentences = [sentence.strip() for sentence in re.split(r"(?<=[.!?])\s+", cleaned) if sentence.strip()]
    if not sentences:
        sentences = [cleaned]

    questions = []
    for index, sentence in enumerate(sentences):
        compact = re.sub(r"\s+", " ", sentence).strip()
        if not compact:
            continue

        core_phrase = compact[:120]
        questions.append({
            "question": f"What is the main idea discussed in this section?",
            "options": [
                core_phrase,
                "A summary of the uploaded document",
                "A general topic unrelated to the notes",
                "An empty response"
            ],
            "correct_answer": core_phrase,
            "explanation": f"This answer is based on the uploaded notes: {compact[:160]}"
        })

        if len(questions) >= count:
            break

    if len(questions) < count:
        compact = cleaned[:180]
        while len(questions) < count:
            questions.append({
                "question": f"What is the main idea discussed in this section?",
                "options": [
                    compact,
                    "A summary of the uploaded document",
                    "A general topic unrelated to the notes",
                    "An empty response"
                ],
                "correct_answer": compact,
                "explanation": f"This answer is based on the uploaded notes: {compact}"
            })

    return questions


def get_fallback_flashcards(notes_text, count=6):
    cleaned = re.sub(r"\s+", " ", notes_text or "").strip()
    if not cleaned:
        return []

    sentences = [sentence.strip() for sentence in re.split(r"(?<=[.!?])\s+", cleaned) if sentence.strip()]
    if not sentences:
        sentences = [cleaned]

    flashcards = []
    for sentence in sentences:
        compact = re.sub(r"\s+", " ", sentence).strip()
        if not compact:
            continue

        words = re.findall(r"[A-Za-z][A-Za-z0-9-]{2,}", compact)
        term = words[0] if words else compact[:30]
        flashcards.append({
            "term": term,
            "definition": compact[:180]
        })

        if len(flashcards) >= count:
            break

    if len(flashcards) < count:
        words = re.findall(r"[A-Za-z][A-Za-z0-9-]{2,}", cleaned)
        while len(flashcards) < count:
            term = words[len(flashcards)] if len(flashcards) < len(words) else "Key Concept"
            flashcards.append({
                "term": term,
                "definition": cleaned[:180]
            })

    return flashcards


def extract_json_payload(raw_text):
    """Extract and parse JSON from AI responses that may include markdown fences or surrounding text."""
    if raw_text is None:
        return None
    if isinstance(raw_text, (dict, list)):
        return raw_text

    text = str(raw_text).strip()
    if not text:
        return None

    candidates = [text]

    fenced_blocks = re.findall(r"```(?:json)?\s*(.*?)\s*```", text, flags=re.IGNORECASE | re.DOTALL)
    for block in fenced_blocks:
        candidate = block.strip()
        if candidate:
            candidates.append(candidate)

    for candidate in candidates:
        try:
            return json.loads(candidate)
        except (TypeError, json.JSONDecodeError):
            pass

        decoder = json.JSONDecoder()
        for index, char in enumerate(candidate):
            if char not in '[{':
                continue
            try:
                value, _ = decoder.raw_decode(candidate[index:])
                return value
            except (TypeError, json.JSONDecodeError, ValueError):
                continue

    return None


def get_fallback_notes(extracted_text):
    cleaned = re.sub(r"\s+", " ", extracted_text or "").strip()
    if not cleaned:
        return "No readable content was found in the uploaded file."

    sentences = [sentence.strip() for sentence in re.split(r"(?<=[.!?])\s+", cleaned) if sentence.strip()]
    if not sentences:
        sentences = [cleaned]

    bullet_notes = []
    for sentence in sentences[:8]:
        compact = re.sub(r"\s+", " ", sentence).strip()
        if compact:
            bullet_notes.append(f"- {compact}")

    return "\n".join(bullet_notes) if bullet_notes else cleaned


def get_fallback_summary(extracted_text):
    cleaned = re.sub(r"\s+", " ", extracted_text or "").strip()
    if not cleaned:
        return "No content available."
    return cleaned[:800] + ("..." if len(cleaned) > 800 else "")


def build_study_plan(topic, total_minutes, study_minutes=25, break_minutes=5):
    """Create a simple study plan with alternating study and break blocks."""
    if total_minutes <= 0:
        return []

    if study_minutes <= 0:
        study_minutes = 25
    if break_minutes < 0:
        break_minutes = 0

    plan = []
    remaining = total_minutes
    index = 0

    while remaining > 0:
        if index % 2 == 0:
            block_minutes = min(study_minutes, remaining)
            plan.append({
                "topic": topic,
                "type": "study",
                "minutes": block_minutes,
                "label": f"Study {block_minutes} min"
            })
            remaining -= block_minutes
        else:
            if break_minutes > 0 and remaining > 0:
                block_minutes = min(break_minutes, remaining)
                plan.append({
                    "topic": topic,
                    "type": "break",
                    "minutes": block_minutes,
                    "label": f"Break {block_minutes} min"
                })
                remaining -= block_minutes
            else:
                break
        index += 1

    return plan


def search_youtube(query, max_results=5):
    """Searches YouTube and returns a list of video details."""
    try:
        youtube = get_youtube_service()
        search_response = youtube.search().list(
            q=query,
            part='snippet',
            maxResults=max_results,
            type='video'
        ).execute()

        videos = []
        for search_result in search_response.get('items', []):
            video_id = search_result['id']['videoId']
            title = search_result['snippet']['title']
            thumbnail = search_result['snippet']['thumbnails']['medium']['url'] # medium quality thumbnail
            video_url = f'https://www.youtube.com/watch?v={video_id}'
            videos.append({
                'title': title,
                'thumbnail': thumbnail,
                'url': video_url,
                'id': video_id # Include id if needed later
            })
        return videos
    except HttpError as e:
        print(f"YouTube API Error: {e}")
        return [] # Return empty list on error
    except Exception as e:
        print(f"An error occurred with YouTube search: {e}")
        return [] # Return empty list on other errors


def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.md = MarkdownIt()
        self.current_style = ''
        try:
            font_path = os.path.join(os.path.dirname(__file__), 'fonts')
            self.add_font('DejaVu', '', os.path.join(font_path, 'DejaVuSans.ttf'), uni=True)
            self.add_font('DejaVu', 'B', os.path.join(font_path, 'DejaVuSans-Bold.ttf'), uni=True)
            self.add_font('DejaVu', 'I', os.path.join(font_path, 'DejaVuSans-Italic.ttf'), uni=True)
            self.set_font('DejaVu', '', 12)
            self.default_font = 'DejaVu'
            print("Successfully added DejaVu fonts.")
        except Exception as e:
            print(f"!!! Font Error: {e}. Could not load DejaVu fonts. Falling back to Arial.")
            self.set_font('Arial', '', 12)
            self.default_font = 'Arial'

def header(self):
        self.set_font(self.default_font, 'B', 15)
        title_w = self.get_string_width(self.title) + 6
        doc_w = self.w
        self.set_x((doc_w - title_w) / 2)
        self.cell(title_w, 10, self.title, border=0, ln=1, align='C')
        self.ln(10)
        self.set_font(self.default_font, '', 12)

def footer(self):
        self.set_y(-15)
        self.set_font(self.default_font, 'I', 8)
        self.set_text_color(128)
        self.cell(0, 10, 'Page ' + str(self.page_no()), 0, 0, 'C')
        self.set_text_color(0)

def set_font_style(self, style, size=12):
        self.set_font(self.default_font, style, size)
        self.current_style = style

def chapter_title(self, title):
        self.set_font_style('B', 14)
        self.cell(0, 6, title, 0, 1, 'L')
        self.ln(4)

def chapter_body(self, markdown_text):
        try:
            decoded_text = markdown_text.encode('latin-1', 'replace').decode('latin-1')
        except AttributeError:
            decoded_text = markdown_text

        tokens = self.md.parse(decoded_text)
        self.set_font_style('', 12)

        for token in tokens:
            if token.type == 'paragraph_open':
                pass
            elif token.type == 'paragraph_close':
                self.ln(2)
            elif token.type == 'inline':
                current_text = ''
                start_x = self.get_x()
                for child in token.children:
                    if child.type == 'text':
                        current_text += child.content
                    elif child.type == 'strong_open':
                        if current_text:
                            self.write_text(current_text)
                            current_text = ''
                        self.set_font_style('B', 12)
                    elif child.type == 'strong_close':
                        if current_text:
                            self.write_text(current_text)
                            current_text = ''
                        self.set_font_style('', 12)
                    elif child.type == 'em_open':
                        if current_text:
                            self.write_text(current_text)
                            current_text = ''
                        self.set_font_style('I', 12)
                    elif child.type == 'em_close':
                        if current_text:
                            self.write_text(current_text)
                            current_text = ''
                        self.set_font_style('', 12)
                if current_text:
                    self.write_text(current_text)
            elif token.type == 'heading_open' and token.tag == 'h2':
                self.ln(4)
                self.set_font_style('B', 14)
            elif token.type == 'heading_close' and token.tag == 'h2':
                self.set_font_style('', 12)
                self.ln(2)

def write_text(self, text):
        try:
            # Dynamic line height based on font size
            line_height = self.font_size_pt * 1.2 / self.k  # pt to mm
            self.write(line_height, text)
        except Exception as e:
            print(f"Error writing text chunk: {e}")
            self.write(5, "[Write Error]")

def add_quiz_question(self, index, q_data):
        available_width = self.w - self.l_margin - self.r_margin

        self.set_font_style('B', 12)
        question_text = q_data.get('question', 'N/A')
        self.multi_cell(available_width, 5, f"{index + 1}. {question_text}")
        self.ln(1)

        self.set_font_style('', 11)
        options = q_data.get('options', [])
        correct_answer = q_data.get('correct_answer', '')
        option_indent = 5
        option_prefix_width = 5

        for option in options:
            prefix = " " * 4
            if option == correct_answer:
                prefix += "✓ "
            else:
                prefix += "  "

            self.cell(option_indent + option_prefix_width, 5, prefix)
            self.multi_cell(available_width - (option_indent + option_prefix_width), 5, option)

        self.set_font_style('I', 10)
        explanation_text = q_data.get('explanation', 'N/A')
        self.set_x(self.l_margin + option_indent)
        self.multi_cell(available_width - option_indent, 5, f"Explanation: {explanation_text}")
        self.set_x(self.l_margin)
        self.ln(4)


def extract_text_from_uploaded_file(file_storage):
    filename = (file_storage.filename or '').lower()

    if not filename:
        raise ValueError("No file selected")

    file_storage.stream.seek(0)

    if filename.endswith(".pdf"):

        reader = PyPDF2.PdfReader(file_storage.stream)

        pages = []

        for page in reader.pages:
            pages.append(page.extract_text() or "")

        text = "\n".join(pages).strip()

    elif filename.endswith(".docx"):

        document = DocxDocument(file_storage.stream)

        text = "\n".join(
            paragraph.text
            for paragraph in document.paragraphs
            if paragraph.text.strip()
        )

    elif filename.endswith(".txt"):

        text = file_storage.stream.read().decode(
            "utf-8",
            errors="ignore"
        )

    else:

        raise ValueError(
            "Only PDF, DOCX and TXT files are supported."
        )

    if not text:

        raise ValueError(
            "No readable text found."
        )

    return text


@app.route("/api/upload-file", methods=["POST"])
@jwt_required()
def upload_file():

    current_user_id = int(get_jwt_identity())

    if "file" not in request.files:

        return jsonify(
            {
                "error":"No file uploaded."
            }
        ),400

    uploaded_file = request.files["file"]

    if uploaded_file.filename == "":

        return jsonify(
            {
                "error":"Please choose a file."
            }
        ),400

    try:

        extracted_text = extract_text_from_uploaded_file(uploaded_file)

        if len(extracted_text) > 20000:

            extracted_text = extracted_text[:20000]

        notes_prompt = f"""
You are an expert study assistant.

Read the document below and generate concise study notes in Markdown.
Focus on the most important ideas and key concepts, using headings and bullet points where appropriate.

Document:

{extracted_text}
"""

        summary_prompt = f"""
Write a short summary of the main study points from the document in 100 words or less.

Document:

{extracted_text}
"""

        combined_prompt = f"""
You are an expert study assistant.

Read the document below and generate BOTH:

1. STUDY NOTES
- Generate concise study notes in Markdown.
- Focus on the most important ideas and key concepts.
- Use headings and bullet points where appropriate.

2. SUMMARY
- Write a short summary of the main study points.
- Keep the summary under 100 words.

Return the response in exactly this format:

===NOTES===
[study notes here]

===SUMMARY===
[summary here]

Document:

{extracted_text}
"""

        combined_response = generate_gemini_content(combined_prompt)
        print("GEMINI COMBINED RESPONSE:", combined_response) # Debug log

        response_text = combined_response.strip()

        notes_marker = "===NOTES==="
        summary_marker = "===SUMMARY==="

        notes_start = response_text.find(notes_marker)
        summary_start = response_text.find(summary_marker)

        if notes_start != -1 and summary_start != -1 and summary_start > notes_start:
            notes = response_text[
                notes_start + len(notes_marker):summary_start
            ].strip()

            summary = response_text[
                summary_start + len(summary_marker):
            ].strip()

        else:
            # Support alternative marker formats returned by Gemini
            normalized_response = response_text.replace("---", "===")

            notes_start = normalized_response.find(notes_marker)
            summary_start = normalized_response.find(summary_marker)

            if (
                notes_start != -1
                and summary_start != -1
                and summary_start > notes_start
            ):
                notes = normalized_response[
                    notes_start + len(notes_marker):summary_start
                ].strip()

                summary = normalized_response[
                    summary_start + len(summary_marker):
                ].strip()
            else:
                notes = response_text
                summary = "Summary could not be generated separately."


        new_session = SavedSession(

            user_id=current_user_id,

            topic=uploaded_file.filename,

            notes=notes,

            summary=summary,

            youtube_videos=json.dumps([]),

            quiz_questions=None,

            flashcards=None
        )

        db.session.add(new_session)

        db.session.commit()

        return jsonify(

            {

                "session_id":new_session.id,

                "topic":uploaded_file.filename,

                "notes":notes,

                "summary":summary,

                "videos":[]

            }

        )

    except Exception as e:

        traceback.print_exc()

        return jsonify(

            {

                "error":str(e)

            }

        ),500

# --- Authentication API Routes ---

@app.route('/api/register', methods=['POST'])
def register():
    if not request.is_json:
        return jsonify({"msg": "Missing JSON in request"}), 400

    username = request.json.get('username', None)
    password = request.json.get('password', None)

    if not username or not password:
        return jsonify({"msg": "Missing username or password"}), 400

    # Check if user already exists
    user_exists = User.query.filter_by(username=username).first()
    if user_exists:
        return jsonify({"msg": "Username already exists"}), 409 # 409 Conflict

    # Hash the password using Bcrypt
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    # Create new user
    new_user = User(username=username, password_hash=hashed_password)
    try:
        db.session.add(new_user)
        db.session.commit()
        print(f"User registered: {username}")
        # Optionally log the user in immediately by creating a token
        # access_token = create_access_token(identity=new_user.id)
        # return jsonify(access_token=access_token), 201
        return jsonify({"msg": "User registered successfully"}), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error registering user: {e}")
        return jsonify({"msg": f"Registration failed: {str(e)}"}), 500


@app.route('/api/login', methods=['POST'])
def login():
    if not request.is_json:
        return jsonify({"msg": "Missing JSON in request"}), 400

    username = request.json.get('username', None)
    password = request.json.get('password', None)

    if not username or not password:
        return jsonify({"msg": "Missing username or password"}), 400

    # Find user
    user = User.query.filter_by(username=username).first()

    # Check if user exists and password is correct
    if user and bcrypt.check_password_hash(user.password_hash, password):
        # Create JWT access token - identity can be user ID or username
        access_token = create_access_token(identity=str(user.id))
        print(f"User logged in: {username}")
        return jsonify(access_token=access_token)
    else:
        return jsonify({"msg": "Bad username or password"}), 401 # 401 Unauthorized


# Example Protected Route - Get current user info
@app.route('/api/user/me', methods=['GET'])
@jwt_required() # This decorator protects the route
def get_current_user():
    current_user_id = get_jwt_identity() # Get user ID from the token
    user = User.query.get(current_user_id)
    if not user:
         return jsonify({"msg": "User not found"}), 404 # Should not happen if token is valid

    # Don't return password hash!
    return jsonify({
        "id": user.id,
        "username": user.username
        # Add any other user info you want to return
    })

# --- Keep other API routes (get-content, quiz, pdf, flashcards, planner, chat) ---
# We will modify these later to use authentication and save data.

@app.route('/api/sessions', methods=['GET'])
@jwt_required() # Make sure this is present and uncommented
def get_user_sessions():
    """Returns a list of saved sessions (id, topic, created_at) for the current user."""
    current_user_id_str = get_jwt_identity()
    try:
        current_user_id = int(current_user_id_str)
    except ValueError:
        return jsonify({"msg": "Invalid user identity"}), 422

    try:
        # Order by most recent first
        sessions = SavedSession.query.filter_by(user_id=current_user_id).order_by(SavedSession.created_at.desc()).all()
        session_list = [{
            "id": session.id,
            "topic": session.topic,
            "created_at": session.created_at.isoformat() # Use ISO format string
        } for session in sessions]
        print(f"Fetched {len(session_list)} sessions for user {current_user_id}") # Add log
        return jsonify(session_list)
    except Exception as e:
        print(f"Error fetching sessions for user {current_user_id}: {e}")
        return jsonify({"error": f"Failed to fetch sessions: {str(e)}"}), 500

@app.route('/api/sessions/<int:session_id>', methods=['GET'])
@jwt_required()
def get_session_details(session_id):
    """Returns the full data for a specific saved session belonging to the current user."""
    current_user_id_str = get_jwt_identity()
    try:
        current_user_id = int(current_user_id_str)
    except ValueError:
        return jsonify({"msg": "Invalid user identity"}), 422

    try:
        session = SavedSession.query.filter_by(id=session_id, user_id=current_user_id).first()

        if session is None:
            return jsonify({"error": "Session not found or access denied"}), 404

        # Parse JSON strings back into Python objects before sending
        # Add default empty list/dict if parsing fails or field is None
        try: videos = json.loads(session.youtube_videos) if session.youtube_videos else []
        except (json.JSONDecodeError, TypeError): videos = []

        try: quiz = json.loads(session.quiz_questions) if session.quiz_questions else []
        except (json.JSONDecodeError, TypeError): quiz = []

        try: flashcards_data = json.loads(session.flashcards) if session.flashcards else []
        except (json.JSONDecodeError, TypeError): flashcards_data = []


        print(f"Fetched details for session {session_id} for user {current_user_id}") # Add log
        return jsonify({
            "id": session.id,
            "topic": session.topic,
            "notes": session.notes,
            "summary": session.summary,
            "videos": videos,
            "quizQuestions": quiz, # Match frontend state name
            "flashcards": flashcards_data, # Match frontend state name
            "created_at": session.created_at.isoformat()
        })
    except Exception as e:
        print(f"Error fetching session {session_id} for user {current_user_id}: {e}")
        return jsonify({"error": f"Failed to fetch session details: {str(e)}"}), 500

# --- ADD THIS FUNCTION ---
@app.route('/api/sessions/<int:session_id>', methods=['DELETE'])
@jwt_required()
def delete_session(session_id):
    """Deletes a specific saved session belonging to the current user."""
    current_user_id_str = get_jwt_identity()
    try:
        current_user_id = int(current_user_id_str)
    except ValueError:
        return jsonify({"msg": "Invalid user identity"}), 422

    try:
        session = SavedSession.query.filter_by(id=session_id, user_id=current_user_id).first()

        if session is None:
            return jsonify({"error": "Session not found or access denied"}), 404

        db.session.delete(session)
        db.session.commit()
        print(f"Deleted session {session_id} for user {current_user_id}") # Add log
        return jsonify({"message": "Session deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting session {session_id} for user {current_user_id}: {e}")
        return jsonify({"error": f"Failed to delete session: {str(e)}"}), 500


# --- API Routes ---
@app.route('/api/test', methods=['GET'])
def test_connection():
    print("Test endpoint hit!")
    return jsonify({"message": "Backend connected successfully!"})

@app.route('/api/get-content', methods=['POST'])
@jwt_required() # Protect this route
def get_content():
    current_user_id_str = get_jwt_identity()
    try:
        current_user_id = int(current_user_id_str)
    except ValueError:
        return jsonify({"msg": "Invalid user identity in token"}), 422

    if not request.is_json: return jsonify({"error": "Request must be JSON"}), 400
    data = request.get_json()
    topic = data.get('topic')
    if not topic: return jsonify({"error": "Missing 'topic'"}), 400

    print(f"User {current_user_id} requested topic: {topic}")

    # --- Generate Content using Gemini ---
    # Prompt for detailed notes
    notes_prompt = f"""
    Generate detailed study notes for the topic: "{topic}".
    Structure the notes clearly with headings, bullet points, and explanations where appropriate.
    Assume the audience is a student trying to understand this topic.
    Focus on accuracy and clarity.
    """
    notes = generate_gemini_content(notes_prompt)

    # Prompt for a concise summary
    summary_prompt = f"""
    Provide a concise summary (2-4 paragraphs) of the main points for the topic: "{topic}".
    Highlight the key concepts and definitions.
    """
    # Alternatively, summarize the generated notes:
    # summary_prompt = f"Summarize the following notes concisely (2-4 paragraphs):\n\n{notes}"
    summary = generate_gemini_content(summary_prompt)

    # --- Search YouTube ---
    videos = search_youtube(topic)

    # --- Save to Database ---
    session_id = None
    try:
        new_session = SavedSession(
            user_id=current_user_id,
            topic=topic,
            notes=notes,
            summary=summary,
            # Store lists/dicts as JSON strings in the Text column
            youtube_videos=json.dumps(videos) if videos else None,
            # Quiz/Flashcards initially null, will be updated later
            quiz_questions=None,
            flashcards=None
        )
        db.session.add(new_session)
        db.session.commit()
        session_id = new_session.id # Get the ID of the newly created session
        print(f"Saved new session {session_id} for user {current_user_id}")
    except Exception as e:
        db.session.rollback()
        print(f"Error saving session for user {current_user_id}: {e}")
        # Decide if you should still return content even if saving fails
        # For now, we'll return content but maybe indicate save failure

    # --- Return Results ---
    return jsonify({
        "session_id": session_id, # Return the new ID
        "topic": topic, # Also return topic for consistency
        "notes": notes,
        "summary": summary,
        "videos": videos
    })
@app.route('/api/generate-quiz', methods=['POST'])
@jwt_required(optional=True)
def generate_quiz():
    current_user_id = None
    try:
        current_user_id_str = get_jwt_identity()
        if current_user_id_str is not None:
            current_user_id = int(current_user_id_str)
    except (ValueError, TypeError):
        current_user_id = None

    if not request.is_json: return jsonify({"error": "Request must be JSON"}), 400
    data = request.get_json()
    notes = data.get('notes')
    session_id = data.get('session_id') # Expect session_id from frontend
    difficulty = data.get('difficulty', 'medium')

    if difficulty not in ['easy', 'medium', 'hard']:
        difficulty = 'medium'

    if not notes: return jsonify({"error": "Missing 'notes'"}), 400
    if session_id is None: return jsonify({"error": "Missing 'session_id'"}), 400

    if current_user_id is None:
        fallback_user = User.query.order_by(User.id).first()
        if fallback_user is None:
            fallback_user = User(username='default-user', password_hash=bcrypt.generate_password_hash('temporary-password'))
            db.session.add(fallback_user)
            db.session.commit()
        current_user_id = fallback_user.id

    print(f"User {current_user_id} generating quiz for session {session_id}")


    # --- Generate Quiz Questions using Gemini ---
    # UPDATED, STRICTER PROMPT:
    quiz_prompt =f"""
        Create exactly 5 multiple-choice quiz questions based ONLY on the study notes provided below.

        IMPORTANT:
        - Every question must be directly supported by the study notes.
        - Do not use outside knowledge.
        - Do not introduce concepts that are not present in the notes.
        - Make all options relevant to the subject.
        - Provide exactly one correct answer for each question.
        - Provide a short explanation for each answer.

        QUIZ DIFFICULTY: {difficulty.upper()}

        Difficulty guidelines:
        - EASY: test fundamental definitions, basic facts, and straightforward understanding.
        - MEDIUM: test understanding, relationships, comparisons, and application of concepts from the notes.
        - HARD: test deeper understanding, distinctions between related concepts, reasoning, and application of concepts from the notes.

        STUDY NOTES:
        {notes}

        Return ONLY valid JSON in this format:

        [
        {{
            "question": "...",
            "options": ["...", "...", "...", "..."],
            "correct_answer": "...",
            "explanation": "..."
        }}
        ]
        """

    quiz_content_raw = generate_gemini_content(quiz_prompt) # Use the existing helper

    print(f"Raw AI response for quiz:\n{quiz_content_raw}") # Keep logging the raw response

    # --- Parse the Response ---
    try:
        if isinstance(quiz_content_raw, str) and quiz_content_raw.startswith("Error generating content"):
            raise ValueError("Gemini returned an error; using fallback quiz content.")

        extracted_payload = extract_json_payload(quiz_content_raw)
        if extracted_payload is None:
            raise ValueError("Could not find JSON list or object structure in the AI response.")

        if isinstance(extracted_payload, dict):
            questions = [extracted_payload]
        elif isinstance(extracted_payload, list):
            questions = extracted_payload
        else:
            raise ValueError("Parsed JSON is neither a list nor an object.")

        if not questions:
             raise ValueError("Parsed JSON list is empty.")

        # Check keys of the first question object
        required_keys = ["question", "options", "correct_answer", "explanation"]
        if not all(k in questions[0] for k in required_keys):
             missing_keys = [k for k in required_keys if k not in questions[0]]
             raise ValueError(f"Parsed JSON object missing required keys: {missing_keys}")

        print(f"Successfully parsed {len(questions)} quiz questions.")
    # --- Update Database ---
        try:
            session_to_update = SavedSession.query.filter_by(id=session_id, user_id=current_user_id).first()
            if session_to_update:
                session_to_update.quiz_questions = json.dumps(questions) # Store as JSON string
                db.session.commit()
                print(f"Updated session {session_id} with quiz questions.")
            else:
                print(f"Warning: Could not find session {session_id} for user {current_user_id} to save quiz.")
                # Decide how to handle: error or just return questions without saving?
                # Returning questions anyway for now.
        except Exception as e:
            db.session.rollback()
            print(f"Error updating session {session_id} with quiz: {e}")
            # Decide if this should prevent returning questions
        return jsonify(questions)
    

    except (json.JSONDecodeError, ValueError, TypeError) as e: # Catch different parsing/validation errors
        questions = get_fallback_quiz(notes)
        print(f"Using fallback quiz content because: {e}")
        try:
            session_to_update = SavedSession.query.filter_by(id=session_id, user_id=current_user_id).first()
            if session_to_update:
                session_to_update.quiz_questions = json.dumps(questions)
                db.session.commit()
        except Exception:
            db.session.rollback()
        return jsonify(questions)
    except Exception as e:
        # Catch any other unexpected errors
        error_message = f"An unexpected error occurred during quiz generation: {e}"
        print(error_message)
        print(f"Raw AI response was:\n{quiz_content_raw}")
        return jsonify({"error": error_message, "raw_response_snippet": quiz_content_raw[:500] + "..."}), 500

@app.route('/api/quiz-attempt', methods=['POST'])
@jwt_required()
def save_quiz_attempt():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()

        session_id = data.get('session_id')
        score = data.get('score')
        total_questions = data.get('total_questions')
        difficulty = data.get('difficulty', 'medium')
        answers = data.get('answers', [])

        if session_id is None or score is None or total_questions is None:
            return jsonify({
                "error": "session_id, score and total_questions are required"
            }), 400

        # Make sure the session belongs to the logged-in user
        session = SavedSession.query.filter_by(
            id=session_id,
            user_id=user_id
        ).first()

        if not session:
            return jsonify({
                "error": "Session not found or unauthorized"
            }), 404

        # Calculate percentage on the backend
        percentage = (
            (float(score) / float(total_questions)) * 100
            if total_questions > 0
            else 0
        )

        attempt = QuizAttempt(
            user_id=user_id,
            session_id=session_id,
            topic=session.topic,
            score=int(score),
            total_questions=int(total_questions),
            percentage=round(percentage, 2),
            difficulty=difficulty,
            answers=json.dumps(answers)
        )

        db.session.add(attempt)
        db.session.commit()

        return jsonify({
            "message": "Quiz attempt saved successfully",
            "attempt_id": attempt.id,
            "topic": attempt.topic,
            "score": attempt.score,
            "total_questions": attempt.total_questions,
            "percentage": attempt.percentage,
            "difficulty": attempt.difficulty
        }), 201

    except Exception as e:
        db.session.rollback()
        traceback.print_exc()

        return jsonify({
            "error": "Failed to save quiz attempt"
        }), 500

@app.route('/api/quiz-attempts', methods=['GET'])
@jwt_required()
def get_quiz_attempts():
    try:
        user_id = int(get_jwt_identity())

        attempts = (
            QuizAttempt.query
            .filter_by(user_id=user_id)
            .order_by(QuizAttempt.created_at.desc())
            .all()
        )

        return jsonify([
            {
                "id": attempt.id,
                "session_id": attempt.session_id,
                "topic": attempt.topic,
                "score": attempt.score,
                "total_questions": attempt.total_questions,
                "percentage": attempt.percentage,
                "difficulty": attempt.difficulty,
                "created_at": attempt.created_at.isoformat()
            }
            for attempt in attempts
        ]), 200

    except Exception as e:
        traceback.print_exc()

        return jsonify({
            "error": "Failed to fetch quiz attempts"
        }), 500

@app.route('/api/weak-topics', methods=['GET'])
@jwt_required()
def get_weak_topics():
    try:
        user_id = int(get_jwt_identity())

        # Get recent quiz attempts for this user
        attempts = (
            QuizAttempt.query
            .filter_by(user_id=user_id)
            .order_by(QuizAttempt.created_at.desc())
            .limit(10)
            .all()
        )

        if not attempts:
            return jsonify({
                "message": "Complete some quizzes first to analyze your weak topics.",
                "weak_topics": []
            }), 200

        performance_data = []

        for attempt in attempts:
            try:
                answers = json.loads(attempt.answers or "[]")
            except (json.JSONDecodeError, TypeError):
                answers = []

            performance_data.append({
                "topic": attempt.topic,
                "score": attempt.score,
                "total_questions": attempt.total_questions,
                "percentage": attempt.percentage,
                "difficulty": attempt.difficulty,
                "answers": answers
            })

        prompt = f"""
You are an AI learning performance analyst for an educational application.

Analyze the student's quiz performance below.

IMPORTANT RULES:
1. Use ONLY the provided quiz performance data.
2. Do not invent topics, questions, scores, or mistakes.
3. Identify concepts the student is repeatedly getting wrong.
4. Distinguish between strong areas and weak areas.
5. A single mistake should not automatically be treated as a major weakness.
6. Give higher importance to repeated mistakes across attempts.
7. Keep the analysis concise and useful for studying.

Student quiz performance:

{json.dumps(performance_data, indent=2)}

Return ONLY valid JSON in this exact structure:

{{
    "weak_topics": [
        {{
            "topic": "concept name",
            "reason": "short explanation",
            "priority": "high"
        }}
    ],
    "strong_topics": [
        {{
            "topic": "concept name",
            "reason": "short explanation"
        }}
    ],
    "overall_analysis": "short overall assessment"
}}

Priority must be one of:
"high", "medium", "low"
"""

        raw_response = generate_gemini_content(prompt)

        analysis = extract_json_payload(raw_response)

        if not analysis:
            return jsonify({
                "error": "Could not analyze quiz performance"
            }), 500

        return jsonify(analysis), 200

    except Exception as e:
        traceback.print_exc()

        return jsonify({
            "error": "Failed to analyze weak topics"
        }), 500

@app.route('/api/quiz-difficulty', methods=['GET'])
@jwt_required()
def get_quiz_difficulty():
    try:
        user_id = int(get_jwt_identity())

        attempts = (
            QuizAttempt.query
            .filter_by(user_id=user_id)
            .order_by(QuizAttempt.created_at.desc())
            .limit(3)
            .all()
        )

        # No history yet
        if not attempts:
            return jsonify({
                "difficulty": "medium",
                "reason": "Not enough quiz history yet."
            }), 200

        # Average performance from recent attempts
        average_percentage = sum(
            attempt.percentage for attempt in attempts
        ) / len(attempts)

        if average_percentage < 50:
            difficulty = "easy"
            reason = "Recent performance is below 50%, so the next quiz will focus on strengthening fundamentals."

        elif average_percentage < 75:
            difficulty = "medium"
            reason = "Recent performance is in the medium range, so the next quiz will maintain a balanced difficulty."

        else:
            difficulty = "hard"
            reason = "Recent performance is strong, so the next quiz will provide more challenging questions."

        return jsonify({
            "difficulty": difficulty,
            "average_percentage": round(average_percentage, 2),
            "attempts_analyzed": len(attempts),
            "reason": reason
        }), 200

    except Exception as e:
        traceback.print_exc()

        return jsonify({
            "error": "Failed to determine quiz difficulty"
        }), 500
    
@app.route('/api/generate-pdf', methods=['POST'])
def generate_pdf_route():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    notes_text = data.get('notes')
    quiz_data = data.get('quizQuestions') # List of {question, correct_answer, ...}
    topic = data.get('topic', 'Study Notes')

    if not notes_text:
        return jsonify({"error": "Missing 'notes' text to generate PDF"}), 400

    try:
        # --- Convert Markdown to HTML ---
        # Use extensions for better formatting (e.g., tables, fenced code blocks if needed later)
        notes_html = markdown(notes_text, extensions=['fenced_code', 'tables'])

        # --- Prepare Quiz HTML (Question & Answer only) ---
        quiz_html = ""
        if quiz_data and isinstance(quiz_data, list) and len(quiz_data) > 0:
            quiz_html += "<h2>Quiz Review</h2><ol>"
            for i, q in enumerate(quiz_data):
                question_text = q.get('question', 'N/A')
                # Convert potential markdown in question to HTML
                question_html = markdown(question_text, extensions=['fenced_code'])
                # Remove surrounding <p> tags markdown might add
                question_html = question_html.replace('<p>', '').replace('</p>', '').strip()

                correct_answer = q.get('correct_answer', 'N/A')
                # Convert potential markdown in answer to HTML
                answer_html = markdown(correct_answer, extensions=['fenced_code'])
                answer_html = answer_html.replace('<p>', '').replace('</p>', '').strip()

                quiz_html += f"<li><strong>Question:</strong> {question_html}<br/>"
                quiz_html += f"<strong>Answer:</strong> {answer_html}</li><br/>" # Add line break for spacing
            quiz_html += "</ol>"

        # --- Combine into Full HTML Document ---
        # Basic HTML structure with some CSS for styling
        # Using default serif font, easy to read. Add more CSS as needed.
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page {{ margin: 1in; }} /* Set page margins */
                body {{ font-family: Georgia, serif; font-size: 11pt; line-height: 1.4; }}
                h1 {{ font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 20px; }}
                h2 {{ font-size: 14pt; font-weight: bold; margin-top: 15px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 2px;}}
                p {{ margin-top: 0; margin-bottom: 10px; }}
                ul, ol {{ margin-left: 20px; margin-bottom: 10px;}}
                li {{ margin-bottom: 5px; }}
                strong, b {{ font-weight: bold; }}
                em, i {{ font-style: italic; }}
                pre {{ background-color: #f0f0f0; padding: 10px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; }}
                code {{ font-family: 'Courier New', monospace; background-color: #f0f0f0; padding: 1px 3px; border-radius: 3px;}}
                /* Add more styles as needed */
            </style>
        </head>
        <body>
            <h1>{topic}</h1>

            <h2>Study Notes</h2>
            {notes_html}

            {quiz_html}
        </body>
        </html>
        """

        # --- Generate PDF using xhtml2pdf ---
        result_buffer = io.BytesIO() # Create a buffer to hold PDF data

        # Convert HTML to PDF
        pisa_status = pisa.CreatePDF(
            src=io.StringIO(html_content), # Source HTML (as string IO)
            dest=result_buffer             # Destination buffer
        )

        # Check for errors
        if pisa_status.err:
            raise Exception(f"PDF Generation Error: {pisa_status.err}")

        # --- Send PDF Response ---
        result_buffer.seek(0) # Reset buffer position to the beginning

        safe_topic = re.sub(r'[^a-zA-Z0-9_]', '_', topic)
        download_filename = f"{safe_topic}_Study_Notes.pdf"

        # Use Flask Response object for more control over headers
        return Response(
            result_buffer.getvalue(), # Get bytes from buffer
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment;filename="{download_filename}"'
            }
        )

    except Exception as e:
        print(f"!!! PDF Generation Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate PDF: {str(e)}"}), 500
    
@app.route('/api/generate-flashcards', methods=['POST'])
@jwt_required(optional=True) # Protect
def generate_flashcards_route():
        current_user_id = None
        try:
            current_user_id_str = get_jwt_identity()
            if current_user_id_str is not None:
                current_user_id = int(current_user_id_str)
        except (ValueError, TypeError):
            current_user_id = None

        if not request.is_json: return jsonify({"error": "Request must be JSON"}), 400
        data = request.get_json()
        notes_text = data.get('notes')
        session_id = data.get('session_id') # Expect session_id

        if not notes_text: return jsonify({"error": "Missing 'notes'"}), 400
        if session_id is None: return jsonify({"error": "Missing 'session_id'"}), 400

        if current_user_id is None:
            fallback_user = User.query.order_by(User.id).first()
            if fallback_user is None:
                fallback_user = User(username='default-user', password_hash=bcrypt.generate_password_hash('temporary-password'))
                db.session.add(fallback_user)
                db.session.commit()
            current_user_id = fallback_user.id

        print(f"User {current_user_id} generating flashcards for session {session_id}")

        # --- Generate Flashcards using Gemini ---
        flashcard_prompt = f"""
        Analyze the following study notes and extract the most important key terms and their simple definitions.
        Generate a list of flashcards based ONLY on the provided text.
        Make the terms short and the definitions easy to understand.
        For each flashcard, provide:
        1. "term": The key term or concept (string, keep it concise).
        2. "definition": A clear and simple definition of the term based on the notes (string).

        Output the result ONLY as a valid JSON list where each element is an object with keys "term" and "definition".
        Aim for around 5-15 flashcards, focusing on the most important concepts.

        IMPORTANT: Do NOT include any introductory text, concluding remarks, code block markers (like ```json), or ANY characters whatsoever before the opening '[' or after the closing ']'. The entire response MUST be the JSON list itself.

        Study Notes:
        ---
        {notes_text}
        ---
        """

        flashcard_content_raw = generate_gemini_content(flashcard_prompt) # Reuse helper

        print(f"Raw AI response for flashcards:\n{flashcard_content_raw}")

        # --- Parse the Response (Similar to Quiz Parsing) ---
        try:
            if isinstance(flashcard_content_raw, str) and flashcard_content_raw.startswith("Error generating content"):
                raise ValueError("Gemini returned an error; using fallback flashcards.")

            extracted_payload = extract_json_payload(flashcard_content_raw)
            if extracted_payload is None:
                raise ValueError("Could not find JSON list structure in the AI response.")

            flashcards = extracted_payload
            if isinstance(flashcards, dict):
                flashcards = [flashcards]

            print(f"Attempting to parse extracted flashcard JSON:\n{flashcard_content_raw[:500]}")

            # Basic validation
            if not isinstance(flashcards, list):
                raise ValueError("Parsed JSON is not a list.")
            # Allow empty list as valid response
            if flashcards and not all(k in flashcards[0] for k in ["term", "definition"]):
                missing_keys = [k for k in ["term", "definition"] if k not in flashcards[0]]
                raise ValueError(f"Parsed JSON object missing required keys: {missing_keys}")

            print(f"Successfully parsed {len(flashcards)} flashcards.")
            
            # --- Update Database ---
            try:
                session_to_update = SavedSession.query.filter_by(id=session_id, user_id=current_user_id).first()
                if session_to_update:
                    session_to_update.flashcards = json.dumps(flashcards) # Store as JSON string
                    db.session.commit()
                    print(f"Updated session {session_id} with flashcards.")
                else:
                    print(f"Warning: Could not find session {session_id} for user {current_user_id} to save flashcards.")
            except Exception as e:
                db.session.rollback()
                print(f"Error updating session {session_id} with flashcards: {e}")

            return jsonify(flashcards) # Return generated flashcards

        except (json.JSONDecodeError, ValueError, TypeError) as e:
            flashcards = get_fallback_flashcards(notes_text)
            print(f"Using fallback flashcards because: {e}")
            try:
                session_to_update = SavedSession.query.filter_by(id=session_id, user_id=current_user_id).first()
                if session_to_update:
                    session_to_update.flashcards = json.dumps(flashcards)
                    db.session.commit()
            except Exception:
                db.session.rollback()
            return jsonify(flashcards)
        except Exception as e:
            error_message = f"An unexpected error occurred during flashcard generation: {e}"
            print(error_message)
            print(f"Raw AI response was:\n{flashcard_content_raw}")
            return jsonify({"error": error_message, "raw_response_snippet": flashcard_content_raw[:500] + "..."}), 500


@app.route('/api/download-flashcards', methods=['POST'])
def download_flashcards_route():
        """
        Endpoint to convert flashcard JSON data to a downloadable CSV file.
        Expects JSON payload: {"flashcards": [{ "term": "...", "definition": "..." }, ...]}
        """
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400

        data = request.get_json()
        flashcards = data.get('flashcards')
        topic = data.get('topic', 'flashcards') # Get topic for filename

        if not isinstance(flashcards, list):
            return jsonify({"error": "Invalid or missing 'flashcards' list in request body"}), 400

        try:
            # --- Generate CSV String ---
            # Simple CSV generation: Header + one line per card
            # Wrap fields in double quotes to handle potential commas within term/definition
            # Double up existing double quotes within fields to escape them
            csv_lines = ['"Term","Definition"'] # Header row
            for card in flashcards:
                term = str(card.get('term', '')).replace('"', '""') # Escape double quotes
                definition = str(card.get('definition', '')).replace('"', '""') # Escape double quotes
                csv_lines.append(f'"{term}","{definition}"')

            csv_data = "\n".join(csv_lines)

            # --- Send CSV Response ---
            safe_topic = re.sub(r'[^a-zA-Z0-9_]', '_', topic)
            download_filename = f"{safe_topic}_flashcards.csv"

            return Response(
                csv_data,
                mimetype='text/csv',
                headers={
                    "Content-Disposition": f"attachment;filename=\"{download_filename}\""
                }
            )
        except Exception as e:
            print(f"CSV Generation/Download Error: {e}")
            traceback.print_exc()
            return jsonify({"error": f"Failed to generate or download CSV: {str(e)}"}), 500

    # --- Keep the main entry point ---
    # if __name__ == '__main__':
    #    app.run(debug=True)

# --- Study Planner API Routes ---

@app.route('/api/study-plan', methods=['POST'])
@jwt_required()
def add_study_plan_entry():
    current_user_id = None # Initialize to None
    current_user_id_str = get_jwt_identity()
    print(f"--- ADD STUDY PLAN --- Raw JWT Identity: '{current_user_id_str}' (type: {type(current_user_id_str)})")

    if not current_user_id_str: # Check if it's None or empty string
        print("--- ADD STUDY PLAN --- JWT Identity is None or empty.")
        return jsonify({"msg": "Missing user identity in token"}), 401 # Or 422

    try:
        current_user_id = int(current_user_id_str)
        print(f"--- ADD STUDY PLAN --- Converted User ID (int): {current_user_id}")
    except (ValueError, TypeError) as e:
        print(f"--- ADD STUDY PLAN --- Error converting JWT identity '{current_user_id_str}' to int: {e}")
        return jsonify({"msg": "Invalid user identity format in token"}), 422

    if not isinstance(current_user_id, int):
        print(f"--- ADD STUDY PLAN --- CRITICAL: current_user_id is not an int after conversion attempts: {current_user_id} (type: {type(current_user_id)})")
        return jsonify({"msg": "Internal server error processing user identity"}), 500

    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    topic = data.get('topic')
    review_date_str = data.get('review_date')
    total_minutes = data.get('total_minutes')
    study_minutes = data.get('study_minutes', 25)
    break_minutes = data.get('break_minutes', 5)

    if not topic or not review_date_str:
        return jsonify({"error": "Missing 'topic' or 'review_date'"}), 400

    try:
        datetime.strptime(review_date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    if total_minutes is None:
        total_minutes = 60
    try:
        total_minutes = int(total_minutes)
        study_minutes = int(study_minutes)
        break_minutes = int(break_minutes)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid timing values."}), 400

    plan_blocks = build_study_plan(topic, total_minutes, study_minutes, break_minutes)

    try:
        ensure_column_exists('study_plan_entry', 'plan_data', 'TEXT')
        print(f"--- ADD STUDY PLAN --- Creating entry with topic: '{topic}', date: '{review_date_str}', user_id: {current_user_id}")
        new_entry = StudyPlanEntry(
            topic=topic,
            review_date=review_date_str,
            plan_data=json.dumps(plan_blocks),
            user_id=current_user_id
        )
        db.session.add(new_entry)
        db.session.commit()
        print(f"Added study plan entry: ID {new_entry.id} for User {current_user_id}")
        return jsonify({
            "id": new_entry.id,
            "topic": new_entry.topic,
            "review_date": new_entry.review_date,
            "plan": plan_blocks
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"--- ADD STUDY PLAN --- Database error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to add study plan entry (DB): {str(e)}"}), 500


@app.route('/api/study-plan', methods=['GET'])
@jwt_required()
def get_study_plan_entries():
    current_user_id_str = get_jwt_identity()
    try:
        current_user_id = int(current_user_id_str)
        print(f"--- GET STUDY PLAN --- Fetching plans for User ID: {current_user_id}") # Add/Confirm log
    except (ValueError, TypeError):
        print(f"--- GET STUDY PLAN --- Invalid JWT identity: {current_user_id_str}") # Add/Confirm log
        return jsonify({"msg": "Invalid user identity"}), 422
    try:
        # Order by review date, then by ID
        entries = StudyPlanEntry.query.filter_by(user_id=current_user_id).order_by(StudyPlanEntry.review_date, StudyPlanEntry.id).all()
        entries_list = []
        for entry in entries:
            try:
                plan_blocks = json.loads(entry.plan_data) if entry.plan_data else []
            except (json.JSONDecodeError, TypeError):
                plan_blocks = []
            entries_list.append({
                "id": entry.id,
                "topic": entry.topic,
                "review_date": entry.review_date,
                "plan": plan_blocks
            })
        print(f"--- GET STUDY PLAN --- Found {len(entries_list)} entries for User ID: {current_user_id}") # Add/Confirm log
        return jsonify(entries_list)
    except Exception as e:
        print(f"Error fetching study plan entries for user {current_user_id}: {e}")
        return jsonify({"error": f"Failed to fetch study plan entries: {str(e)}"}), 500


@app.route('/api/study-plan/<int:entry_id>', methods=['DELETE'])
@jwt_required()
def delete_study_plan_entry(entry_id):
    current_user_id_str = get_jwt_identity()
    try:
        current_user_id = int(current_user_id_str)
    except ValueError:
        return jsonify({"msg": "Invalid user identity"}), 422

    try:
        # *** Ensure filtering by user_id for security ***
        entry = StudyPlanEntry.query.filter_by(id=entry_id, user_id=current_user_id).first()
        if entry is None:
            return jsonify({"error": "Entry not found or access denied"}), 404

        db.session.delete(entry)
        db.session.commit()
        print(f"Deleted study plan entry ID: {entry_id}")
        return jsonify({"message": "Entry deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting study plan entry: {e}")
        return jsonify({"error": f"Failed to delete entry: {str(e)}"}), 500

# --- Keep the main entry point ---
# if __name__ == '__main__':
#    app.run(debug=True)

# --- Chatbot API Route ---

@app.route('/api/chat', methods=['POST'])
def chat_with_ai():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    user_message = data.get('message')
    notes_context = data.get('context') # The generated notes text

    if not user_message:
        return jsonify({"error": "Missing 'message' in request body"}), 400
    if not notes_context:
        # Allow chatting even without notes, but AI won't be grounded
        print("Warning: Chat request received without notes context.")
        # return jsonify({"error": "Missing 'context' (notes) in request body"}), 400 # Or handle gracefully

    print(f"Received chat message: {user_message}")
    # print(f"Using context length: {len(notes_context)}") # Optional: monitor context size

    # --- Construct Prompt for Gemini ---
    # Instruct the AI on its role, knowledge source, and limitations
    system_prompt = f"""
    You are a helpful AI study assistant and tutor. Your primary goal is to answer student questions based *only* on the provided study notes context.

    Follow these instructions strictly:
    1. Analyze the user's question: "{user_message}"
    2. Consult the provided "Study Notes Context" below to find the answer.
    3. If the answer is found in the notes, provide a clear and concise explanation based *only* on that information. Quote or reference parts of the notes if helpful.
    4. If the answer cannot be found *within the provided notes context*, clearly state that the information is not available in the current notes. Do NOT make up information or use external knowledge. Politely suggest asking a different question related to the notes or generating content on a relevant topic.
    5. Keep your answers focused and directly related to the user's question and the provided context.
    6. Be friendly and encouraging.

    Study Notes Context:
    ---
    {notes_context if notes_context else "No study notes were provided for context."}
    ---

    Now, please answer the user's question: "{user_message}"
    """

    try:
        # Use the same Gemini helper function
        # Consider potential length issues if notes_context is huge, but Gemini 1.5 handles large contexts
        ai_response_text = generate_gemini_content(system_prompt)

        print(f"AI chat response generated.")
        return jsonify({"response": ai_response_text})

    except Exception as e:
        error_message = f"An unexpected error occurred during chat generation: {e}"
        print(error_message)
        traceback.print_exc()
        return jsonify({"error": error_message}), 500

# --- Keep the main entry point ---
# if __name__ == '__main__':
#    app.run(debug=True)



# Main entry point
if __name__ == '__main__':
    app.run(debug=True) # Keep debug=True for development auto-reload