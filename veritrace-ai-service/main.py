from fastapi import FastAPI, File, UploadFile, HTTPException
from sentence_transformers import SentenceTransformer
from PIL import Image
import io

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
        
        face_hash = []
        if len(faces) > 0:
            # get largest face by bounding box area
            largest_face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]))
            face_hash = largest_face.embedding.tolist()
        
        return {
            "semantic_hash": embedding_list,
            "ai_confidence_score": ai_confidence,
            "face_hash": face_hash
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "healthy"}
