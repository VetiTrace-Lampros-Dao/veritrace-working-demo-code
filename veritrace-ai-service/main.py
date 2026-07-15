from fastapi import FastAPI, File, UploadFile, HTTPException
from sentence_transformers import SentenceTransformer
from PIL import Image
import io

app = FastAPI()

print("Loading CLIP Vision model...")
model = SentenceTransformer('clip-ViT-B-32')

print("Loading AI-Detector Model...")
from transformers import pipeline
ai_detector = pipeline("image-classification", model="umm-maybe/AI-image-detector")

print("Models loaded successfully!")

@app.post("/api/v1/embed")
async def embed_image(file: UploadFile = File(...)):

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Generate the dense 512-dimensional semantic embedding
        embedding = model.encode(image)
        
        # Convert NumPy array to Python list
        embedding_list = embedding.tolist()
        
        # Run AI Artifact detection
        detection_results = ai_detector(image)
        # detection_results looks like: [{'label': 'artificial', 'score': 0.99}, {'label': 'human', 'score': 0.01}]
        ai_confidence = 0.0
        for res in detection_results:
            if res['label'] == 'artificial':
                ai_confidence = res['score']
                break
        
        return {
            "semantic_hash": embedding_list,
            "ai_confidence_score": ai_confidence
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "healthy"}
