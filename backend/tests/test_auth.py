 from .conftest import login
 
 
 def test_login_success(client):
     res = login(client)
     assert res.status_code == 200
     data = res.get_json()
     assert data["ok"] is True
     assert data["user"]["username"] == "admin"
 
 
 def test_login_failure_wrong_password(client):
     res = client.post("/api/login", json={"username": "admin", "password": "wrong"})
     assert res.status_code in (401, 400)
 
 
 def test_me_requires_auth(client):
     res = client.get("/api/me")
     assert res.status_code == 401
 
 
 def test_me_after_login(client):
     login(client)
     res = client.get("/api/me")
     assert res.status_code == 200
     data = res.get_json()
     assert data["username"] == "admin"
 

