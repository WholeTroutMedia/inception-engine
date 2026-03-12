"""
Video Parser Module

Handles FFmpeg / OpenCV wrappers to extract frames, calculate FPS, 
manage resolutions, and pre-process video for AI inference.
"""

import os
from pathlib import Path
import cv2

class VideoParser:
    def __init__(self, video_path: str):
        self.video_path = Path(video_path)
        if not self.video_path.exists():
            raise FileNotFoundError(f"Video file not found: {self.video_path}")
        
        self.fps = 0
        self.resolution = (1920, 1080)
        self.frame_count = 0
        self._load_metadata()
        
    def _load_metadata(self):
        """Use OpenCV to probe video file metadata."""
        cap = cv2.VideoCapture(str(self.video_path))
        if not cap.isOpened():
            raise RuntimeError(f"Could not open video: {self.video_path}")
            
        self.fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.resolution = (width, height)
        self.frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.release()
        
    def extract_metadata(self) -> dict:
        """Return video properties."""
        return {
            "fps": self.fps,
            "resolution": self.resolution,
            "frame_count": self.frame_count
        }
        
    def get_frame(self, frame_number: int):
        """Retrieve a specific frame by index as a NumPy array."""
        cap = cv2.VideoCapture(str(self.video_path))
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
        ret, frame = cap.read()
        cap.release()
        if ret:
            # Convert BGR to RGB for standard ML usage
            return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        return None
