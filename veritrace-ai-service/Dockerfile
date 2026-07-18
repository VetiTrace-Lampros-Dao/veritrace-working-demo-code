FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 build-essential ffmpeg && rm -rf /var/lib/apt/lists/*

# Pre-install dependencies from standard PyPI to bypass PyTorch index metadata bugs
RUN pip install --no-cache-dir typing-extensions jinja2 sympy networkx filelock fsspec
RUN pip install --no-cache-dir torch==2.6.0+cpu torchvision==0.21.0+cpu --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the CLIP model so it is baked into the Docker image
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('clip-ViT-B-32'); SentenceTransformer('all-MiniLM-L6-v2')"

# Pre-download the AI Lie Detector model so it is baked into the Docker image
RUN python -c "from transformers import pipeline; pipeline('image-classification', model='dima806/deepfake_vs_real_image_detection')"

# Pre-download InsightFace models
RUN python -c "from insightface.app import FaceAnalysis; app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider']); app.prepare(ctx_id=0, det_size=(640, 640))"

# Pre-download Wav2Vec2 and BLIP models
RUN python -c "from transformers import Wav2Vec2Processor, Wav2Vec2Model, BlipProcessor, BlipForConditionalGeneration; Wav2Vec2Processor.from_pretrained('facebook/wav2vec2-base'); Wav2Vec2Model.from_pretrained('facebook/wav2vec2-base'); BlipProcessor.from_pretrained('Salesforce/blip-image-captioning-base'); BlipForConditionalGeneration.from_pretrained('Salesforce/blip-image-captioning-base')"

COPY main.py .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8082"]
