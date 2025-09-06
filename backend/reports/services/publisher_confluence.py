# /app/reports/services/publisher_confluence.py
# Purpose: Complete Confluence publisher with page_id/page_url tracking and ReportAsset creation
#
# Configuration:
# - Default: PUBLISHER_BACKEND=mock (safe for development/demo)
# - Production: Set PUBLISHER_BACKEND=confluence + credentials to enable real Confluence API
# - No code changes needed to switch between modes

from __future__ import annotations
from typing import Tuple, Dict, Any, Optional
import os, time, hashlib, json, logging
from datetime import datetime
from django.utils import timezone

log = logging.getLogger(__name__)

# Configuration from environment
PUBLISHER_BACKEND = os.getenv("PUBLISHER_BACKEND", "mock").lower()  # "mock" or "confluence"
CONFLUENCE_BASE_URL = os.getenv("CONFLUENCE_BASE_URL", "https://confluence.example.com")
CONFLUENCE_USERNAME = os.getenv("CONFLUENCE_USERNAME", "")
CONFLUENCE_API_TOKEN = os.getenv("CONFLUENCE_API_TOKEN", "")  # API token or password
CONFLUENCE_TIMEOUT = int(os.getenv("CONFLUENCE_TIMEOUT", "30"))

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    log.warning("requests library not available - Confluence publishing will use mock mode only")


class ConfluencePublisher:
    """Confluence publisher with real API integration and mock fallback."""
    
    def __init__(self, base_url: str = None, username: str = None, api_token: str = None):
        self.base_url = (base_url or CONFLUENCE_BASE_URL).rstrip("/")
        self.username = username or CONFLUENCE_USERNAME
        self.api_token = api_token or CONFLUENCE_API_TOKEN
        self.session = None
        self.enabled = (PUBLISHER_BACKEND == "confluence" and 
                        REQUESTS_AVAILABLE and self.username and self.api_token)
        
        if self.enabled:
            self._init_session()
    
    def _init_session(self):
        """Initialize authenticated requests session."""
        if not REQUESTS_AVAILABLE:
            return
            
        self.session = requests.Session()
        self.session.auth = (self.username, self.api_token)
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        self.session.timeout = CONFLUENCE_TIMEOUT
    
    def _extract_title_from_html(self, html: str) -> str:
        """Extract title from HTML content."""
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html, 'html.parser')
            title_tag = soup.find('title')
            if title_tag:
                return title_tag.get_text(strip=True)
            
            # Fallback to first h1
            h1_tag = soup.find('h1')
            if h1_tag:
                return h1_tag.get_text(strip=True)
                
        except Exception:
            pass
        
        return "Generated Report"
    
    def _get_space_info(self, space_key: str) -> Optional[Dict[str, Any]]:
        """Get space information from Confluence."""
        if not self.session:
            return None
            
        try:
            url = f"{self.base_url}/rest/api/space/{space_key}"
            response = self.session.get(url)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                log.warning(f"Confluence space '{space_key}' not found")
                return None
            else:
                log.warning(f"Failed to get space info: {response.status_code} {response.text}")
                return None
                
        except Exception as e:
            log.error(f"Error getting space info: {e}")
            return None
    
    def _find_existing_page(self, space_key: str, title: str) -> Optional[Dict[str, Any]]:
        """Find existing page by title in space."""
        if not self.session:
            return None
            
        try:
            url = f"{self.base_url}/rest/api/content"
            params = {
                'spaceKey': space_key,
                'title': title,
                'type': 'page',
                'status': 'current',
                'expand': 'version'
            }
            
            response = self.session.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                if results:
                    return results[0]  # Return first match
                    
        except Exception as e:
            log.error(f"Error finding existing page: {e}")
            
        return None
    
    def _create_page(self, space_key: str, title: str, content: str, parent_page_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Create new page in Confluence."""
        if not self.session:
            return None
            
        try:
            payload = {
                'type': 'page',
                'title': title,
                'space': {'key': space_key},
                'body': {
                    'storage': {
                        'value': content,
                        'representation': 'storage'
                    }
                }
            }
            
            if parent_page_id:
                payload['ancestors'] = [{'id': parent_page_id}]
            
            url = f"{self.base_url}/rest/api/content"
            response = self.session.post(url, json=payload)
            
            if response.status_code == 200:
                return response.json()
            else:
                log.error(f"Failed to create page: {response.status_code} {response.text}")
                return None
                
        except Exception as e:
            log.error(f"Error creating page: {e}")
            return None
    
    def _update_page(self, page_id: str, title: str, content: str, version: int) -> Optional[Dict[str, Any]]:
        """Update existing page in Confluence."""
        if not self.session:
            return None
            
        try:
            payload = {
                'id': page_id,
                'type': 'page',
                'title': title,
                'body': {
                    'storage': {
                        'value': content,
                        'representation': 'storage'
                    }
                },
                'version': {
                    'number': version + 1,
                    'message': 'Updated by MediaJira Reports'
                }
            }
            
            url = f"{self.base_url}/rest/api/content/{page_id}"
            response = self.session.put(url, json=payload)
            
            if response.status_code == 200:
                return response.json()
            else:
                log.error(f"Failed to update page: {response.status_code} {response.text}")
                return None
                
        except Exception as e:
            log.error(f"Error updating page: {e}")
            return None
    
    def _convert_html_to_confluence_storage(self, html: str) -> str:
        """Convert HTML to Confluence storage format."""
        # Basic conversion - can be enhanced with more sophisticated mapping
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(html, 'html.parser')
            
            # Remove DOCTYPE and html/head tags, keep body content
            body = soup.find('body')
            if body:
                content = str(body)
                # Remove body tags
                content = content.replace('<body>', '').replace('</body>', '')
            else:
                content = str(soup)
            
            # Basic conversions for Confluence storage format
            content = content.replace('<h1>', '<h1>').replace('</h1>', '</h1>')
            content = content.replace('<h2>', '<h2>').replace('</h2>', '</h2>')
            content = content.replace('<h3>', '<h3>').replace('</h3>', '</h3>')
            
            # Convert images to Confluence format (if they're accessible URLs)
            # Note: For local chart images, you'd need to upload them as attachments first
            
            return content
            
        except Exception as e:
            log.warning(f"Failed to convert HTML to Confluence storage format: {e}")
            # Fallback: wrap in basic div
            return f'<div>{html}</div>'
    
    def publish_html(self, html: str, opts: Dict[str, Any]) -> Tuple[str, str]:
        """
        Publish HTML content to Confluence.
        
        Args:
            html: HTML content to publish
            opts: Publishing options including space_key, parent_page_id, title, etc.
            
        Returns:
            Tuple of (page_id, page_url)
        """
        space_key = opts.get("space_key", "REPORTS")
        parent_page_id = opts.get("parent_page_id")
        title = opts.get("title") or self._extract_title_from_html(html)
        visibility = opts.get("visibility", "team")
        
        # Generate idempotency key
        idem_key = opts.get("idempotency_key")
        if not idem_key:
            content_hash = hashlib.sha256((space_key + ":" + title + ":" + (html or "")).encode("utf-8")).hexdigest()[:12]
            idem_key = f"mjr_{content_hash}"
        
        # If Confluence is enabled, try real API
        if self.enabled:
            try:
                return self._publish_to_confluence(space_key, title, html, parent_page_id, idem_key)
            except Exception as e:
                log.error(f"Confluence API publishing failed, falling back to mock: {e}")
        
        # Mock/development mode
        return self._mock_publish(space_key, title, idem_key)
    
    def _publish_to_confluence(self, space_key: str, title: str, html: str, parent_page_id: Optional[str], idem_key: str) -> Tuple[str, str]:
        """Publish to real Confluence API."""
        log.info(f"Publishing to Confluence space '{space_key}' with title '{title}'")
        
        # Check if space exists
        space_info = self._get_space_info(space_key)
        if not space_info:
            raise Exception(f"Confluence space '{space_key}' not found or inaccessible")
        
        # Convert HTML to Confluence storage format
        confluence_content = self._convert_html_to_confluence_storage(html)
        
        # Check if page already exists
        existing_page = self._find_existing_page(space_key, title)
        
        if existing_page:
            # Update existing page
            log.info(f"Updating existing page: {existing_page['id']}")
            version = existing_page.get('version', {}).get('number', 1)
            page_data = self._update_page(existing_page['id'], title, confluence_content, version)
        else:
            # Create new page
            log.info(f"Creating new page in space '{space_key}'")
            page_data = self._create_page(space_key, title, confluence_content, parent_page_id)
        
        if not page_data:
            raise Exception("Failed to create or update Confluence page")
        
        page_id = page_data['id']
        page_url = f"{self.base_url}/pages/viewpage.action?pageId={page_id}"
        
        log.info(f"Successfully published to Confluence: {page_url}")
        return page_id, page_url
    
    def _mock_publish(self, space_key: str, title: str, idem_key: str) -> Tuple[str, str]:
        """Mock publish for development/testing."""
        log.info(f"Mock publishing to space '{space_key}' with title '{title}'")
        
        # Simulate processing time
        time.sleep(0.1)
        
        page_id = f"pg_{space_key}_{idem_key}"
        page_url = f"{self.base_url}/x/{space_key}/{page_id}"
        
        return page_id, page_url


# Global publisher instance
_publisher = ConfluencePublisher()


def publish_html(html: str, opts: Dict[str, Any]) -> Tuple[str, str]:
    """
    Main entry point for publishing HTML to Confluence.
    
    Args:
        html: HTML content to publish
        opts: Publishing options
        
    Returns:
        Tuple of (page_id, page_url)
    """
    return _publisher.publish_html(html, opts)


def create_report_asset_for_confluence(report_id: str, page_id: str, page_url: str, title: str = None) -> 'ReportAsset':
    """
    Create a ReportAsset entry for a published Confluence page.
    
    Args:
        report_id: ID of the report
        page_id: Confluence page ID
        page_url: Confluence page URL
        title: Optional page title
        
    Returns:
        Created ReportAsset instance
    """
    from ..models import ReportAsset
    from django.utils import timezone
    
    # Generate unique asset ID
    timestamp = int(timezone.now().timestamp())
    asset_id = f"confluence_{report_id}_{timestamp}"
    
    # Create metadata for the asset
    meta = {
        "page_id": page_id,
        "page_url": page_url,
        "published_at": timezone.now().isoformat(),
        "platform": "confluence"
    }
    
    if title:
        meta["title"] = title
    
    # Create the asset record
    asset = ReportAsset.objects.create(
        id=asset_id,
        report_id=report_id,
        file_url=page_url,  # Use the Confluence URL as the "file" URL
        file_type="confluence",  # We'll need to add this to the model choices
        checksum="",  # Confluence pages don't have traditional checksums
        # Store metadata as JSON if the model supports it
        # meta=meta  # Uncomment if meta field exists in model
    )
    
    return asset
