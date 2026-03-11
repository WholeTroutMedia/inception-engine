"""
INCEPTION VFX Pipeline

Core backend module for the AI-to-3D production tool.
Handles video decoding, motion capture extraction, 3D scene reconstruction,
and intelligent rotoscoping via AI models (MediaPipe, MiDaS, SAM).
"""

from .video_parser import VideoParser
from .mocap_engine import MocapEngine
from .recon_engine import SceneReconEngine
from .exporters import ExporterFactory
from .roto_engine import RotoEngine

__version__ = "0.1.0"
