from flask import Flask, render_template, request, redirect, url_for, jsonify, session
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import uuid
from document_processor import process_document, generate_quiz, answer_question

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'  # Change this for production
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# In-memory databases (replace with real DB in production)
users = {}
study_materials = {}

@app.route('/')
def index():
    if 'username' in session:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        
        if not username or not password:
            return render_template('register.html', error="Username and password are required")
        
        if username in users:
            return render_template('register.html', error="Username already exists")
        
        users[username] = {'password': password, 'materials': []}
        session['username'] = username
        return redirect(url_for('dashboard'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()
        
        if username not in users or users[username]['password'] != password:
            return render_template('login.html', error="Invalid username or password")
        
        session['username'] = username
        return redirect(url_for('dashboard'))
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('index'))

@app.route('/dashboard')
def dashboard():
    if 'username' not in session:
        return redirect(url_for('login'))
    
    username = session['username']
    user_materials = users.get(username, {}).get('materials', [])
    
    return render_template('dashboard.html', 
                         username=username, 
                         materials=user_materials)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Validate form data
        start_date = request.form.get('start_date')
        end_date = request.form.get('end_date')
        daily_hours = float(request.form.get('daily_hours', 2))
        
        if not start_date or not end_date:
            return jsonify({'error': 'Start and end dates are required'}), 400
        
        # Handle file upload
        file = request.files.get('file')
        url = request.form.get('url', '').strip()
        
        if not file and not url:
            return jsonify({'error': 'Either file or URL is required'}), 400
        
        # Process the document
        if url:
            filepath = url
        else:
            if file.filename == '':
                return jsonify({'error': 'No selected file'}), 400
            
            # Validate file extension
            filename = secure_filename(file.filename)
            if '.' not in filename or filename.rsplit('.', 1)[1].lower() not in {'pdf', 'docx', 'txt'}:
                return jsonify({'error': 'Invalid file type'}), 400
            
            # Save file
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"{uuid.uuid4()}_{filename}")
            file.save(filepath)
        
        # Process document and create study plan
        processed_data = process_document(filepath, start_date, end_date, daily_hours)
        
        # Store material
        material_id = str(uuid.uuid4())
        material_info = {
            'id': material_id,
            'filename': url if url else file.filename,
            'filepath': filepath,
            'start_date': start_date,
            'end_date': end_date,
            'daily_hours': daily_hours,
            'processed_data': processed_data,
            'created_at': datetime.now().isoformat()
        }
        
        username = session['username']
        if username not in users:
            users[username] = {'password': '', 'materials': []}
        
        users[username]['materials'].append(material_info)
        study_materials[material_id] = material_info
        
        return jsonify({
            'success': True,
            'material_id': material_id,
            'study_plan': processed_data['study_plan']
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/get_study_plan')
def get_study_plan():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    material_id = request.args.get('material_id')
    if not material_id:
        return jsonify({'error': 'Material ID required'}), 400
    
    if material_id not in study_materials:
        return jsonify({'error': 'Material not found'}), 404
    
    try:
        return jsonify({
            'success': True,
            'study_plan': study_materials[material_id]['processed_data']['study_plan']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f"Failed to load study plan: {str(e)}"
        }), 500

@app.route('/ask', methods=['POST'])
def ask_question():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        material_id = request.form.get('material_id')
        question = request.form.get('question', '').strip()
        
        if not material_id:
            return jsonify({'error': 'Material ID required'}), 400
        if not question:
            return jsonify({'error': 'Question cannot be empty'}), 400
        
        if material_id not in study_materials:
            return jsonify({'error': 'Material not found'}), 404
        
        answer = answer_question(study_materials[material_id]['filepath'], question)
        
        return jsonify({
            'success': True,
            'question': question,
            'answer': answer
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/generate_quiz', methods=['POST'])
def generate_quiz_route():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        material_id = request.form.get('material_id')
        difficulty = request.form.get('difficulty', 'medium')
        
        if not material_id:
            return jsonify({'error': 'Material ID required'}), 400
        
        if material_id not in study_materials:
            return jsonify({'error': 'Material not found'}), 404
        
        quiz = generate_quiz(study_materials[material_id]['filepath'], difficulty)
        
        return jsonify({
            'success': True,
            'quiz': quiz,
            'difficulty': difficulty
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/get_videos', methods=['POST'])
def get_videos():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        topic = request.form.get('topic', '').strip()
        language = request.form.get('language', 'en')
        
        if not topic:
            return jsonify({'error': 'Topic is required'}), 400
        
        # Mock video data - replace with real API calls in production
        mock_videos = {
            'math': [
                {'title': "Algebra Basics", 'url': "https://youtube.com/math1", 'channel': "Math Channel"},
                {'title': "Calculus Introduction", 'url': "https://youtube.com/math2", 'channel': "Math World"}
            ],
            'science': [
                {'title': "Physics Fundamentals", 'url': "https://youtube.com/science1", 'channel': "Science Hub"},
                {'title': "Chemistry Basics", 'url': "https://youtube.com/science2", 'channel': "Science Lab"}
            ],
            'history': [
                {'title': "World History", 'url': "https://youtube.com/history1", 'channel': "History Channel"},
                {'title': "Ancient Civilizations", 'url': "https://youtube.com/history2", 'channel': "History Today"}
            ]
        }
        
        # Simple topic matching
        topic_lower = topic.lower()
        videos = []
        
        for category in mock_videos:
            if category in topic_lower:
                videos.extend(mock_videos[category])
        
        if not videos:  # Default to math videos if no match
            videos = mock_videos.get('math', [])
        
        return jsonify({
            'success': True,
            'videos': videos[:3],  # Return max 3 videos
            'topic': topic,
            'language': language
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/feedback', methods=['POST'])
def get_feedback():
    if 'username' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        material_id = request.form.get('material_id')
        
        if not material_id:
            return jsonify({'error': 'Material ID required'}), 400
        
        if material_id not in study_materials:
            return jsonify({'error': 'Material not found'}), 404
        
        material = study_materials[material_id]
        start_date = datetime.strptime(material['start_date'], '%Y-%m-%d')
        end_date = datetime.strptime(material['end_date'], '%Y-%m-%d')
        total_days = (end_date - start_date).days
        days_passed = (datetime.now() - start_date).days
        progress = min(100, max(0, int((days_passed / total_days) * 100)))
        
        feedback = {
            'progress': progress,
            'days_remaining': max(0, total_days - days_passed),
            'estimated_completion': material['end_date'],
            'on_track': progress >= (days_passed / total_days) * 100,
            'suggestions': [
                "Review your notes regularly",
                "Complete all practice quizzes",
                "Watch recommended videos for difficult topics"
            ]
        }
        
        return jsonify({
            'success': True,
            'feedback': feedback
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True)