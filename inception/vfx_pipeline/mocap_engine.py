"""
Motion Capture Engine

Wraps MediaPipe/OpenPose models to extract 3D skeletal landmarks
from 2D video frames.
"""
import numpy as np

try:
    import mediapipe as mp
    MP_AVAILABLE = True
except ImportError:
    MP_AVAILABLE = False


class MocapEngine:
    def __init__(self, model_type: str = "mediapipe"):
        self.model_type = model_type
        if not MP_AVAILABLE:
            raise ImportError("MediaPipe not installed. Please install 'mediapipe'.")
            
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2, # heavy
            enable_segmentation=True,
            min_detection_confidence=0.5
        )

    def process_frame(self, frame_array: np.ndarray):
        """Process a single frame for body, face, and hand landmarks.
        Assumes frame_array is RGB.
        """
        results = self.pose.process(frame_array)
        pose_landmarks = []
        
        if results.pose_world_landmarks:
            for data_point in results.pose_world_landmarks.landmark:
                pose_landmarks.append({
                    "x": data_point.x,
                    "y": data_point.y,
                    "z": data_point.z,
                    "visibility": data_point.visibility
                })

        return {
            "pose": pose_landmarks,
            "face": [], # WIP
            "hands": [] # WIP
        }

    def _smooth_landmarks(self, frames_data: list, window_size: int = 5) -> list:
        """Applies a simple moving average to smooth landmark jitter."""
        if not frames_data or len(frames_data) < window_size:
            return frames_data
            
        num_frames = len(frames_data)
        smoothed_frames = []
        
        for i in range(num_frames):
            # Grab half of the window size, left and right
            start_idx = max(0, i - window_size // 2)
            end_idx = min(num_frames, i + window_size // 2 + 1)
            window = frames_data[start_idx:end_idx]
            
            # Guard clause if pose is empty for this frame
            if not frames_data[i].get("pose"):
                smoothed_frames.append(frames_data[i])
                continue
                
            num_landmarks = len(frames_data[i]["pose"])
            smoothed_step = {"pose": [], "face": [], "hands": []}
            
            for lm_idx in range(num_landmarks):
                sum_x, sum_y, sum_z, sum_v = 0.0, 0.0, 0.0, 0.0
                valid_frames = 0
                
                for w_frame in window:
                    if w_frame.get("pose") and len(w_frame["pose"]) > lm_idx:
                        lm = w_frame["pose"][lm_idx]
                        sum_x += lm["x"]
                        sum_y += lm["y"]
                        sum_z += lm["z"]
                        sum_v += lm["visibility"]
                        valid_frames += 1
                        
                if valid_frames > 0:
                    smoothed_step["pose"].append({
                        "x": sum_x / valid_frames,
                        "y": sum_y / valid_frames,
                        "z": sum_z / valid_frames,
                        "visibility": sum_v / valid_frames
                    })
                else:
                    smoothed_step["pose"].append(frames_data[i]["pose"][lm_idx])
                    
            smoothed_frames.append(smoothed_step)
            
        return smoothed_frames

    def process_video(self, video_parser) -> dict:
        """Process entire video stream and return temporal landmark data."""
        # Concept implementation
        metadata = video_parser.extract_metadata()
        all_frames_data = []
        for i in range(metadata["frame_count"]):
            frame = video_parser.get_frame(i)
            if frame is not None:
                step_data = self.process_frame(frame)
                all_frames_data.append(step_data)
        
        # Apply temporal smoothing to reduce jitter in the 3D data output
        smoothed_data = self._smooth_landmarks(all_frames_data, window_size=5)
        
        return {
            "frames": smoothed_data,
            "fps": metadata["fps"]
        }
