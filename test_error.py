import traceback
import sys

try:
    import librosa
    print("librosa imported")
    # create dummy mp4
    with open("dummy.mp4", "wb") as f: f.write(b"")
    librosa.load("dummy.mp4", sr=16000)
except Exception as e:
    traceback.print_exc()
