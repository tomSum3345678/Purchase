
from flask import Flask, send_file, request, jsonify
from flask_cors import CORS  # Import CORS
from gradio_client import Client
import librosa
import soundfile as sf
from io import BytesIO
from PIL import Image

import base64
import os
import io
import tempfile
from datetime import datetime
import random

from supabase import create_client, Client as SupabaseClient

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

#client = Client("hon9kon9ize/Cantonese-TTS-playground")
client = Client("keshav6936/GENAI-TTS-Text-to-Speech")

@app.route('/sound/<path:text>')
def generate_sound(text):
    # Generate speech
    # result = client.predict(
    #     text=text,
    #     voice_name="mk_girl",
    #     custom_audio=None,
    #     custom_prompt_text=None,
    #     api_name="/generate_speech"
    # )
    result = client.predict(
		text=text,
		voice="zh-HK-HiuMaanNeural - zh-HK (Female)",
		rate=30,
		pitch=3,
		api_name="/predict"
)
    
    # Assuming result is a file path
    file_path = result[0]  # Adjust if result structure is different
    
    # Load audio file with librosa, and set the target sample rate
    y, sr = librosa.load(file_path, sr=48000)  # Load audio, resample to 48kHz
    
    # Save the modified audio to a temporary file
    temp_file_path = "temp_audio.wav"
    sf.write(temp_file_path, y, 48000)  # Write to file with new sample rate
    
    # Allow CORS for this specific route
    response = send_file(temp_file_path, as_attachment=True)
    response.headers.add("Access-Control-Allow-Origin", "*")  # Allow all origins
    return response



# Initialize Supabase client
supabase_url = 'https://ebvecgyezvakcxlegspv.supabase.co'
supabase_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVidmVjZ3llenZha2N4bGVnc3B2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NjQxMzgsImV4cCI6MjA1NTU0MDEzOH0.0-SY6Q80nuVeg4_Cqi76V7P2eWvYBOrv8q0WUp4eo_0'
supabase: SupabaseClient = create_client(supabase_url, supabase_key)

@app.route('/upload', methods=['POST'])
def img_submit():
    if request.method == 'POST':
        data = request.json.get('image')
        os.makedirs("supabaseimagetmp1", exist_ok=True)
        try:
            byte_data = base64.b64decode(data)
            image_data = BytesIO(byte_data)
            img = Image.open(image_data)

          
          
          # Generate three random integers
            random_integers = f"{random.randint(100, 999)}"  # Generates a random integer between 100 and 999

            # Generate the timestamp
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S%f')[:-3]  # Get timestamp in YYYYMMDDHHMMSSSSS format
            
            temp_file_path2 = 'product_'+random_integers+timestamp+'.png'
            temp_file_path = "supabaseimagetmp1/"+temp_file_path2
            img.save(temp_file_path)

            # Upload to Supabase
            with open(temp_file_path, 'rb') as file:
                response = supabase.storage.from_("image").upload(temp_file_path2, file, file_options={'content-type':"image/png"})
      


            # Delete the local image file after upload
            os.remove(temp_file_path)

            # return jsonify({'status': 'success', 'message': 'Image uploaded successfully.', 'data': response}), 200
            public_url = supabase.storage.from_("image").get_public_url(temp_file_path2)

            return jsonify({
                'status': 'success',
                'message': 'Image uploaded successfully.',
                'data': {
                    'response': response,
                    'publicUrl': public_url
                }
            }), 200
        except Exception as e:
            return jsonify({'status': 'error', 'message': str(e)}), 400

    return jsonify({'status': 'error', 'message': 'Invalid request method.'}), 405



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)