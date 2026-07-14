from fastapi import FastAPI, File, UploadFile, HTTPException
from sentence_transformers import SentenceTransformer
from PIL import Image
import io

app = FastAPI()

print("Loading CLIP Vision model...")
model = SentenceTransformer('clip-ViT-B-32')
print("Model loaded successfully!")

@app.post("/api/v1/embed")
async def embed_image(file: UploadFile = File(...)):

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Generate the dense 512-dimensional semantic embedding
        embedding = model.encode(image)
        
        # Convert NumPy array to Python list
        embedding_list = embedding.tolist()
        
        return {"semantic_hash": embedding_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health():
    return {"status": "healthy"}
