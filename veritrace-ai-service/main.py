from fastapi import FastAPI, File, UploadFile, HTTPException
from sentence_transformers import SentenceTransformer
from PIL import Image
import io
import base64

app = FastAPI()

print("Loading CLIP Vision model...")
model = SentenceTransformer('clip-ViT-B-32')

from transformers import pipeline
ai_detector = pipeline("image-classification", model="umm-maybe/AI-image-detector")

print("Loading InsightFace Model...")
import cv2
import numpy as np
from insightface.app import FaceAnalysis
face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
face_app.prepare(ctx_id=0, det_size=(640, 640))

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
        # detection_results looks like: [{'label': 'artificial', 'score': 0.99}, {'label': 'human', 'score': 0.01}]
        ai_confidence = 0.0
        for res in detection_results:
            if res['label'] == 'artificial':
                ai_confidence = res['score']
                break
        
        # Face extraction
        cv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        faces = face_app.get(cv_img)
        
        face_hashes = []
        if len(faces) > 0:
            face_hashes = [f.embedding.tolist() for f in faces]
        
        return {
            "semantic_hash": embedding_list,
            "ai_confidence_score": ai_confidence,
            "face_hashes": face_hashes
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
