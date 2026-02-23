"""Unit tests for AgentLoader - Dynamic agent activation and management."""

import pytest
import sys
import json
import tempfile
import os
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.agent_loader import (
    AgentLoader,
    AgentType,
    AgentStatus,
    AgentMetadata,
)


# --- Fixtures ---

def _make_registry_file(agents_data: dict) -> str:
    """Create a temporary registry JSON file."""
    registry = {"agents": agents_data}
    tmpfile = tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False
    )
    json.dump(registry, tmpfile)
    tmpfile.close()
    return tmpfile.name


def _sample_agents():
    return {
        "BOLT": {
            "type": "builder",
            "status": "inactive",
            "mode": "build",
            "hive": "AURORA",
            "description": "Frontend agent",
            "dependencies": [],
        },
        "COMET": {
            "type": "builder",
            "status": "inactive",
            "mode": "build",
            "hive": "AURORA",
            "description": "Backend agent",
            "dependencies": ["BOLT"],
        },
        "SENTINEL": {
            "type": "validator",
            "status": "inactive",
            "mode": "validate",
            "hive": None,
            "description": "Security validator",
            "dependencies": [],
        },
        "ATHENA": {
            "type": "shared",
            "status": "inactive",
            "mode": "both",
            "hive": None,
            "description": "Strategic leader",
            "dependencies": [],
        },
    }


# --- AgentMetadata tests ---

class TestAgentMetadata:
    """Tests for AgentMetadata dataclass."""

    def test_from_dict_builder(self):
        data = {
            "type": "builder",
            "status": "inactive",
            "mode": "build",
            "hive": "AURORA",
            "description": "Test agent",
            "dependencies": ["DEP1"],
        }
        meta = AgentMetadata.from_dict("TEST", data)
        assert meta.name == "TEST"
        assert meta.type == AgentType.BUILDER
        assert meta.status == AgentStatus.INACTIVE
        assert "build" in meta.modes
        assert meta.hive == "AURORA"
        assert meta.dependencies == ["DEP1"]

    def test_from_dict_validator(self):
        data = {
            "type": "validator",
            "status": "active",
            "mode": "validate",
        }
        meta = AgentMetadata.from_dict("VAL", data)
        assert meta.type == AgentType.VALIDATOR
        assert meta.status == AgentStatus.ACTIVE

    def test_from_dict_defaults(self):
        meta = AgentMetadata.from_dict("MINIMAL", {})
        assert meta.name == "MINIMAL"
        assert meta.type == AgentType.BUILDER  # default
        assert meta.status == AgentStatus.INACTIVE  # default

    def test_to_dict(self):
        meta = AgentMetadata(
            name="BOLT",
            type=AgentType.BUILDER,
            status=AgentStatus.ACTIVE,
            modes=["build", "ideate"],
            hive="AURORA",
            description="Frontend",
            dependencies=[],
        )
        d = meta.to_dict()
        assert d["type"] == "builder"
        assert d["status"] == "active"
        assert "build" in d["mode"]
        assert d["hive"] == "AURORA"


# --- AgentLoader tests ---

class TestAgentLoader:
    """Tests for AgentLoader core functionality."""

    def test_initialization_with_registry(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            assert len(loader.registry) == 4
            assert "BOLT" in loader.registry
            assert "SENTINEL" in loader.registry
        finally:
            os.unlink(path)

    def test_initialization_missing_registry(self):
        loader = AgentLoader(registry_path="/nonexistent/path.json")
        assert len(loader.registry) == 0

    def test_get_agents_for_ideate_mode(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            agents = loader.get_agents_for_mode("IDEATE")
            assert len(agents) == 4  # All agents in IDEATE
        finally:
            os.unlink(path)

    def test_get_agents_for_ship_mode(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            agents = loader.get_agents_for_mode("SHIP")
            names = [a.name for a in agents]
            assert "BOLT" in names     # builder mode=build
            assert "ATHENA" in names   # shared mode=both
            assert "SENTINEL" not in names  # validator mode=validate
        finally:
            os.unlink(path)

    def test_get_agents_for_validate_mode(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            agents = loader.get_agents_for_mode("VALIDATE")
            names = [a.name for a in agents]
            assert "SENTINEL" in names   # validator
            assert "ATHENA" in names     # shared mode=both
        finally:
            os.unlink(path)

    def test_get_agents_by_type(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            builders = loader.get_agents_by_type(AgentType.BUILDER)
            assert len(builders) == 2  # BOLT + COMET
            validators = loader.get_agents_by_type(AgentType.VALIDATOR)
            assert len(validators) == 1  # SENTINEL
        finally:
            os.unlink(path)

    def test_get_agents_by_hive(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            aurora = loader.get_agents_by_hive("AURORA")
            assert len(aurora) == 2  # BOLT + COMET
        finally:
            os.unlink(path)

    def test_get_builder_agents(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            builders = loader.get_builder_agents()
            assert len(builders) == 2
        finally:
            os.unlink(path)

    def test_get_validator_agents(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            validators = loader.get_validator_agents()
            assert len(validators) == 1
        finally:
            os.unlink(path)

    def test_get_agent_info_exists(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            info = loader.get_agent_info("BOLT")
            assert info is not None
            assert info["name"] == "BOLT"
            assert info["type"] == "builder"
            assert info["is_active"] is False
        finally:
            os.unlink(path)

    def test_get_agent_info_not_exists(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            info = loader.get_agent_info("NONEXISTENT")
            assert info is None
        finally:
            os.unlink(path)

    def test_validate_dependencies_satisfied(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            satisfied, missing = loader.validate_dependencies("COMET")
            assert satisfied is True
            assert len(missing) == 0
        finally:
            os.unlink(path)

    def test_validate_dependencies_missing(self):
        agents = {
            "ORPHAN": {
                "type": "builder",
                "status": "inactive",
                "mode": "build",
                "dependencies": ["MISSING_AGENT"],
            }
        }
        path = _make_registry_file(agents)
        try:
            loader = AgentLoader(registry_path=path)
            satisfied, missing = loader.validate_dependencies("ORPHAN")
            assert satisfied is False
            assert "MISSING_AGENT" in missing
        finally:
            os.unlink(path)

    def test_validate_dependencies_no_deps(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            satisfied, missing = loader.validate_dependencies("BOLT")
            assert satisfied is True
        finally:
            os.unlink(path)

    def test_deactivate_agent(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            loader.active_agents["BOLT"] = MagicMock()
            assert loader.get_active_count() == 1
            loader.deactivate_agent("BOLT")
            assert loader.get_active_count() == 0
        finally:
            os.unlink(path)

    def test_deactivate_all(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            loader.active_agents["BOLT"] = MagicMock()
            loader.active_agents["COMET"] = MagicMock()
            assert loader.get_active_count() == 2
            loader.deactivate_all()
            assert loader.get_active_count() == 0
        finally:
            os.unlink(path)

    def test_get_summary(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            summary = loader.get_summary()
            assert summary["total_agents"] == 4
            assert summary["active_agents"] == 0
            assert summary["builders"] == 2
            assert summary["validators"] == 1
            assert isinstance(summary["by_hive"], dict)
            assert isinstance(summary["active_list"], list)
        finally:
            os.unlink(path)

    def test_active_count_starts_zero(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            assert loader.get_active_count() == 0
        finally:
            os.unlink(path)

    def test_mode_case_insensitive(self):
        path = _make_registry_file(_sample_agents())
        try:
            loader = AgentLoader(registry_path=path)
            upper = loader.get_agents_for_mode("IDEATE")
            lower = loader.get_agents_for_mode("ideate")
            assert len(upper) == len(lower)
        finally:
            os.unlink(path)
