import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import './ResearchViewer.css';

function ResearchViewer() {
  const { researchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [research, setResearch] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [markingFinished, setMarkingFinished] = useState(false);
  const [photoUrls, setPhotoUrls] = useState({}); // Cache for photo blob URLs
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchResearch();
    fetchSubmissions();
  }, [user, researchId]);

  // Load photos as blobs with authentication
  useEffect(() => {
    if (submissions.length === 0) return;

    const loadPhotos = async () => {
      const newPhotoUrls = {};
      const photoKeysToLoad = [];

      // First, identify which photos need to be loaded
      for (const submission of submissions) {
        if (submission.photos && submission.photos.length > 0) {
          for (const photo of submission.photos) {
            const photoKey = `${submission.id}_${photo.id}`;
            // Check if we already have this photo loaded
            setPhotoUrls(prev => {
              if (!prev[photoKey] && photo.filename) {
                photoKeysToLoad.push({ photoKey, filename: photo.filename });
              }
              return prev; // Don't change state here, just check
            });
          }
        }
      }

      // Load all photos in parallel
      if (photoKeysToLoad.length > 0) {
        console.log(`Loading ${photoKeysToLoad.length} research photos...`);
        const loadPromises = photoKeysToLoad.map(async ({ photoKey, filename }) => {
          try {
            const response = await api.get(`/uploads/research_photos/${filename}`, {
              responseType: 'blob',
            });
            const blobUrl = URL.createObjectURL(response.data);
            newPhotoUrls[photoKey] = blobUrl;
            console.log(`Loaded photo: ${filename} -> ${photoKey}`);
          } catch (err) {
            console.error(`Failed to load photo ${filename}:`, err.response?.status, err.message);
          }
        });

        await Promise.all(loadPromises);

        if (Object.keys(newPhotoUrls).length > 0) {
          setPhotoUrls(prev => {
            const updated = { ...prev, ...newPhotoUrls };
            console.log(`Photo URLs updated. Total: ${Object.keys(updated).length}`);
            return updated;
          });
        }
      }
    };

    loadPhotos();

    // Cleanup blob URLs only on unmount
    return () => {
      // Don't revoke on every render - only on unmount
      // The component will handle cleanup when it unmounts
    };
  }, [submissions]);

  // Cleanup all blob URLs when component unmounts
  useEffect(() => {
    return () => {
      setPhotoUrls(prev => {
        Object.values(prev).forEach(url => {
          if (url && typeof url === 'string' && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
        return {};
      });
    };
  }, []);

  const fetchResearch = async () => {
    try {
      const { data } = await api.get(`/api/research/${researchId}`);
      setResearch(data.research);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load research');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const { data } = await api.get(`/api/research/${researchId}/submissions`);
      setSubmissions(Array.isArray(data?.submissions) ? data.submissions : []);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    }
  };

  const handleParticipate = async () => {
    try {
      await api.post(`/api/research/${researchId}/participate`);
      await fetchResearch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join research');
    }
  };

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // No limit on number of photos
    setSelectedPhotos(prev => [...prev, ...files]);
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreviews(prev => [...prev, { file, preview: event.target.result }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleMarkFinished = async () => {
    if (!window.confirm('Are you sure you want to mark this research as finished? This will block new participants and submissions.')) {
      return;
    }

    setMarkingFinished(true);
    setError(null);

    try {
      await api.put(`/api/research/${researchId}`, {
        status: 'completed',
      });

      await fetchResearch();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark research as finished');
    } finally {
      setMarkingFinished(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!textContent.trim()) {
      setError('Text content is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('text_content', textContent);
      selectedPhotos.forEach(photo => {
        formData.append('photos', photo);
      });

      await api.post(`/api/research/${researchId}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setTextContent('');
      setSelectedPhotos([]);
      setPhotoPreviews([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      await fetchSubmissions();
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.loginPrompt}>
          <h1 style={styles.title}>🔬 Research</h1>
          <p style={styles.promptText}>Please log in to view research.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading research...</div>
      </div>
    );
  }

  if (!research) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Research not found</div>
        <button style={styles.backButton} onClick={() => navigate('/research')}>
          ← Back to Research
        </button>
      </div>
    );
  }

  const isActive = research.status === 'active';
  const canParticipate = isActive && !research.is_participant;
  const canSubmit = isActive && research.is_participant;
  const isCreator = user && research.created_by === user.id;
  const canMarkFinished = isCreator && isActive;

  return (
    <div style={styles.container}>
      <button style={styles.backButton} onClick={() => navigate('/research')}>
        ← Back to Research
      </button>

      <header style={styles.header}>
        <div>
          <div style={styles.badgeRow}>
            <h1 style={styles.title}>{research.title}</h1>
            <span style={isActive ? styles.activeBadge : styles.completedBadge}>
              {research.status}
            </span>
          </div>
          <p style={styles.description}>{research.description}</p>
          <div style={styles.meta}>
            <span>👥 {research.participant_count || 0} participants</span>
            {research.completed_at && (
              <span>Completed {new Date(research.completed_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div style={styles.errorBanner}>
          <span style={styles.errorIcon}>⚠️</span>
          {error}
        </div>
      )}

      {canMarkFinished && (
        <section style={styles.creatorSection}>
          <h2 style={styles.sectionTitle}>🔧 Research Management</h2>
          <p style={styles.creatorText}>
            As the research creator, you can mark this research as finished. This will block new participants and submissions.
          </p>
          <button 
            style={styles.finishButton} 
            onClick={handleMarkFinished}
            disabled={markingFinished}
          >
            {markingFinished ? 'Marking as Finished...' : '✅ Mark as Finished'}
          </button>
        </section>
      )}

      {research.results && (
        <section style={styles.resultsSection}>
          <h2 style={styles.sectionTitle}>📊 Research Results</h2>
          <div style={styles.resultsContent}>{research.results}</div>
        </section>
      )}

      {canParticipate && (
        <section style={styles.participateSection}>
          <h2 style={styles.sectionTitle}>Join This Research</h2>
          <p style={styles.participateText}>
            Join this research project to contribute your insights and help the community!
          </p>
          <button style={styles.participateButton} onClick={handleParticipate}>
            ➕ Join Research
          </button>
        </section>
      )}

      {canSubmit && (
        <section style={styles.submitSection}>
          <h2 style={styles.sectionTitle}>Submit Your Information</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Your Information *</label>
              <textarea
                style={styles.textarea}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Share your insights, observations, or data related to this research..."
                rows={8}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Photos (Optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                style={styles.fileInput}
              />
              {photoPreviews.length > 0 && (
                <div style={styles.photoPreviewGrid}>
                  {photoPreviews.map((preview, index) => (
                    <div key={index} style={styles.photoPreview}>
                      <img src={preview.preview} alt={`Preview ${index + 1}`} style={styles.previewImage} />
                      <button
                        type="button"
                        style={styles.removePhotoButton}
                        onClick={() => removePhoto(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              style={{
                ...styles.submitButton,
                ...(submitting ? styles.submitButtonDisabled : {}),
              }}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Information'}
            </button>
          </form>
        </section>
      )}

      {submissions.length > 0 && (
        <section style={styles.submissionsSection}>
          <h2 style={styles.sectionTitle}>
            {isCreator || user.is_admin ? 'All Submissions' : 'Your Submissions'}
            {isCreator && research.status === 'completed' && (
              <span style={styles.submissionCount}> ({submissions.length} total)</span>
            )}
          </h2>
          <div style={styles.submissionsList}>
            {submissions.map((submission) => (
              <div key={submission.id} style={styles.submissionCard}>
                <div style={styles.submissionHeader}>
                  <div style={styles.submissionHeaderLeft}>
                    <span style={styles.submissionDate}>
                      {new Date(submission.created_at).toLocaleString()}
                    </span>
                    {(isCreator || user.is_admin) && submission.user && (
                      <span style={styles.submissionUser}>
                        👤 {submission.user.username} ({submission.user.email})
                      </span>
                    )}
                  </div>
                </div>
                <p style={styles.submissionText}>{submission.text_content}</p>
                {submission.photos && submission.photos.length > 0 && (
                  <div style={styles.submissionPhotos}>
                    {submission.photos.map((photo) => {
                      const photoKey = `${submission.id}_${photo.id}`;
                      const imageUrl = photoUrls[photoKey];
                      return (
                        <div key={photo.id} style={styles.photoContainer}>
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={`Submission photo ${photo.id}`}
                              style={styles.submissionPhoto}
                              onError={(e) => {
                                console.error('Failed to display research photo:', photo.filename, photoKey);
                                e.target.style.display = 'none';
                                e.target.nextSibling?.style?.display === 'none' && (e.target.nextSibling.style.display = 'flex');
                              }}
                            />
                          ) : (
                            <div style={styles.photoPlaceholder}>
                              <span style={styles.photoLoadingText}>Loading photo...</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '2rem 1.5rem 4rem',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    backgroundSize: '400% 400%',
  },
  loginPrompt: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '3rem',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
  },
  header: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
  },
  activeBadge: {
    background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
    color: '#ffffff',
    padding: '0.5rem 1rem',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  completedBadge: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    padding: '0.5rem 1rem',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  description: {
    fontSize: '1.1rem',
    color: '#475569',
    lineHeight: 1.6,
    marginBottom: '1rem',
  },
  meta: {
    display: 'flex',
    gap: '1.5rem',
    fontSize: '0.9rem',
    color: '#64748b',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#d32f2f',
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem',
    backgroundColor: 'rgba(255, 235, 238, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(211, 47, 47, 0.2)',
  },
  errorIcon: {
    fontSize: '1.25rem',
  },
  resultsSection: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: '1rem',
  },
  resultsContent: {
    fontSize: '1rem',
    color: '#1f2937',
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
  },
  participateSection: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    textAlign: 'center',
  },
  participateText: {
    fontSize: '1rem',
    color: '#475569',
    marginBottom: '1.5rem',
  },
  participateButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    border: 'none',
    padding: '0.875rem 2rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
  },
  submitSection: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#0f172a',
  },
  textarea: {
    width: '100%',
    borderRadius: '12px',
    border: '2px solid rgba(102, 126, 234, 0.3)',
    padding: '1rem',
    fontSize: '1rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '150px',
  },
  fileInput: {
    fontSize: '0.95rem',
  },
  photoPreviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
  },
  photoPreview: {
    position: 'relative',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '120px',
    objectFit: 'cover',
    borderRadius: '8px',
  },
  removePhotoButton: {
    position: 'absolute',
    top: '0.25rem',
    right: '0.25rem',
    background: 'rgba(211, 47, 47, 0.9)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    border: 'none',
    padding: '0.875rem 2rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
    alignSelf: 'flex-start',
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  submissionsSection: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  submissionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  submissionCard: {
    padding: '1.5rem',
    background: 'rgba(102, 126, 234, 0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(102, 126, 234, 0.2)',
  },
  submissionHeader: {
    marginBottom: '0.75rem',
  },
  submissionDate: {
    fontSize: '0.85rem',
    color: '#64748b',
  },
  submissionText: {
    fontSize: '1rem',
    color: '#1f2937',
    lineHeight: 1.6,
    marginBottom: '1rem',
    whiteSpace: 'pre-wrap',
  },
  submissionPhotos: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
  },
  photoContainer: {
    width: '100%',
    height: '200px',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  submissionPhoto: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  photoLoadingText: {
    color: '#64748b',
    fontSize: '0.9rem',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '1.1rem',
  },
  error: {
    textAlign: 'center',
    padding: '3rem',
    color: '#d32f2f',
    fontSize: '1.1rem',
  },
  promptText: {
    fontSize: '1.1rem',
    color: '#666',
  },
  creatorSection: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '2rem',
    marginBottom: '2rem',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    border: '2px solid rgba(102, 126, 234, 0.3)',
  },
  creatorText: {
    fontSize: '1rem',
    color: '#475569',
    marginBottom: '1.5rem',
    lineHeight: 1.6,
  },
  finishButton: {
    background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
    color: '#ffffff',
    border: 'none',
    padding: '0.875rem 2rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.4)',
    transition: 'all 0.3s ease',
  },
  submissionHeaderLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  submissionUser: {
    fontSize: '0.9rem',
    color: '#667eea',
    fontWeight: '600',
  },
  submissionCount: {
    fontSize: '1rem',
    color: '#64748b',
    fontWeight: '400',
  },
};

export default ResearchViewer;

