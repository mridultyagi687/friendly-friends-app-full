 import os
 import shutil
 import tempfile
 import types
 import pytest
 
 # Ensure backend is importable relative to this file
 import importlib.util
 
 
 @pytest.fixture(scope="session")
 def temp_base_dir():
     tmp = tempfile.mkdtemp(prefix="friendly_friends_test_db_")
     yield tmp
     shutil.rmtree(tmp, ignore_errors=True)
 
 
 @pytest.fixture(scope="session")
 def app(temp_base_dir, monkeypatch):
     # Point DB to temporary dir and set FRONTEND_URL for CORS
     monkeypatch.setenv("BASE_DIR", temp_base_dir)
     monkeypatch.setenv("FRONTEND_URL", "http://localhost:5173")
 
     # Import app after env is set
     from app import app as flask_app
     from app import init_db, VIDEO_FOLDER
 
     # Redirect uploads to temp folder to avoid polluting repo
     uploads_dir = os.path.join(temp_base_dir, "uploads")
     videos_dir = os.path.join(uploads_dir, "videos")
     os.makedirs(videos_dir, exist_ok=True)
 
     # Patch module-level constants used by endpoints
     import app as app_module
     app_module.UPLOAD_FOLDER = uploads_dir
     app_module.VIDEO_FOLDER = videos_dir
 
     # Initialize database schema and default admin
     init_db()
     flask_app.config.update({
         "TESTING": True,
         "WTF_CSRF_ENABLED": False,
     })
     yield flask_app
 
 
 @pytest.fixture()
 def client(app):
     return app.test_client()
 
 
 def login(client, username="admin", password="admin123"):
     return client.post("/api/login", json={"username": username, "password": password})
 

