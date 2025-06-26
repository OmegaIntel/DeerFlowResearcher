"""
OnlyOffice Document Server Integration
Provides fast Excel processing with full Excel compatibility
"""

import requests
import base64
import json
import uuid
from typing import Dict, Optional, Any
from datetime import datetime
import logging
from config import settings

logger = logging.getLogger(__name__)

class OnlyOfficeService:
    def __init__(self):
        self.server_url = getattr(settings, 'ONLYOFFICE_SERVER_URL', 'http://localhost:9080')
        self.jwt_secret = getattr(settings, 'ONLYOFFICE_JWT_SECRET', 'your-jwt-secret-here')
        self.storage = {}  # In production, use Redis or database

    def create_edit_session(self, file_content: bytes, filename: str, user_id: str = "default") -> Dict[str, Any]:
        """
        Create an OnlyOffice editing session for Excel file
        Returns the document configuration for frontend
        """
        try:
            # Generate unique document key
            doc_key = str(uuid.uuid4())
            
            # Store file in memory (use object storage in production)
            self.storage[doc_key] = {
                'content': file_content,
                'filename': filename,
                'created': datetime.now(),
                'user_id': user_id
            }
            
            # Generate callback URL for saving
            callback_url = f"{settings.API_BASE_URL}/api/v1/excel/onlyoffice/callback/{doc_key}"
            
            # OnlyOffice document configuration
            config = {
                "document": {
                    "fileType": "xlsx",
                    "key": doc_key,
                    "title": filename,
                    "url": f"{settings.API_BASE_URL}/api/v1/excel/onlyoffice/download/{doc_key}",
                    "permissions": {
                        "comment": True,
                        "download": True,
                        "edit": True,
                        "fillForms": True,
                        "modifyFilter": True,
                        "modifyContentControl": True,
                        "review": True,
                        "chat": False
                    }
                },
                "documentType": "cell",  # Excel type
                "editorConfig": {
                    "mode": "edit",
                    "lang": "en",
                    "callbackUrl": callback_url,
                    "user": {
                        "id": user_id,
                        "name": f"User {user_id}"
                    },
                    "customization": {
                        "autosave": True,
                        "forcesave": True,
                        "compactToolbar": False,
                        "feedback": False,
                        "help": False,
                        "hideRightMenu": False,
                        "hideRulers": False,
                        "toolbarNoTabs": False,
                        "toolbarHideFileName": False,
                        "chat": False,
                        "comments": True,
                        "zoom": 100,
                        "features": {
                            "spellcheck": {
                                "mode": True
                            }
                        }
                    },
                    "plugins": {
                        "autostart": [],
                        "pluginsData": []
                    }
                },
                "height": "100%",
                "width": "100%",
                "type": "desktop"
            }
            
            return {
                "success": True,
                "doc_key": doc_key,
                "config": config,
                "editor_url": f"{self.server_url}/web-apps/apps/documenteditor/main/index.html"
            }
            
        except Exception as e:
            logger.error(f"Error creating OnlyOffice session: {str(e)}")
            return {"success": False, "error": str(e)}

    def get_document(self, doc_key: str) -> Optional[bytes]:
        """Get document content by key"""
        if doc_key in self.storage:
            return self.storage[doc_key]['content']
        return None

    def save_document(self, doc_key: str, new_content: bytes) -> bool:
        """Save updated document content"""
        try:
            if doc_key in self.storage:
                self.storage[doc_key]['content'] = new_content
                self.storage[doc_key]['modified'] = datetime.now()
                return True
            return False
        except Exception as e:
            logger.error(f"Error saving document: {str(e)}")
            return False

    def handle_callback(self, doc_key: str, callback_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle OnlyOffice callback when document is saved
        """
        try:
            status = callback_data.get('status', 0)
            
            # Status codes:
            # 0 - no document with the key identifier could be found
            # 1 - document is being edited
            # 2 - document is ready for saving
            # 3 - document saving error has occurred
            # 4 - document is closed with no changes
            # 6 - document is being edited, but the current document state is saved
            # 7 - error has occurred while force saving the document
            
            if status == 2 or status == 6:  # Ready for saving or force save
                download_url = callback_data.get('url')
                if download_url:
                    # Download the updated document
                    response = requests.get(download_url)
                    if response.status_code == 200:
                        # Save the updated content
                        self.save_document(doc_key, response.content)
                        return {"error": 0}  # Success
                    
            elif status == 1:  # Document being edited
                return {"error": 0}  # Continue editing
                
            elif status == 4:  # Closed with no changes
                return {"error": 0}  # No action needed
                
            return {"error": 0}  # Default success
            
        except Exception as e:
            logger.error(f"Error handling OnlyOffice callback: {str(e)}")
            return {"error": 1, "message": str(e)}

    def convert_document(self, file_content: bytes, from_format: str, to_format: str) -> Optional[bytes]:
        """
        Convert document using OnlyOffice conversion service
        """
        try:
            # Encode file content
            file_base64 = base64.b64encode(file_content).decode('utf-8')
            
            conversion_data = {
                "async": False,
                "filetype": from_format,
                "key": str(uuid.uuid4()),
                "outputtype": to_format,
                "title": f"conversion.{from_format}",
                "url": f"data:application/octet-stream;base64,{file_base64}"
            }
            
            response = requests.post(
                f"{self.server_url}/ConvertService.ashx",
                json=conversion_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('error') == 0:
                    # Download converted file
                    download_response = requests.get(result['fileUrl'])
                    return download_response.content
                    
            return None
            
        except Exception as e:
            logger.error(f"Error converting document: {str(e)}")
            return None

    def check_server_health(self) -> bool:
        """Check if OnlyOffice server is running"""
        try:
            response = requests.get(f"{self.server_url}/healthcheck", timeout=5)
            return response.status_code == 200
        except:
            return False

# Create singleton instance
onlyoffice_service = OnlyOfficeService()