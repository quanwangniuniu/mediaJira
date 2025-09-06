# =============================
# File: /app/reports/services/export_pdf.py
# Purpose: Branded PDF with cover + ToC + page footers; respects inline <img> from assembled html.
# =============================
from __future__ import annotations
from typing import Dict, Any, List, Optional
import os, tempfile, html as html_mod, base64, mimetypes
from datetime import datetime
from django.utils import timezone

try:
    from django.conf import settings
except Exception:
    settings = None  # Allow running unit tests outside a Django context

try:
    from bs4 import BeautifulSoup
except Exception:
    BeautifulSoup = None

try:
    from weasyprint import HTML, CSS
except Exception as e:
    raise ImportError("WeasyPrint is required for PDF export. Please install 'weasyprint'.") from e


def _theme_css(theme: str, report_title: str = "", time_window: str = "", version: str = "v1") -> str:
    dark = (theme or "").lower() == "dark"
    colors = (
        """
        body { background:#0b0b0c; color:#eaeaea; }
        h1, h2, h3 { color:#fff; }
        table, th, td { border-color:#555; }
        th { background:#2a2a2a; font-weight:600; }
        .brand-header { background:#1a1a1a; border-bottom:2px solid #555; }
        .footer-info { color:#999; }
        """
        if dark else
        """
        body { background:#fff; color:#111; }
        h1, h2, h3 { color:#111; }
        table, th, td { border-color:#ddd; }
        th { background:#f8f9fa; font-weight:600; }
        .brand-header { background:#f8f9fa; border-bottom:2px solid #007bff; }
        .footer-info { color:#666; }
        """
    )
    typography = """
    body { line-height:1.6; font-size:11pt; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans',sans-serif; }
    h1 { font-size:24pt; font-weight:700; margin:16pt 0 12pt; }
    h2 { font-size:18pt; font-weight:600; margin:14pt 0 10pt; }
    h3 { font-size:14pt; font-weight:600; margin:12pt 0 8pt; }
    p { margin:8pt 0; }
    h1.cover { font-size:36pt; font-weight:700; margin:140pt 0 20pt; text-align:left; }
    .subtitle { font-size:14pt; color:#666; margin-bottom:40pt; font-style:italic; }
    figure { page-break-inside: avoid; }
    table { border-collapse:collapse; width:100%; margin:12pt 0; font-size:10pt; table-layout:fixed; }
    th, td { border:1px solid; padding:8pt 6pt; text-align:left; vertical-align:top; word-break:break-word; overflow-wrap:anywhere; }
    thead { display:table-header-group; }
    tbody { display:table-row-group; }
    img { display:block; max-width:100%; height:auto; }
    """
    page = f"""
    @page {{
      size: A4; margin: 18mm 16mm 25mm 16mm;
      @bottom-left   {{ content: "{html_mod.escape(report_title)}"; font-size:9pt; color:#666; }}
      @bottom-center {{ content: "{html_mod.escape(time_window)}"; font-size:9pt; color:#666; }}
      @bottom-right  {{ content: "Page " counter(page) " • {html_mod.escape(version)}"; font-size:9pt; color:#666; }}
    }}
    @page :first {{ @bottom-left {{ content: none; }} @bottom-center {{ content: none; }} @bottom-right {{ content: none; }} }}
    """
    return page + typography + colors


def _cover_html(title: str, time_window: str = "", generated_at: Optional[datetime] = None) -> str:
    if generated_at is None:
        generated_at = timezone.now()
    dt = generated_at.strftime("%B %d, %Y at %I:%M %p %Z")
    return f"""
    <section class='cover'>
      <div class='brand-header'><div class='brand-logo' style='font-size:16pt;font-weight:700;color:#007bff'>MediaJira Analytics</div></div>
      <h1 class='cover'>{html_mod.escape(title)}</h1>
      <div class='subtitle'>Auto-generated Business Report<br/>{html_mod.escape(time_window) if time_window else ''}</div>
      <div style='margin-top:60pt;font-size:10pt;color:#888'>Generated on {dt}</div>
      <hr style='margin-top:40pt;border:none;border-top:1px solid #ddd'/>
    </section>
    """


def _toc_html(h2_titles: List[str]) -> str:
    if not h2_titles:
        return ""
    items = "".join(f"<li>{html_mod.escape(t)}</li>" for t in h2_titles)
    return f"""
    <section class='toc'>
      <h2>Table of Contents</h2>
      <ol style='padding-left:20pt;line-height:1.8'>{items}</ol>
      <hr style='margin-top:20pt;border:none;border-top:1px solid #ddd'/>
    </section>
    """


def _guess_mime(path: str) -> str:
    mt, _ = mimetypes.guess_type(path)
    return mt or "application/octet-stream"


def _inline_local_images(html: str, base_dirs: Optional[List[str]] = None) -> str:
    """
    Convert local <img src="..."> in HTML to data URIs to prevent WeasyPrint from failing to load resources.
    - Already inlined (data:) and http(s) external links are skipped;
    - Absolute paths: read directly;
    - Relative paths: try joining each candidate in base_dirs in order.
    """
    if BeautifulSoup is None:
        return html

    try:
        soup = BeautifulSoup(html, "html.parser")
    except Exception:
        return html

    for img in soup.find_all("img"):
        src = (img.get("src") or "").strip()
        if not src or src.startswith("data:") or src.startswith("http://") or src.startswith("https://"):
            continue

        candidate_paths: List[str] = []
        # Absolute path
        if os.path.isabs(src):
            candidate_paths.append(src)
        else:
            # Relative path: try base_dirs
            bd = list(base_dirs or [])
            if settings:
                # Common local static/media directories
                for p in (getattr(settings, "STATIC_ROOT", None), getattr(settings, "MEDIA_ROOT", None)):
                    if p:
                        bd.append(p)
            bd.append(os.getcwd())
            for b in bd:
                candidate_paths.append(os.path.join(b, src.lstrip("/")))

        file_path = next((p for p in candidate_paths if os.path.exists(p)), None)
        if not file_path:
            continue  # Not found → skip silently without blocking

        try:
            with open(file_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("ascii")
            mime = _guess_mime(file_path)
            img["src"] = f"data:{mime};base64,{b64}"
        except Exception:
            # Fail silently: keep original src
            pass

    try:
        return str(soup)
    except Exception:
        return html


def export_pdf(assembled: Dict[str, Any], theme: str = "light") -> str:
    html_string: str = assembled["html"]
    rpt = assembled.get("report")
    title = getattr(rpt, "title", None) or "Report"

    # Time window (optional)
    time_window = ""
    if rpt and getattr(rpt, "time_range_start", None) and getattr(rpt, "time_range_end", None):
        time_window = f"{rpt.time_range_start.strftime('%m/%d/%Y')} - {rpt.time_range_end.strftime('%m/%d/%Y')}"
    version = f"v{getattr(rpt,'id','unknown')[-8:]}" if rpt else "v1"

    css_string = _theme_css(theme, title, time_window, version)

    # ToC from existing <h2>
    h2_titles: List[str] = []
    if BeautifulSoup is not None:
        try:
            soup = BeautifulSoup(html_string, "html.parser")
            h2_titles = [h2.get_text(strip=True) for h2 in soup.find_all("h2")]
        except Exception:
            h2_titles = []

    # Compose: cover + ToC + body
    composed_html = (
        "<!doctype html><html><head><meta charset='utf-8'><meta name='generator' content='MediaJira Analytics'/></head><body>"
        f"{_cover_html(title, time_window)}"
        f"{_toc_html(h2_titles)}"
        f"{html_string}"
        "</body></html>"
    )

    # Extra fallback: inline local images that are not data: URIs (assembler already inlines chart PNGs; this covers other images)
    base_dirs: List[str] = []
    if settings:
        for p in (getattr(settings, "STATIC_ROOT", None), getattr(settings, "MEDIA_ROOT", None)):
            if p:
                base_dirs.append(p)
    base_dirs.append(os.getcwd())
    composed_html = _inline_local_images(composed_html, base_dirs=base_dirs)

    # base_url: provided to WeasyPrint for resolving relative paths (even though we try to inline)
    base_url = None
    if settings and getattr(settings, "STATIC_ROOT", None):
        base_url = settings.STATIC_ROOT
    elif settings and getattr(settings, "BASE_DIR", None):
        base_url = str(settings.BASE_DIR)
    else:
        base_url = os.getcwd()

    # Write to a temporary file
    fd, out_path = tempfile.mkstemp(suffix=".pdf"); os.close(fd)
    try:
        HTML(string=composed_html, base_url=base_url).write_pdf(out_path, stylesheets=[CSS(string=css_string)])
    except Exception:
        os.unlink(out_path)
        raise
    return out_path
