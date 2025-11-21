 import io
 import os
 from .conftest import login
 
 
 def test_upload_list_and_stream_video(client):
     # login
     login(client)
 
     # upload a tiny mp4-like file (content doesn't need to be real video for endpoint behavior)
     data = {
         "video": (io.BytesIO(b"fake-mp4-bytes"), "sample.mp4"),
     }
     res = client.post("/api/videos", content_type="multipart/form-data", data=data)
     assert res.status_code == 200
     video = res.get_json()
     assert video["id"] > 0
 
     # list videos
     res = client.get("/api/videos")
     assert res.status_code == 200
     videos = res.get_json()
     assert any(v["id"] == video["id"] for v in videos)
 
     # stream video (now public)
     res = client.get(f"/api/videos/{video['id']}/stream", headers={"Origin": "http://localhost:5173"})
     assert res.status_code in (200, 206)
     assert res.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"
     assert res.headers.get("Accept-Ranges") == "bytes"
     assert "video" in res.headers.get("Content-Type", "")
 

