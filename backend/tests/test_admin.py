 from .conftest import login
 from db import create_user, get_user_by_id
 
 
 def test_admin_can_delete_other_users(client):
     # login as default admin
     login(client)
 
     # create a non-admin user
     new = create_user("tempuser", "temp@example.com", "pass123", is_admin=False)
     assert new is not None
 
     # delete the user via admin endpoint
     res = client.delete(f"/api/admin/users/{new['id']}")
     assert res.status_code == 200
     # ensure user is gone
     assert get_user_by_id(new['id']) is None
 
 
 def test_admin_cannot_delete_self(client):
     login(client)
     # default admin has id 1 typically; fetch current user
     me = client.get("/api/me").get_json()
     res = client.delete(f"/api/admin/users/{me['id']}")
     assert res.status_code == 400
 

