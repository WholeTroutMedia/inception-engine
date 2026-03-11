"""
Rotoscoping & Masking Pipeline

Integrates Segment Anything Model (SAM) and Robust Video Matting (RVM) 
to isolate subjects from the background.
"""
import numpy as np

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

try:
    from segment_anything import sam_model_registry, SamPredictor
    SAM_AVAILABLE = True
except ImportError:
    SAM_AVAILABLE = False


class RotoEngine:
    def __init__(self, model_type="vit_h", checkpoint_path="sam_vit_h_4b8939.pth"):
        self.device = "cpu"
        self.ready = False
        
        if TORCH_AVAILABLE and SAM_AVAILABLE:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            try:
                import os
                if os.path.exists(checkpoint_path):
                    sam = sam_model_registry[model_type](checkpoint=checkpoint_path)
                    sam.to(device=self.device)
                    self.predictor = SamPredictor(sam)
                    self.ready = True
                    print("SAM model loaded successfully.")
                else:
                    print("SAM checkpoint not found. Falling back to OpenCV GrabCut.")
            except Exception as e:
                print(f"Failed to load SAM model: {e}. Falling back to OpenCV GrabCut.")
                
        # Initialize OpenCV fallbacks
        import cv2
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(history=500, varThreshold=16, detectShadows=True)
        self.current_frame = None

    def set_image(self, frame_array: np.ndarray):
        """Prepare for a specific frame."""
        self.current_frame = frame_array.copy()
        if self.ready:
            self.predictor.set_image(frame_array)
            
    def get_mask_sam(self, input_point: tuple, input_label: int = 1) -> np.ndarray:
        """Get a mask using SAM."""
        points = np.array([input_point])
        labels = np.array([input_label])
        masks, scores, logits = self.predictor.predict(
            point_coords=points, point_labels=labels, multimask_output=True
        )
        return masks[np.argmax(scores)]

    def get_mask_grabcut(self, rect: tuple) -> np.ndarray:
        """Fallback: Get a mask using OpenCV GrabCut with a bounding box (x, y, w, h)."""
        import cv2
        if self.current_frame is None:
            return np.zeros((10, 10), dtype=np.uint8)
            
        mask = np.zeros(self.current_frame.shape[:2], np.uint8)
        bgdModel = np.zeros((1,65), np.float64)
        fgdModel = np.zeros((1,65), np.float64)
        
        cv2.grabCut(self.current_frame, mask, rect, bgdModel, fgdModel, 5, cv2.GC_INIT_WITH_RECT)
        mask = np.where((mask==2)|(mask==0), 0, 1).astype('uint8')
        return mask
        
    def generate_matte(self, frame_array: np.ndarray) -> np.ndarray:
        """Fallback for Robust Video Matting (RVM) using MOG2."""
        fg_mask = self.bg_subtractor.apply(frame_array)
        # Clean up mask
        import cv2
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
        return fg_mask
        
    def generate_clean_plate(self, frame_array: np.ndarray, mask: np.ndarray) -> np.ndarray:
        """Fallback for LaMa using OpenCV Telea Inpainting."""
        import cv2
        # mask must be 8-bit 1-channel
        inpainted = cv2.inpaint(frame_array, mask, 3, cv2.INPAINT_TELEA)
        return inpainted
        
    def export_alpha_masks(self, masks: list, output_dir: str):
        """Export a sequence of masks as PNG with transparency or black/white."""
        import cv2
        import os
        os.makedirs(output_dir, exist_ok=True)
        for i, mask in enumerate(masks):
            # Convert 0/1 mask to 0/255
            mask_img = (mask * 255).astype(np.uint8)
            path = os.path.join(output_dir, f"mask_{i:04d}.png")
            cv2.imwrite(path, mask_img)
        return output_dir
