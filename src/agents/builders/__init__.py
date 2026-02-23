"""Builder agents package.

All builder agents organized by hive for the Inception Engine.
HELIX GAMMA expansion: 16 builder agents across 7 hives.
"""

# === AURORA Hive (Frontend/UI) ===
from .bolt import BOLTAgent
from .frontend import FRONTENDAgent
from .design_system import DESIGNSYSTEMAgent

# === ATLAS Hive (Backend/Infrastructure) ===
from .systems import SYSTEMSAgent
from .database import DATABASEAgent
from .api_builder import APIBUILDERAgent
from .cloud import CLOUDAgent

# === NEXUS Hive (Integration/Communication) ===
from .comet import COMETAgent
from .github_agent import GITHUBAgent
from .slack_agent import SLACKAgent
from .mailroom import MAILROOMAgent
from .webhook import WEBHOOKAgent
from .calendar_sync import CALENDARSYNCAgent
from .notification import NOTIFICATIONAgent

# === KEEPER Hive (Operations/Monitoring) ===
from .monitor import MONITORAgent

# === LEX Hive (Documentation) ===
from .docs import DOCSAgent

# === COMPASS Hive (Analytics) ===
from .analytics import ANALYTICSAgent

# === SWITCHBOARD Hive (Orchestration) ===
from .scheduler import SCHEDULERAgent


__all__ = [
    # AURORA Hive
    "BOLTAgent",
    "FRONTENDAgent",
    "DESIGNSYSTEMAgent",
    # ATLAS Hive
    "SYSTEMSAgent",
    "DATABASEAgent",
    "APIBUILDERAgent",
    "CLOUDAgent",
    # NEXUS Hive
    "COMETAgent",
    "GITHUBAgent",
    "SLACKAgent",
    "MAILROOMAgent",
    "WEBHOOKAgent",
    "CALENDARSYNCAgent",
    "NOTIFICATIONAgent",
    # KEEPER Hive
    "MONITORAgent",
    # LEX Hive
    "DOCSAgent",
    # COMPASS Hive
    "ANALYTICSAgent",
    # SWITCHBOARD Hive
    "SCHEDULERAgent",
]
