import os

# Generate a secret key
SECRET_KEY = os.urandom(24).hex()

# Upload folder configuration
UPLOAD_FOLDER = 'static/uploads'

# OpenAI API Key (replace with your actual key)
OPENAI_API_KEY = 'your-openai-api-key-here'