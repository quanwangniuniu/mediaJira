import uuid
from contextlib import contextmanager
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
import requests
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from google_docs_integration.google_sheets_patch_export import (
    GoogleBlankTabCleanupError,
    GooglePatchExportError,
    export_copied_google_sheet,
)
from google_docs_integration.models import GoogleDocsConnection
from google_docs_integration.services import GOOGLE_SHEETS_URL, run_google_api_with_token_retry
from spreadsheet.models import SheetImportSource
from spreadsheet.tests.test_services import (
    create_test_organization,
    create_test_project,
    create_test_sheet,
    create_test_spreadsheet,
    create_test_user,
)

SHEETS_EXPORT_URL = "/api/google-docs/sheets/export/"
SOURCE_SPREADSHEET_ID = "source-sheet"
DESTINATION_ID = "dest-sheet"
BLANK_SHEET_ID = 11
COPIED_SHEET_ID = 22


def _safe_diff(**overrides):
    diff = {
        "requires_rebuild": False,
        "has_changes": False,
        "cells": {},
        "formats": {},
        "highlights": {"cells": {}},
    }
    diff.update(overrides)
    return diff


def _source(sheet_id=0, worksheet_name="Budget"):
    return SimpleNamespace(
        google_spreadsheet_id=SOURCE_SPREADSHEET_ID,
        google_sheet_id=sheet_id,
        worksheet_name=worksheet_name,
    )


def _ok(payload):
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = payload
    response.raise_for_status.return_value = None
    return response


def _http_error(status_code):
    response = MagicMock()
    response.status_code = status_code
    error = requests.HTTPError(str(status_code))
    error.response = response
    response.raise_for_status.side_effect = error
    return response


def _created_payload():
    return {
        "spreadsheetId": DESTINATION_ID,
        "sheets": [{"properties": {"sheetId": BLANK_SHEET_ID}}],
    }


def _copy_payload(title="Budget"):
    return {"sheetId": COPIED_SHEET_ID, "title": title}


@pytest.fixture
def sheet_setup(db):
    suffix = uuid.uuid4().hex[:8]
    user = create_test_user(username=f"p5_{suffix}", email=f"p5_{suffix}@test.com")
    organization = create_test_organization(name=f"Phase 5 {suffix}")
    project = create_test_project(organization, owner=user)
    spreadsheet = create_test_spreadsheet(project, name=f"Budget {suffix}")
    sheet = create_test_sheet(spreadsheet, name="Sheet 1")
    connection = GoogleDocsConnection(user=user, google_email="user@gmail.com", is_active=True)
    connection.set_access_token("token-abc")
    connection.set_refresh_token("refresh-abc")
    connection.save()
    client = APIClient()
    client.force_authenticate(user=user)
    return SimpleNamespace(
        user=user,
        project=project,
        spreadsheet=spreadsheet,
        sheet=sheet,
        client=client,
        connection=connection,
    )


def _google_source(sheet, **overrides):
    fields = {
        "sheet": sheet,
        "origin": SheetImportSource.Origin.GOOGLE,
        "worksheet_name": "Budget",
        "google_spreadsheet_id": SOURCE_SPREADSHEET_ID,
        "google_sheet_id": 0,
    }
    fields.update(overrides)
    return SheetImportSource.objects.create(**fields)


def _post_export(setup, sheet_id=None, spreadsheet_id=None):
    return setup.client.post(
        SHEETS_EXPORT_URL,
        {
            "title": "Export",
            "matrix": [["a"]],
            "formats": [],
            "spreadsheet_id": setup.spreadsheet.slug if spreadsheet_id is None else spreadsheet_id,
            "sheet_id": setup.sheet.id if sheet_id is None else sheet_id,
        },
        format="json",
    )


@contextmanager
def _routed_export(diff=None, copy_error=None):
    def invoke(connection, fn):
        return fn("token")

    rebuild_result = {
        "spreadsheet_id": "rebuilt",
        "url": "https://docs.google.com/spreadsheets/d/rebuilt/edit",
    }
    copy_result = {
        "spreadsheet_id": "copied",
        "url": "https://docs.google.com/spreadsheets/d/copied/edit",
    }
    with patch(
        "google_docs_integration.views.run_google_api_with_token_retry",
        side_effect=invoke,
    ), patch(
        "google_docs_integration.views.export_to_google_sheet",
        return_value=rebuild_result,
    ) as rebuild, patch(
        "google_docs_integration.views.export_copied_google_sheet",
        return_value=copy_result,
    ) as copy, patch(
        "google_docs_integration.views.diff_sheet",
        return_value=diff or _safe_diff(),
    ):
        if copy_error is not None:
            copy.side_effect = copy_error
        yield SimpleNamespace(rebuild=rebuild, copy=copy)


@pytest.mark.django_db
class TestGoogleSheetExportRouting:
    def test_no_source_uses_rebuild(self, sheet_setup):
        with _routed_export() as routed:
            response = _post_export(sheet_setup)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["spreadsheet_id"] == "rebuilt"
        routed.rebuild.assert_called_once()
        routed.copy.assert_not_called()

    def test_excel_source_uses_rebuild(self, sheet_setup):
        _google_source(
            sheet_setup.sheet,
            origin=SheetImportSource.Origin.EXCEL,
            google_spreadsheet_id="",
            google_sheet_id=None,
        )
        with _routed_export() as routed:
            response = _post_export(sheet_setup)
        assert response.status_code == status.HTTP_200_OK
        routed.rebuild.assert_called_once()
        routed.copy.assert_not_called()

    def test_blank_google_spreadsheet_id_uses_rebuild(self, sheet_setup):
        _google_source(sheet_setup.sheet, google_spreadsheet_id="  ")
        with _routed_export() as routed:
            response = _post_export(sheet_setup)
        assert response.status_code == status.HTTP_200_OK
        routed.rebuild.assert_called_once()
        routed.copy.assert_not_called()

    def test_null_google_sheet_id_uses_rebuild(self, sheet_setup):
        _google_source(sheet_setup.sheet, google_sheet_id=None)
        with _routed_export() as routed:
            response = _post_export(sheet_setup)
        assert response.status_code == status.HTTP_200_OK
        routed.rebuild.assert_called_once()
        routed.copy.assert_not_called()

    def test_requires_rebuild_uses_rebuild(self, sheet_setup):
        _google_source(sheet_setup.sheet)
        with _routed_export(_safe_diff(requires_rebuild=True, has_changes=True)) as routed:
            response = _post_export(sheet_setup)
        assert response.status_code == status.HTTP_200_OK
        routed.rebuild.assert_called_once()
        routed.copy.assert_not_called()

    def test_safe_unchanged_google_source_returns_copy_url(self, sheet_setup):
        _google_source(sheet_setup.sheet)
        with _routed_export() as routed:
            response = _post_export(sheet_setup)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["url"] == "https://docs.google.com/spreadsheets/d/copied/edit"
        routed.copy.assert_called_once()
        routed.rebuild.assert_not_called()

    def test_safe_changed_google_source_passes_the_diff(self, sheet_setup):
        _google_source(sheet_setup.sheet)
        diff = _safe_diff(has_changes=True, cells={"8,0": {"raw_input": "CMP-11000"}})
        with _routed_export(diff) as routed:
            response = _post_export(sheet_setup)
        assert response.status_code == status.HTTP_200_OK
        assert routed.copy.call_args.args[1] == diff
        assert routed.copy.call_args.args[2] == "Export"
        assert routed.copy.call_args.args[3] == "token"
        routed.rebuild.assert_not_called()

    def test_patch_error_falls_back_to_rebuild(self, sheet_setup):
        _google_source(sheet_setup.sheet)
        with _routed_export(copy_error=GooglePatchExportError("patch failed")) as routed:
            response = _post_export(sheet_setup)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["spreadsheet_id"] == "rebuilt"
        routed.copy.assert_called_once()
        routed.rebuild.assert_called_once()

    def test_blank_tab_cleanup_returns_503_without_rebuild(self, sheet_setup):
        _google_source(sheet_setup.sheet)
        error = GoogleBlankTabCleanupError(
            "copied tab rename failed",
            spreadsheet_id=DESTINATION_ID,
            url=f"https://docs.google.com/spreadsheets/d/{DESTINATION_ID}/edit",
        )
        with _routed_export(copy_error=error) as routed:
            response = _post_export(sheet_setup)
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        assert "error" in response.data
        assert "url" not in response.data
        routed.rebuild.assert_not_called()

    def test_sheet_from_another_spreadsheet_returns_404(self, sheet_setup):
        other = create_test_spreadsheet(sheet_setup.project, name=f"Other {uuid.uuid4().hex[:6]}")
        other_sheet = create_test_sheet(other, name="Other sheet")
        with _routed_export() as routed:
            response = _post_export(sheet_setup, sheet_id=other_sheet.id)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        routed.rebuild.assert_not_called()
        routed.copy.assert_not_called()


class TestExportCopiedGoogleSheet:
    def _run(self, diff, source=None, copy_title="Budget", fail=None, recorded=None):
        if recorded is None:
            recorded = []

        def request(method, url, **kwargs):
            recorded.append((url, kwargs.get("json")))
            if fail and fail(url, kwargs.get("json"), len(recorded)):
                return _http_error(fail.status_code)
            if url == GOOGLE_SHEETS_URL:
                return _ok(_created_payload())
            if url.endswith(":copyTo"):
                return _ok(_copy_payload(copy_title))
            return _ok({})

        with patch(
            "google_docs_integration.google_sheets_patch_export.requests.request",
            side_effect=request,
        ):
            result = export_copied_google_sheet(source or _source(), diff, "Phase 5", "token")
        return result, recorded

    def test_no_edit_copies_deletes_blank_tab_and_restores_name(self):
        result, recorded = self._run(_safe_diff(), copy_title="Copy of Budget")
        urls = [url for url, _body in recorded]
        copy_calls = [(url, body) for url, body in recorded if url.endswith(":copyTo")]
        assert copy_calls == [(
            f"{GOOGLE_SHEETS_URL}/{SOURCE_SPREADSHEET_ID}/sheets/0:copyTo",
            {"destinationSpreadsheetId": DESTINATION_ID},
        )]
        assert result == {
            "spreadsheet_id": DESTINATION_ID,
            "url": f"https://docs.google.com/spreadsheets/d/{DESTINATION_ID}/edit",
        }
        assert not any(url.endswith("/values:batchUpdate") for url in urls)
        assert not any(
            body and "repeatCell" in str(body)
            for _url, body in recorded
        )
        assert recorded[2][1]["requests"] == [{"deleteSheet": {"sheetId": BLANK_SHEET_ID}}]
        rename = recorded[3][1]["requests"][0]["updateSheetProperties"]
        assert rename["properties"] == {"sheetId": COPIED_SHEET_ID, "title": "Budget"}
        assert rename["fields"] == "title"

    def test_value_edit_uses_user_entered_ranges(self):
        diff = _safe_diff(
            has_changes=True,
            cells={
                "8,0": {"raw_input": "CMP-11000"},
                "0,1": {"raw_input": "=B2*2"},
                "1,0": {"raw_input": None},
            },
        )
        _result, recorded = self._run(diff)
        values = next(body for url, body in recorded if url.endswith("/values:batchUpdate"))
        assert values["valueInputOption"] == "USER_ENTERED"
        assert values["data"] == [
            {"range": "'Budget'!A9", "values": [["CMP-11000"]]},
            {"range": "'Budget'!B1", "values": [["=B2*2"]]},
            {"range": "'Budget'!A2", "values": [[""]]},
        ]

    def _repeat_cells(self, diff):
        _result, recorded = self._run(diff)
        repeats = []
        for _url, body in recorded:
            for request in (body or {}).get("requests", []):
                if "repeatCell" in request:
                    repeats.append(request["repeatCell"])
        return repeats

    def test_bold_only_uses_a_narrow_mask(self):
        repeats = self._repeat_cells(_safe_diff(has_changes=True, formats={"0,0": {"bold": True}}))
        assert len(repeats) == 1
        assert repeats[0]["fields"] == "userEnteredFormat.textFormat.bold"
        assert repeats[0]["cell"]["userEnteredFormat"]["textFormat"]["bold"] is True
        assert "numberFormat" not in repeats[0]["fields"]

    def test_multiple_format_fields_use_one_repeat_cell(self):
        repeats = self._repeat_cells(_safe_diff(
            has_changes=True,
            formats={"0,0": {"bold": True, "italic": True, "text_color": "#7C3AED"}},
        ))
        assert len(repeats) == 1
        assert repeats[0]["fields"].split(",") == [
            "userEnteredFormat.textFormat.bold",
            "userEnteredFormat.textFormat.italic",
            "userEnteredFormat.textFormat.foregroundColor",
            "userEnteredFormat.textFormat.foregroundColorStyle",
        ]
        text = repeats[0]["cell"]["userEnteredFormat"]["textFormat"]
        assert text["bold"] is True
        assert text["italic"] is True
        assert text["foregroundColor"] == {"red": 124 / 255, "green": 58 / 255, "blue": 237 / 255}

    def test_highlight_uses_a_background_only_mask(self):
        repeats = self._repeat_cells(_safe_diff(
            has_changes=True,
            highlights={"cells": {"2,0": "#BFDBFE"}},
        ))
        assert len(repeats) == 1
        assert repeats[0]["fields"] == (
            "userEnteredFormat.backgroundColor,userEnteredFormat.backgroundColorStyle"
        )
        assert repeats[0]["cell"]["userEnteredFormat"]["backgroundColor"] == {
            "red": 191 / 255,
            "green": 219 / 255,
            "blue": 254 / 255,
        }
        assert "borders" not in repeats[0]["fields"]
        assert "textFormat" not in repeats[0]["fields"]
        assert "horizontalAlignment" not in repeats[0]["fields"]

    def test_supported_currency_format_is_patched(self):
        repeats = self._repeat_cells(_safe_diff(
            has_changes=True,
            formats={"0,0": {"number_format": {
                "type": "CURRENCY",
                "currency_code": "USD",
                "decimal_places": 2,
            }}},
        ))
        assert repeats[0]["fields"] == "userEnteredFormat.numberFormat"
        assert repeats[0]["cell"]["userEnteredFormat"]["numberFormat"] == {
            "type": "CURRENCY",
            "pattern": "[$$-409]#,##0.00",
        }

    def test_requires_rebuild_makes_no_request(self):
        with patch(
            "google_docs_integration.google_sheets_patch_export.requests.request",
        ) as request:
            with pytest.raises(GooglePatchExportError):
                export_copied_google_sheet(_source(), _safe_diff(requires_rebuild=True), "Phase 5", "token")
        request.assert_not_called()

    def test_row_highlight_makes_no_request(self):
        diff = _safe_diff(highlights={"cells": {}, "rows": {"0": "#FF0000"}, "columns": {}})
        with patch(
            "google_docs_integration.google_sheets_patch_export.requests.request",
        ) as request:
            with pytest.raises(GooglePatchExportError):
                export_copied_google_sheet(_source(), diff, "Phase 5", "token")
        request.assert_not_called()

    def test_google_sheet_id_zero_is_copied(self):
        _result, recorded = self._run(_safe_diff(), source=_source(sheet_id=0))
        assert recorded[1][0].endswith("/sheets/0:copyTo")

    def test_copy_failure_raises_patch_error(self):
        def fail(url, _body, _count):
            return url.endswith(":copyTo")

        fail.status_code = 403
        with pytest.raises(GooglePatchExportError):
            self._run(_safe_diff(), fail=fail)

    def test_401_is_reraised(self):
        def fail(url, _body, _count):
            return url == GOOGLE_SHEETS_URL

        fail.status_code = 401
        with pytest.raises(requests.HTTPError) as caught:
            self._run(_safe_diff(), fail=fail)
        assert caught.value.response.status_code == 401

    def test_patch_failure_deletes_only_the_copied_tab(self):
        diff = _safe_diff(has_changes=True, cells={"0,0": {"raw_input": "x"}})
        recorded = []

        def fail(url, _body, _count):
            return url.endswith("/values:batchUpdate")

        fail.status_code = 500
        with pytest.raises(GooglePatchExportError):
            self._run(diff, fail=fail, recorded=recorded)
        deletes = [
            request["deleteSheet"]["sheetId"]
            for _url, body in recorded
            for request in (body or {}).get("requests", [])
            if "deleteSheet" in request
        ]
        assert deletes == [COPIED_SHEET_ID]

    def test_blank_tab_delete_failure_raises_cleanup_error(self):
        def fail(url, body, _count):
            return url.endswith(":batchUpdate") and "deleteSheet" in str(body)

        fail.status_code = 500
        with pytest.raises(GoogleBlankTabCleanupError) as caught:
            self._run(_safe_diff(), fail=fail)
        assert caught.value.spreadsheet_id == DESTINATION_ID
        assert caught.value.url == f"https://docs.google.com/spreadsheets/d/{DESTINATION_ID}/edit"

    def test_rename_failure_raises_cleanup_error(self):
        seen_delete = {"done": False}

        def fail(url, body, _count):
            if not url.endswith(":batchUpdate"):
                return False
            if "deleteSheet" in str(body):
                seen_delete["done"] = True
                return False
            return seen_delete["done"]

        fail.status_code = 500
        with pytest.raises(GoogleBlankTabCleanupError) as caught:
            self._run(_safe_diff(), copy_title="Copy of Budget", fail=fail)
        assert caught.value.spreadsheet_id == DESTINATION_ID
        assert caught.value.url == f"https://docs.google.com/spreadsheets/d/{DESTINATION_ID}/edit"

    def test_source_spreadsheet_id_is_only_on_copy_to(self):
        diff = _safe_diff(
            has_changes=True,
            cells={"0,0": {"raw_input": "x"}},
            formats={"0,0": {"bold": True}},
        )
        _result, recorded = self._run(diff)
        for url, _body in recorded:
            if SOURCE_SPREADSHEET_ID in url:
                assert url.endswith(":copyTo")
            if url.endswith("/values:batchUpdate") or url.endswith(":batchUpdate"):
                assert DESTINATION_ID in url

@pytest.mark.django_db
class TestGoogleCopyTokenRetry:
    def test_rejected_token_refreshes_and_retries_the_copy(self):
        suffix = uuid.uuid4().hex[:8]
        user = create_test_user(
            username=f"p5tok_{suffix}",
            email=f"p5tok_{suffix}@test.com",
        )
        connection = GoogleDocsConnection(
            user=user,
            google_email="user@gmail.com",
            is_active=True,
        )
        connection.set_access_token("token-abc")
        connection.set_refresh_token("refresh-abc")
        connection.token_expiry = timezone.now() + timedelta(hours=1)
        connection.save()

        creates = []

        def request(method, url, **kwargs):
            if url == GOOGLE_SHEETS_URL:
                creates.append(kwargs["headers"]["Authorization"])
                if len(creates) == 1:
                    return _http_error(401)
                return _ok(_created_payload())

            if url.endswith(":copyTo"):
                return _ok(_copy_payload())

            return _ok({})

        with patch(
            "google_docs_integration.google_sheets_patch_export.requests.request",
            side_effect=request,
        ), patch(
            "google_docs_integration.services.refresh_google_tokens",
            return_value={
                "access_token": "refreshed-token",
                "token_expiry": timezone.now() + timedelta(hours=1),
            },
        ) as refresh:
            result = run_google_api_with_token_retry(
                connection,
                lambda token: export_copied_google_sheet(
                    _source(),
                    _safe_diff(),
                    "Phase 5",
                    token,
                ),
            )

        assert creates == [
            "Bearer token-abc",
            "Bearer refreshed-token",
        ]
        refresh.assert_called_once()
        assert result["spreadsheet_id"] == DESTINATION_ID
    