 def test_login_preflight_options_has_cors_headers(client):
     res = client.open(
         "/api/login",
         method="OPTIONS",
         headers={
             "Origin": "http://localhost:5173",
             "Access-Control-Request-Method": "POST",
             "Access-Control-Request-Headers": "Content-Type",
         },
     )
     assert res.status_code in (200, 204)
     assert res.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"
     assert "Content-Type" in res.headers.get("Access-Control-Allow-Headers", "")
 
 
 def test_stream_preflight_options_has_cors_headers(client):
     res = client.open(
         "/api/videos/1/stream",
         method="OPTIONS",
         headers={
             "Origin": "http://localhost:5173",
             "Access-Control-Request-Method": "GET",
             "Access-Control-Request-Headers": "Range",
         },
     )
     assert res.status_code in (200, 204)
     assert res.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"
     assert "Range" in res.headers.get("Access-Control-Allow-Headers", "")
 

