from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from PIL import Image
import io
import base64

app = FastAPI()

print("Loading CLIP Vision model...")
model = SentenceTransformer('clip-ViT-B-32')

print("Loading Text Embedding model...")
text_model = SentenceTransformer('all-MiniLM-L6-v2')


from transformers import pipeline, Wav2Vec2Processor, Wav2Vec2Model, BlipProcessor, BlipForConditionalGeneration
import torch
import librosa
import soundfile as sf

ai_detector = pipeline("image-classification", model="dima806/deepfake_vs_real_image_detection")

print("Loading Audio Model...")
audio_processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base")
audio_model = Wav2Vec2Model.from_pretrained("facebook/wav2vec2-base")

print("Loading InsightFace Model...")
import cv2
import numpy as np
from insightface.app import FaceAnalysis
face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=0, det_size=(640, 640))

print("Loading BLIP Captioning Model...")
blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")

print("Models loaded successfully!")

@app.post("/api/v1/embed")
async def embed_image(file: UploadFile = File(...)):

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # generate the dense 512-dimensional semantic embedding
        embedding = model.encode(image)
        
        # convert NumPy to list
        embedding_list = embedding.tolist()
        
 
        detection_results = ai_detector(image)
        ai_confidence = 0.0
        for res in detection_results:
            label = res['label'].lower()
            if label in ['artificial', 'fake', 'ai-generated', 'synthetic']:
                ai_confidence = res['score']
                break
            elif label in ['human', 'real', 'original'] and len(detection_results) == 1:
                ai_confidence = 1.0 - res['score']
        
        # Face extraction
        cv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        faces = face_app.get(cv_img)
        
        face_hashes = []
        if len(faces) > 0:
            face_hashes = [f.embedding.tolist() for f in faces]
        
        # Generate Caption
        inputs = blip_processor(image, return_tensors="pt")
        out = blip_model.generate(**inputs)
        caption = blip_processor.decode(out[0], skip_special_tokens=True)
        
        return {
            "semantic_hash": embedding_list,
            "ai_confidence_score": ai_confidence,
            "face_hashes": face_hashes,
            "caption": caption
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/embed_audio")
async def embed_audio(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        
        # Load audio using librosa from bytes
        audio, sr = librosa.load(io.BytesIO(contents), sr=16000)
        
        # Process and generate embeddings
        inputs = audio_processor(audio, sampling_rate=sr, return_tensors="pt")
        with torch.no_grad():
            outputs = audio_model(**inputs)
            
        # Average across time dimension to get a single vector per audio file
        embedding = outputs.last_hidden_state.mean(dim=1).squeeze().tolist()
        
        return {
            "audio_hash": embedding
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class TextPayload(BaseModel):
    text: str

@app.post("/api/v1/embed_text")
async def embed_text(payload: TextPayload):
    try:
        # generate the dense 384-dimensional semantic embedding for text
        embedding = text_model.encode(payload.text)
        embedding_list = embedding.tolist()
        
        return {
            "semantic_hash": embedding_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/embed_text_clip")
async def embed_text_clip(payload: TextPayload):
    try:
        # generate the dense 512-dimensional semantic embedding for text using CLIP
        embedding = model.encode(payload.text)
        embedding_list = embedding.tolist()
        
        return {
            "semantic_hash": embedding_list
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/compare")
async def compare_images(file1: UploadFile = File(...), file2: UploadFile = File(...)):
    try:
       
        c1 = await file1.read()
        c2 = await file2.read()
        
        
        nparr1 = np.frombuffer(c1, np.uint8)
        nparr2 = np.frombuffer(c2, np.uint8)
        
        img1 = cv2.imdecode(nparr1, cv2.IMREAD_COLOR)
        img2 = cv2.imdecode(nparr2, cv2.IMREAD_COLOR)
        
        if img1 is None or img2 is None:
            raise ValueError("Invalid image file format")
            
        img2_resized = cv2.resize(img2, (img1.shape[1], img1.shape[0]))
        
        diff = cv2.absdiff(img1, img2_resized)
        
        gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        
        _, mask = cv2.threshold(gray, 30, 255, cv2.THRESH_BINARY)
        
        red_overlay = np.zeros_like(img1)
        red_overlay[:] = (0, 0, 255) # BGR for Red
        
        changed_pixels = mask > 0
        
        # Blend the original image with the red overlay using alpha
        alpha = 0.6
        heatmap = img1.copy()
        heatmap[changed_pixels] = cv2.addWeighted(img1, 1 - alpha, red_overlay, alpha, 0)[changed_pixels]
        
        _, buffer = cv2.imencode('.jpg', heatmap)
        
     
        base64_str = base64.b64encode(buffer).decode('utf-8')
        
        return {
            "heatmap_base64": f"data:image/jpeg;base64,{base64_str}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "healthy"}

import tempfile
import os
import math

@app.post("/api/v1/analyze_sync")
async def analyze_sync(file: UploadFile = File(...)):
    try:
        # Create a temporary file
        fd, temp_path = tempfile.mkstemp(suffix=".mp4")
        with os.fdopen(fd, 'wb') as f:
            f.write(await file.read())
        
        import cv2
        import librosa
        import numpy as np

        # Extract audio energy
        y, sr = librosa.load(temp_path, sr=16000)
        audio_energy = librosa.feature.rms(y=y, frame_length=1024, hop_length=512)[0]

        # Extract video motion energy
        cap = cv2.VideoCapture(temp_path)
        motion_energy = []
        ret, prev_frame = cap.read()
        if ret:
            prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
            while True:
                ret, frame = cap.read()
                if not ret: break
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                diff = cv2.absdiff(gray, prev_gray)
                motion_energy.append(np.mean(diff))
                prev_gray = gray
        cap.release()
        
        os.remove(temp_path)

        # Correlate
        if len(audio_energy) > 10 and len(motion_energy) > 10:
            target_len = min(len(audio_energy), len(motion_energy))
            x_audio = np.linspace(0, 1, len(audio_energy))
            x_motion = np.linspace(0, 1, len(motion_energy))
            x_target = np.linspace(0, 1, target_len)

            resampled_audio = np.interp(x_target, x_audio, audio_energy)
            resampled_motion = np.interp(x_target, x_motion, motion_energy)

            # Normalize
            std_audio = np.std(resampled_audio) + 1e-6
            std_motion = np.std(resampled_motion) + 1e-6
            resampled_audio = (resampled_audio - np.mean(resampled_audio)) / std_audio
            resampled_motion = (resampled_motion - np.mean(resampled_motion)) / std_motion

            correlation = np.corrcoef(resampled_audio, resampled_motion)[0, 1]
            
            # Map correlation (-1 to 1) to a sync score (0 to 1)
            # Typically out-of-sync audio has ~0 correlation. Intact audio has >0.15
            sync_score = max(0, min(1, (correlation + 0.1) * 2.5))
        else:
            sync_score = 0.5
            
        return {
            "sync_score": float(sync_score),
            "is_deepfake": bool(sync_score < 0.3),
            "message": "Sync analysis completed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
