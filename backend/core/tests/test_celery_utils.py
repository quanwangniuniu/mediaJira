"""TimeoutEnforcedTask: helper-thread DB cleanup and timeout behavior."""
import threading
import time
from unittest.mock import patch

import pytest

from core.celery_utils import (
    TaskTimeoutError,
    TimeoutEnforcedTask,
    _run_task_with_db_cleanup,
)


class TestRunTaskWithDbCleanup:
    def test_closes_connections_on_success(self):
        with patch("django.db.connections.close_all") as close_all:
            assert _run_task_with_db_cleanup(lambda: 42) == 42
            close_all.assert_called_once()

    def test_closes_connections_on_error(self):
        def boom():
            raise ValueError("task failed")

        with patch("django.db.connections.close_all") as close_all:
            with pytest.raises(ValueError, match="task failed"):
                _run_task_with_db_cleanup(boom)
            close_all.assert_called_once()


class TestTimeoutEnforcedTask:
    @pytest.fixture(autouse=True)
    def _allow_timeout_path(self):
        # Production path is skipped while PYTEST_CURRENT_TEST is set.
        with patch("core.celery_utils.os.environ.get", return_value=None):
            yield

    def _make_task(self, run, *, time_limit=1, name="core.tests.fake_task"):
        task = TimeoutEnforcedTask.__new__(TimeoutEnforcedTask)
        task.name = name
        task.time_limit = time_limit
        task.run = run
        return task

    def test_success_closes_connections(self):
        task = self._make_task(lambda *a, **k: "ok", time_limit=5)
        with patch("django.db.connections.close_all") as close_all:
            assert task() == "ok"
            close_all.assert_called_once()

    def test_error_closes_connections_and_propagates(self):
        def boom(*a, **k):
            raise RuntimeError("boom")

        task = self._make_task(boom, time_limit=5)
        with patch("django.db.connections.close_all") as close_all:
            with pytest.raises(RuntimeError, match="boom"):
                task()
            close_all.assert_called_once()

    def test_timeout_raises_then_orphan_thread_closes_connections(self):
        """Timeout frees the worker; orphan helper still closes DB when it exits.

        Patch must stay active until the orphan finishes — otherwise it would
        call the real close_all after the test's with-block ends.
        """
        started = threading.Event()
        release = threading.Event()

        def hang(*a, **k):
            started.set()
            # Block until the test releases us (simulates work past time_limit).
            assert release.wait(timeout=5)

        task = self._make_task(hang, time_limit=0.2, name="core.tests.hang")
        with patch("django.db.connections.close_all") as close_all:
            with pytest.raises(TaskTimeoutError, match="exceeded 0.2s timeout"):
                task()

            assert started.wait(timeout=1), "helper thread never started"
            # Still blocked inside hang — cleanup has not run yet.
            close_all.assert_not_called()

            release.set()
            deadline = time.monotonic() + 2
            while close_all.call_count == 0 and time.monotonic() < deadline:
                time.sleep(0.01)
            close_all.assert_called_once()
