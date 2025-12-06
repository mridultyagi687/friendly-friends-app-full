import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

function VideoPlayer() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const videoRef = useRef(null);

  // Set window name
  useEffect(() => {
    if (window.name !== 'Friendly Friends Video Player') {
      window.name = 'Friendly Friends Video Player';
    }
  }, []);

  const getVideoUrl = useCallback((videoId) => {
    const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('session_token') : null;
    const baseURL = import.meta.env.VITE_API_URL || 
                    import.meta.env.REACT_APP_API_URL || 
                    (import.meta.env.PROD ? 'https://friendly-friends-app-full.onrender.com' : '');
    
    let url;
    if (baseURL) {
      url = `${baseURL}/api/videos/${videoId}/stream`;
    } else {
      url = `/api/videos/${videoId}/stream`;
    }
    
    if (sessionToken) {
      url += `?session_token=${encodeURIComponent(sessionToken)}`;
    }
    
    return url;
  }, []);

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    if (videos.length > 0 && videoId) {
      const video = videos.find(v => v.id === parseInt(videoId));
      if (video) {
        setCurrentVideo(video);
        setRelatedVideos(getRelatedVideos(video, videos));
      } else {
        setError('Video not found');
      }
      setLoading(false);
    }
  }, [videos, videoId]);

  useEffect(() => {
    if (currentVideo && videoRef.current) {
      const videoUrl = getVideoUrl(currentVideo.id);
      if (videoRef.current.src !== videoUrl) {
        videoRef.current.src = videoUrl;
        videoRef.current.load();
      }
    }
  }, [currentVideo, getVideoUrl]);

  const fetchVideos = async () => {
    try {
      const response = await api.get('/api/videos');
      const items = response.data?.videos || [];
      setVideos(items);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError('Failed to load videos');
      setLoading(false);
    }
  };

  const getRelatedVideos = (currentVideo, allVideos) => {
    // Get videos from the same owner or with similar titles
    const related = allVideos
      .filter(v => v.id !== currentVideo.id)
      .filter(v => 
        v.owner_id === currentVideo.owner_id || 
        (v.title && currentVideo.title && 
         v.title.toLowerCase().includes(currentVideo.title.toLowerCase().split(' ')[0]))
      )
      .slice(0, 5);
    
    // If not enough related videos, add random ones
    if (related.length < 5) {
      const remaining = allVideos
        .filter(v => v.id !== currentVideo.id && !related.find(r => r.id === v.id))
        .slice(0, 5 - related.length);
      return [...related, ...remaining].slice(0, 5);
    }
    
    return related;
  };

  const handlePrevious = () => {
    if (videos.length === 0) return;
    const currentIndex = videos.findIndex(v => v.id === currentVideo.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : videos.length - 1;
    const prevVideo = videos[prevIndex];
    navigate(`/video-player/${prevVideo.id}`, { replace: true });
  };

  const handleNext = () => {
    if (videos.length === 0) return;
    const currentIndex = videos.findIndex(v => v.id === currentVideo.id);
    const nextIndex = currentIndex < videos.length - 1 ? currentIndex + 1 : 0;
    const nextVideo = videos[nextIndex];
    navigate(`/video-player/${nextVideo.id}`, { replace: true });
  };

  const handlePause = () => {
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
        setIsPaused(false);
      } else {
        videoRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const handleRepeat = () => {
    setIsRepeating(!isRepeating);
    if (videoRef.current) {
      videoRef.current.loop = !isRepeating;
    }
  };

  const handleVideoEnd = () => {
    if (!isRepeating) {
      handleNext();
    }
  };

  const handleRelatedVideoClick = (video) => {
    navigate(`/video-player/${video.id}`, { replace: true });
  };

  const styles = {
    container: {
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#000',
      color: '#fff',
      fontFamily: 'Arial, sans-serif',
    },
    videoContainer: {
      flex: 1,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
      backgroundColor: '#000',
    },
    video: {
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain',
    },
    controls: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: '20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '15px',
      flexWrap: 'wrap',
    },
    button: {
      padding: '12px 24px',
      fontSize: '16px',
      backgroundColor: '#4CAF50',
      color: '#fff',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      transition: 'background-color 0.3s',
    },
    buttonHover: {
      backgroundColor: '#45a049',
    },
    buttonActive: {
      backgroundColor: '#3d8b40',
    },
    buttonRepeat: {
      backgroundColor: isRepeating ? '#ff9800' : '#2196F3',
    },
    buttonPause: {
      backgroundColor: isPaused ? '#f44336' : '#4CAF50',
    },
    videoInfo: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: '15px 20px',
      zIndex: 10,
    },
    title: {
      fontSize: '20px',
      fontWeight: 'bold',
      margin: 0,
    },
    sidebar: {
      width: '300px',
      backgroundColor: '#1a1a1a',
      padding: '20px',
      overflowY: 'auto',
      borderLeft: '1px solid #333',
    },
    sidebarTitle: {
      fontSize: '18px',
      fontWeight: 'bold',
      marginBottom: '15px',
      color: '#fff',
    },
    relatedVideoItem: {
      padding: '10px',
      marginBottom: '10px',
      backgroundColor: '#2a2a2a',
      borderRadius: '5px',
      cursor: 'pointer',
      transition: 'background-color 0.3s',
    },
    relatedVideoItemHover: {
      backgroundColor: '#3a3a3a',
    },
    relatedVideoTitle: {
      fontSize: '14px',
      color: '#fff',
      margin: 0,
    },
    error: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      color: '#f44336',
      fontSize: '18px',
    },
    loading: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      color: '#fff',
      fontSize: '18px',
    },
  };

  if (loading) {
    return <div style={styles.loading}>Loading video...</div>;
  }

  if (error) {
    return <div style={styles.error}>{error}</div>;
  }

  if (!currentVideo) {
    return <div style={styles.error}>Video not found</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.videoInfo}>
        <h2 style={styles.title}>{currentVideo.title || 'Untitled Video'}</h2>
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={styles.videoContainer}>
          <video
            ref={videoRef}
            style={styles.video}
            controls
            autoPlay
            playsInline
            onEnded={handleVideoEnd}
            onPlay={() => setIsPaused(false)}
            onPause={() => setIsPaused(true)}
          >
            Your browser does not support the video tag.
          </video>
          <div style={styles.controls}>
            <button
              onClick={handlePrevious}
              style={styles.button}
              title="Previous video"
            >
              ⏮ Previous
            </button>
            <button
              onClick={handlePause}
              style={{ ...styles.button, ...styles.buttonPause }}
              title={isPaused ? 'Play' : 'Pause'}
            >
              {isPaused ? '▶ Play' : '⏸ Pause'}
            </button>
            <button
              onClick={handleNext}
              style={styles.button}
              title="Next video"
            >
              Next ⏭
            </button>
            <button
              onClick={handleRepeat}
              style={{ ...styles.button, ...styles.buttonRepeat }}
              title={isRepeating ? 'Disable repeat' : 'Enable repeat'}
            >
              {isRepeating ? '🔁 Repeat: ON' : '🔁 Repeat: OFF'}
            </button>
          </div>
        </div>
        <div style={styles.sidebar}>
          <h3 style={styles.sidebarTitle}>Related Content</h3>
          {relatedVideos.length > 0 ? (
            relatedVideos.map((video) => (
              <div
                key={video.id}
                style={styles.relatedVideoItem}
                onClick={() => handleRelatedVideoClick(video)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = styles.relatedVideoItemHover.backgroundColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = styles.relatedVideoItem.backgroundColor;
                }}
              >
                <p style={styles.relatedVideoTitle}>{video.title || 'Untitled Video'}</p>
              </div>
            ))
          ) : (
            <p style={{ color: '#888' }}>No related videos found</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;

