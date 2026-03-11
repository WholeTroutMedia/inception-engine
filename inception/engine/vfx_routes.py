import os
import json
import shutil
import uuid
from typing import Dict, Any
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException, BackgroundTasks
from pydantic import BaseModel
from fastapi.responses import FileResponse

from inception.vfx_pipeline import VideoParser, MocapEngine, SceneReconEngine, RotoEngine
import base64
import cv2

vfx_router = APIRouter()

# Temporary storage for uploaded videos and results
UPLOAD_DIR = Path("./storage/vfx_uploads")
RESULTS_DIR = Path("./storage/vfx_results")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

def process_video_background(session_id: str, file_path: Path):
    """Background task to run the video through the VFX Python Pipeline."""
    status_file = RESULTS_DIR / f"{session_id}.json"
    
    # Init status
    try:
        with open(status_file, "w") as f:
            json.dump({"status": "processing_mocap", "progress": 0}, f)
            
        parser = VideoParser(str(file_path))
        metadata = parser.extract_metadata()
        
        # Write metadata update
        with open(status_file, "w") as f:
            json.dump({"status": "processing_mocap", "progress": 10, "metadata": metadata}, f)
            
        mocap = MocapEngine()
        
        # MVP Implementation: Extract just the first 30 frames for a quick preview
        all_frames_data = []
        max_preview_frames = min(30, metadata["frame_count"])
        
        for i in range(max_preview_frames):
            frame = parser.get_frame(i)
            if frame is not None:
                step_data = mocap.process_frame(frame)
                all_frames_data.append(step_data)
        
        mocap_results = {
            "frames": all_frames_data,
            "fps": metadata["fps"]
        }
        
        # Stage 2: Scene Reconstruction (Optical Flow Tracking + Depth -> Point Cloud)
        with open(status_file, "w") as f:
            json.dump({
                "status": "processing_scene", 
                "progress": 33, 
                "metadata": metadata,
                "mocap_preview": mocap_results
            }, f)
            
        recon = SceneReconEngine()
        
        poses_result = recon.track_camera(parser)
        pc_path = RESULTS_DIR / f"{session_id}_pointcloud.ply"
        _ = recon.generate_point_cloud(parser, poses_result, str(pc_path))
        
        lighting = {}
        first_frame = parser.get_frame(0)
        if first_frame is not None:
            lighting = recon.estimate_lighting(first_frame)
            
        scene_results = {
            "poses": poses_result["poses"],
            "point_cloud_url": f"/api/v1/vfx/download/{session_id}_pointcloud",
            "lighting": lighting
        }
        
        # Stage 3: Roto & Matting (Background Subtractor & GrabCut Fallbacks)
        with open(status_file, "w") as f:
            json.dump({
                "status": "processing_roto", 
                "progress": 66, 
                "metadata": metadata,
                "mocap_preview": mocap_results,
                "scene_preview": scene_results
            }, f)
            
        roto = RotoEngine()
        roto_masks_b64 = []
        
        for i in range(max_preview_frames):
            frame = parser.get_frame(i)
            if frame is not None:
                matte = roto.generate_matte(frame)
                # Encode small preview for frontend
                # scale down to save JSON size
                small_matte = cv2.resize(matte, (256, int(256 * matte.shape[0] / matte.shape[1])))
                _, buffer = cv2.imencode('.png', small_matte)
                b64 = base64.b64encode(buffer).decode('utf-8')
                roto_masks_b64.append(f"data:image/png;base64,{b64}")
                
        roto_results = {
            "masks_b64": roto_masks_b64,
            "message": "Generated via MOG2 Background Subtractor (OpenCV Fallback)"
        }
        
        # Completed
        with open(status_file, "w") as f:
            json.dump({
                "status": "completed", 
                "progress": 100, 
                "metadata": metadata,
                "mocap_preview": mocap_results,
                "scene_preview": scene_results,
                "roto_preview": roto_results
            }, f)
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        with open(status_file, "w") as f:
            json.dump({"status": "error", "error": str(e)}, f)

@vfx_router.get("/export/{session_id}")
async def export_pipeline_data(session_id: str):
    """Compiles all session data into a ZIP and returns the download."""
    from inception_engine.vfx_pipeline.exporters import ExporterFactory
    
    zip_path = RESULTS_DIR / f"{session_id}_export.zip"
    
    # Try creating the archive
    exporter = ExporterFactory.get_exporter("zip")
    success = exporter.export_pipeline_archive(session_id, str(RESULTS_DIR), str(zip_path))
    
    if not success or not zip_path.exists():
        raise HTTPException(status_code=404, detail="Export failed or data not found.")
        
    return FileResponse(
        path=zip_path,
        media_type="application/zip",
        filename=f"inception_vfx_{session_id}.zip"
    )
async def download_vfx_file(filename: str):
    """Download a generated point cloud PLY or other assets."""
    file_path = RESULTS_DIR / f"{filename}.ply"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path=file_path, filename=f"{filename}.ply")
    

@vfx_router.post("/upload", response_description="Upload a video for VFX processing")
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)) -> Dict[str, Any]:
    """Upload a video file, extract metadata, and run initial mocap processing."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
        
    # Generate unique ID for this processing session
    session_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix
    local_filename = f"{session_id}{ext}"
    file_path = UPLOAD_DIR / local_filename
    
    # Save the uploaded file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    # Trigger background processing
    background_tasks.add_task(process_video_background, session_id, file_path)
    
    return {
        "status": "success",
        "session_id": session_id,
        "message": "Video uploaded successfully. Processing started in the background."
    }

@vfx_router.get("/status/{session_id}")
async def get_processing_status(session_id: str) -> Dict[str, Any]:
    """Poll the mocap/reconstruction processing status."""
    status_file = RESULTS_DIR / f"{session_id}.json"
    
    if not status_file.exists():
        return {"status": "pending", "message": "Job queued or does not exist."}
        
    try:
        with open(status_file, "r") as f:
            return json.load(f)
    except Exception as e:
        return {"status": "error", "error": f"Failed to read status: {str(e)}"}
