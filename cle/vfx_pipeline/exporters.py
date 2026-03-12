"""
Exporters Module

Factory and writers for VFX interchange formats (JSON, USD, FBX, Alembic).
"""
import json
import logging

class JSONExporter:
    def export_skeleton(self, frames_data: dict, output_path: str):
        """Simplest export: raw/smoothed landmarks as structured JSON sequence."""
        try:
            with open(output_path, "w") as f:
                json.dump(frames_data, f, indent=2)
            logging.info(f"JSON export successful to {output_path}")
            return True
        except Exception as e:
            logging.error(f"JSON export failed: {e}")
            return False

class USDExporter:
    def export_skeleton(self, frames_data: dict, output_path: str):
        """Placeholder for OpenUSD generic skeletal export (pxr.UsdGeom/UsdSkel)."""
        logging.warning("USD Exporter not fully implemented yet.")
        pass

class ZIPExporter:
    def export_pipeline_archive(self, session_id: str, results_dir: str, output_path: str):
        """Compiles all generated VFX assets into a single ZIP file."""
        import zipfile
        import os
        from pathlib import Path
        
        try:
            r_dir = Path(results_dir)
            with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                # Add JSON status/mocap
                status_file = r_dir / f"{session_id}.json"
                if status_file.exists():
                    zf.write(status_file, arcname="pipeline_manifest.json")
                    
                # Add PLY Point Cloud
                pc_file = r_dir / f"{session_id}_pointcloud.ply"
                if pc_file.exists():
                    zf.write(pc_file, arcname="scene_reconstruction.ply")
                    
                # In the future add EXR/PNG Sequences here
            logging.info(f"Pipeline archive created at {output_path}")
            return True
        except Exception as e:
            logging.error(f"ZIP Export failed: {e}")
            return False

class ExporterFactory:
    @staticmethod
    def get_exporter(format_type: str):
        ftype = format_type.lower()
        if ftype == "json":
            return JSONExporter()
        elif ftype == "usd":
            return USDExporter()
        elif ftype == "fbx":
            return FBXExporter()
        elif ftype == "zip":
            return ZIPExporter()
        else:
            raise ValueError(f"Unsupported export format: {format_type}")
