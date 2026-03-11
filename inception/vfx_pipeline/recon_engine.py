"""
Scene Reconstruction Engine

Uses Structure from Motion (SfM) and depth estimation (MiDaS) to
reconstruct 3D environments and point clouds from video.
"""
import numpy as np

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

class SceneReconEngine:
    def __init__(self):
        if not TORCH_AVAILABLE:
            raise ImportError("PyTorch is required for MiDaS depth estimation.")
        # Device detection
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Load MiDaS
        midas_model_type = "DPT_Large" # MiDaS v3.1
        self.midas = torch.hub.load("intel-isl/MiDaS", midas_model_type)
        self.midas.to(self.device)
        self.midas.eval()
        
        midas_transforms = torch.hub.load("intel-isl/MiDaS", "transforms")
        self.transform = midas_transforms.dpt_transform
        
    def estimate_depth(self, frame_array: np.ndarray) -> np.ndarray:
        """Generate relative depth map for a single RGB frame."""
        input_batch = self.transform(frame_array).to(self.device)
        
        with torch.no_grad():
            prediction = self.midas(input_batch)
            prediction = torch.nn.functional.interpolate(
                prediction.unsqueeze(1),
                size=frame_array.shape[:2],
                mode="bicubic",
                align_corners=False,
            ).squeeze()
            
        output = prediction.cpu().numpy()
        return output
        
    def track_camera(self, video_parser) -> dict:
        """Use OpenCV Optical Flow to estimate relative camera poses frame-to-frame."""
        import cv2
        metadata = video_parser.extract_metadata()
        num_frames = metadata["frame_count"]
        # Basic intrinsic guessing based on resolution
        w, h = metadata["resolution"]
        focal_length = w * 0.8
        center = (w/2, h/2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=np.float64)

        poses = []
        # Start at origin
        current_R = np.eye(3)
        current_t = np.zeros((3, 1))
        
        poses.append({
            "R": current_R.tolist(),
            "t": current_t.tolist()
        })

        prev_frame = video_parser.get_frame(0)
        if prev_frame is None:
            return {"poses": poses}
            
        prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_RGB2GRAY)
        
        # Track max 300 frames to avoid huge delay in MVP
        limit = min(300, num_frames)
        
        for i in range(1, limit):
            curr_frame = video_parser.get_frame(i)
            if curr_frame is None:
                break
                
            curr_gray = cv2.cvtColor(curr_frame, cv2.COLOR_RGB2GRAY)
            
            # Find Shi-Tomasi corners in previous frame
            p0 = cv2.goodFeaturesToTrack(prev_gray, maxCorners=500, qualityLevel=0.01, minDistance=10)
            
            if p0 is not None:
                # Calculate optical flow
                p1, st, err = cv2.calcOpticalFlowPyrLK(prev_gray, curr_gray, p0, None)
                
                # Select good points
                if p1 is not None:
                    good_new = p1[st==1]
                    good_old = p0[st==1]
                    
                    if len(good_new) > 8:
                        # Find essential matrix
                        E, mask = cv2.findEssentialMat(
                            good_new, good_old, camera_matrix, 
                            method=cv2.RANSAC, prob=0.999, threshold=1.0)
                            
                        # Recover pose (R, t) relative to previous frame
                        if E is not None and E.shape == (3, 3):
                            _, R, t, mask_pose = cv2.recoverPose(E, good_new, good_old, camera_matrix)
                            
                            # Update global trajectory
                            # t and R are from prev to curr camera coordinate frames
                            # T_global = T_global * T_relative
                            current_t = current_t + current_R.dot(t)
                            current_R = R.dot(current_R)
                            
            poses.append({
                "R": current_R.tolist(),
                "t": current_t.tolist()
            })
            
            prev_gray = curr_gray
            
        return {"poses": poses}
    def generate_point_cloud(self, video_parser, poses: dict, output_path: str) -> str:
        """Use MiDaS depth and OpenCV poses to map a global Point Cloud (Python 3.14 friendly)."""
        import cv2
        metadata = video_parser.extract_metadata()
        num_frames = min(100, metadata["frame_count"]) # Limit to 100 frames for MVP memory constraints
        
        w, h = metadata["resolution"]
        focal_length = w * 0.8
        cx, cy = w/2, h/2
        
        all_points = []
        all_colors = []
        
        for i in range(num_frames):
            frame = video_parser.get_frame(i)
            if frame is None or i >= len(poses["poses"]):
                break
                
            depth_map = self.estimate_depth(frame)
            
            # Normalize and invert depth for projection (MiDaS outputs disparity-like inverse depth)
            depth_min = depth_map.min()
            depth_max = depth_map.max()
            if depth_max > depth_min:
                depth_map = (depth_map - depth_min) / (depth_max - depth_min)
            depth_map = 1.0 / (depth_map + 0.1) # Convert to pseudo-depth
            
            # Subsample for performance
            step = 4
            v, u = np.mgrid[0:h:step, 0:w:step]
            Z = depth_map[v, u]
            
            # Unproject to 3D standard camera coordinates
            X = (u - cx) * Z / focal_length
            Y = (v - cy) * Z / focal_length
            
            points_3d = np.stack((X, Y, Z), axis=-1).reshape(-1, 3)
            colors = frame[v, u].reshape(-1, 3)
            
            # Apply tracking transformation (from track_camera)
            R = np.array(poses["poses"][i]["R"])
            t = np.array(poses["poses"][i]["t"]).flatten()
            
            # Transform to global coords
            points_global = points_3d.dot(R.T) + t
            
            all_points.append(points_global)
            all_colors.append(colors)
            
        if not all_points:
            return ""
            
        # Concatenate and export as point cloud PLY
        final_points = np.vstack(all_points)
        final_colors = np.vstack(all_colors)
        
        # Simple PLY exporter logic
        header = f"""ply
format ascii 1.0
element vertex {len(final_points)}
property float x
property float y
property float z
property uchar red
property uchar green
property uchar blue
end_header
"""
        with open(output_path, "w") as f:
            f.write(header)
            for p, c in zip(final_points, final_colors):
                f.write(f"{p[0]:.4f} {p[1]:.4f} {p[2]:.4f} {c[0]} {c[1]} {c[2]}\n")
                
        return output_path

    def estimate_lighting(self, frame_array: np.ndarray) -> dict:
        """Estimate basic directional light and ambient color from a frame for viewport matching."""
        import cv2
        h, w = frame_array.shape[:2]
        gray = cv2.cvtColor(frame_array, cv2.COLOR_RGB2GRAY)
        
        # Heavy blur to find general bright spots without local noise
        blurred = cv2.GaussianBlur(gray, (51, 51), 0)
        
        # Find max brightness location to roughly act as primary directional light
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(blurred)
        
        # Convert pixel location to a rough 3D vector
        cx, cy = w / 2.0, h / 2.0
        # Assuming camera is at origin looking down -Z.
        # This gives a vector pointing from the origin to the bright spot on the image plane.
        dx = (max_loc[0] - cx) / cx
        dy = -(max_loc[1] - cy) / cy # Image Y is down, 3D Y is up
        dz = 1.0 # arbitrary depth for light vector estimation
        
        length = np.sqrt(dx*dx + dy*dy + dz*dz)
        direction = [dx/length, dy/length, dz/length]
        
        # Ambient color is just the average color of the frame
        avg_color = np.mean(frame_array, axis=(0, 1)) / 255.0
        
        return {
            "directional_light": direction,
            "ambient_color": avg_color.tolist(),
            "intensity": float(max_val / 255.0)
        }
