import cv2
import librosa
import numpy as np

def analyze_av_sync(video_path):
    print("Extracting audio...")
    y, sr = librosa.load(video_path, sr=16000)
    audio_energy = librosa.feature.rms(y=y, frame_length=1024, hop_length=512)[0]
    
    print("Extracting video motion...")
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    motion_energy = []
    ret, prev_frame = cap.read()
    if not ret: return 0.0
    prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
    
    while True:
        ret, frame = cap.read()
        if not ret: break
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # mean absolute pixel difference
        diff = cv2.absdiff(gray, prev_gray)
        motion_energy.append(np.mean(diff))
        prev_gray = gray
        
    cap.release()
    
    motion_energy = np.array(motion_energy)
    
    # Resample to match lengths
    from scipy.interpolate import interp1d
    
    target_len = min(len(audio_energy), len(motion_energy))
    if target_len < 10: return 0.5
    
    x_audio = np.linspace(0, 1, len(audio_energy))
    x_motion = np.linspace(0, 1, len(motion_energy))
    x_target = np.linspace(0, 1, target_len)
    
    f_audio = interp1d(x_audio, audio_energy)
    f_motion = interp1d(x_motion, motion_energy)
    
    resampled_audio = f_audio(x_target)
    resampled_motion = f_motion(x_target)
    
    # Normalize
    resampled_audio = (resampled_audio - np.mean(resampled_audio)) / (np.std(resampled_audio) + 1e-6)
    resampled_motion = (resampled_motion - np.mean(resampled_motion)) / (np.std(resampled_motion) + 1e-6)
    
    correlation = np.corrcoef(resampled_audio, resampled_motion)[0, 1]
    
    # Convert correlation (-1 to 1) to a score between 0 and 1
    # Typically, in sync videos have positive correlation > 0.1
    # Out of sync might have near 0 or negative correlation
    
    score = (correlation + 1) / 2
    return score

print("Done")
