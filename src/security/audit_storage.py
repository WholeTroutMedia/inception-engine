"""
Immutable Audit Log Storage for Inception Engine.
Provides append-only, tamper-evident storage with
hash chaining, export capabilities, and retention policies.
"""

import os
import time
import json
import csv
import io
from typing import Optional, Dict, List, Any, Callable
from dataclasses import dataclass, field
from enum import Enum

from .audit_models import (
    AuditEvent,
    AuditEventType,
    AuditSeverity,
    AuditOutcome,
    AuditQuery,
    AuditSummary,
)


class StorageBackend(str, Enum):
    """Supported audit log storage backends."""
    MEMORY = "memory"
    POSTGRESQL = "postgresql"
    ELASTICSEARCH = "elasticsearch"
    FILE = "file"


class ExportFormat(str, Enum):
    """Supported export formats."""
    JSON = "json"
    CSV = "csv"
    JSONL = "jsonl"


class AuditStorage:
    """
    Immutable, append-only audit log storage.
    Implements hash chaining for tamper detection.
    """

    def __init__(
        self,
        backend: StorageBackend = StorageBackend.MEMORY,
        retention_days: int = 365,
        max_events: int = 1_000_000,
    ):
        self._backend = backend
        self._retention_days = retention_days
        self._max_events = max_events
        self._events: List[AuditEvent] = []
        self._last_hash: str = "genesis"
        self._subscribers: List[Callable[[AuditEvent], None]] = []

    # ── Core Storage Operations ──────────────────────────

    def append(self, event: AuditEvent) -> str:
        """
        Append an audit event to the immutable log.
        Returns the event hash.
        """
        # Compute hash chain
        event_hash = event.compute_hash(self._last_hash)
        self._last_hash = event_hash

        # Store event
        self._events.append(event)

        # Notify subscribers (for real-time streaming)
        for subscriber in self._subscribers:
            try:
                subscriber(event)
            except Exception:
                pass  # Don't let subscriber errors affect logging

        return event_hash

    def get_event(self, event_id: str) -> Optional[AuditEvent]:
        """Retrieve a single event by ID."""
        for event in self._events:
            if event.event_id == event_id:
                return event
        return None

    def query(self, query: AuditQuery) -> List[AuditEvent]:
        """Query events with filtering."""
        results = self._events

        if query.event_type:
            results = [e for e in results if e.event_type == query.event_type]
        if query.user_id:
            results = [e for e in results if e.user_id == query.user_id]
        if query.severity:
            results = [e for e in results if e.severity == query.severity]
        if query.outcome:
            results = [e for e in results if e.outcome == query.outcome]
        if query.resource_type:
            results = [e for e in results if e.resource_type == query.resource_type]
        if query.resource_id:
            results = [e for e in results if e.resource_id == query.resource_id]
        if query.org_id:
            results = [e for e in results if e.org_id == query.org_id]
        if query.since:
            results = [e for e in results if e.timestamp >= query.since]
        if query.until:
            results = [e for e in results if e.timestamp <= query.until]

        # Apply pagination
        total = len(results)
        results = results[query.offset:query.offset + query.limit]

        return results

    def count(self) -> int:
        """Get total number of stored events."""
        return len(self._events)

    # ── Hash Chain Verification ──────────────────────────

    def verify_chain_integrity(self) -> tuple[bool, Optional[str]]:
        """
        Verify the hash chain integrity of the audit log.
        Returns (is_valid, first_invalid_event_id).
        """
        previous_hash = "genesis"
        for event in self._events:
            expected_hash = event.compute_hash(previous_hash)
            if event.event_hash != expected_hash:
                return False, event.event_id
            previous_hash = event.event_hash
        return True, None

    # ── Export ─────────────────────────────────────────

    def export_json(self, query: Optional[AuditQuery] = None) -> str:
        """Export audit events as JSON."""
        events = self.query(query) if query else self._events
        return json.dumps(
            [e.to_dict() for e in events],
            indent=2,
            default=str,
        )

    def export_csv(self, query: Optional[AuditQuery] = None) -> str:
        """Export audit events as CSV."""
        events = self.query(query) if query else self._events
        if not events:
            return ""

        output = io.StringIO()
        fieldnames = [
            "event_id", "event_type", "severity", "timestamp",
            "user_id", "action", "outcome", "description",
            "resource_type", "resource_id", "endpoint",
            "ip_address", "org_id", "event_hash",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for event in events:
            row = event.to_dict()
            row["event_type"] = row.get("event_type", "")
            row["severity"] = row.get("severity", "")
            row["outcome"] = row.get("outcome", "")
            writer.writerow(row)
        return output.getvalue()

    def export_jsonl(self, query: Optional[AuditQuery] = None) -> str:
        """Export audit events as JSON Lines (one event per line)."""
        events = self.query(query) if query else self._events
        lines = [json.dumps(e.to_dict(), default=str) for e in events]
        return "\n".join(lines)

    def export(self, fmt: ExportFormat, query: Optional[AuditQuery] = None) -> str:
        """Export events in the specified format."""
        if fmt == ExportFormat.JSON:
            return self.export_json(query)
        elif fmt == ExportFormat.CSV:
            return self.export_csv(query)
        elif fmt == ExportFormat.JSONL:
            return self.export_jsonl(query)
        raise ValueError(f"Unsupported export format: {fmt}")

    # ── Summary & Analytics ──────────────────────────────

    def get_summary(self, since: Optional[float] = None) -> AuditSummary:
        """Generate summary statistics for audit events."""
        events = self._events
        if since:
            events = [e for e in events if e.timestamp >= since]

        type_counts: Dict[str, int] = {}
        severity_counts: Dict[str, int] = {}
        outcome_counts: Dict[str, int] = {}
        user_ids = set()

        for e in events:
            type_counts[e.event_type.value] = type_counts.get(e.event_type.value, 0) + 1
            severity_counts[e.severity.value] = severity_counts.get(e.severity.value, 0) + 1
            outcome_counts[e.outcome.value] = outcome_counts.get(e.outcome.value, 0) + 1
            if e.user_id:
                user_ids.add(e.user_id)

        valid, _ = self.verify_chain_integrity()

        return AuditSummary(
            total_events=len(events),
            events_by_type=type_counts,
            events_by_severity=severity_counts,
            events_by_outcome=outcome_counts,
            unique_users=len(user_ids),
            time_range_start=events[0].timestamp if events else None,
            time_range_end=events[-1].timestamp if events else None,
            chain_integrity_valid=valid,
        )

    # ── Retention ──────────────────────────────────────

    def apply_retention_policy(self) -> int:
        """Remove events older than the retention period. Returns count removed."""
        cutoff = time.time() - (self._retention_days * 86400)
        original_count = len(self._events)
        self._events = [e for e in self._events if e.timestamp >= cutoff]
        return original_count - len(self._events)

    def get_retention_info(self) -> Dict[str, Any]:
        """Get retention policy information."""
        return {
            "retention_days": self._retention_days,
            "total_events": len(self._events),
            "max_events": self._max_events,
            "oldest_event": (
                self._events[0].timestamp if self._events else None
            ),
            "newest_event": (
                self._events[-1].timestamp if self._events else None
            ),
            "storage_backend": self._backend.value,
        }

    # ── Real-Time Streaming ──────────────────────────────

    def subscribe(self, callback: Callable[[AuditEvent], None]) -> None:
        """Subscribe to real-time audit events."""
        self._subscribers.append(callback)

    def unsubscribe(self, callback: Callable[[AuditEvent], None]) -> bool:
        """Unsubscribe from real-time audit events."""
        try:
            self._subscribers.remove(callback)
            return True
        except ValueError:
            return False

    def subscriber_count(self) -> int:
        """Get the number of active subscribers."""
        return len(self._subscribers)
