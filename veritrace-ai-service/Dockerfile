FROM python:3.10-slim

WORKDIR /app

# Pre-install dependencies from standard PyPI to bypass PyTorch index metadata bugs
RUN pip install --no-cache-dir typing-extensions jinja2 sympy networkx filelock fsspec
RUN pip install --no-cache-dir torch==2.6.0+cpu torchvision==0.21.0+cpu --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the CLIP model so it is baked into the Docker image
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('clip-ViT-B-32')"

# Pre-download the AI Lie Detector model so it is baked into the Docker image
RUN python -c "from transformers import pipeline; pipeline('image-classification', model='umm-maybe/AI-image-detector')"

COPY main.py .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8082"]
