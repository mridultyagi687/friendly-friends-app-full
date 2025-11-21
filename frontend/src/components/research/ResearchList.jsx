import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import './ResearchList.css';

function ResearchList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [research, setResearch] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchResearch();
  }, [user]);

  const fetchResearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/research');
      setResearch(Array.isArray(data?.research) ? data.research : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load research');
    } finally {
      setLoading(false);
    }
  };

  const handleViewResearch = (researchId) => {
    navigate(`/research/${researchId}`);
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.loginPrompt}>
          <h1 style={styles.title}>🔬 Live Research</h1>
          <p style={styles.promptText}>Please log in to participate in research.</p>
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

  const activeResearch = research.filter(r => r.status === 'active');
  const completedResearch = research.filter(r => r.status === 'completed');

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>🔬 Live Research</h1>
          <p style={styles.subtitle}>
            Participate in community research projects and contribute to discoveries!
          </p>
        </div>
        {user?.is_admin && (
          <button
            style={styles.createButton}
            onClick={() => navigate('/research/create')}
          >
            ➕ Create Research
          </button>
        )}
      </header>

      {error && (
        <div style={styles.error}>
          <span style={styles.errorIcon}>⚠️</span>
          {error}
        </div>
      )}

      {activeResearch.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>🟢 Active Research</h2>
          <div style={styles.grid}>
            {activeResearch.map((r) => (
              <div key={r.id} style={styles.card} onClick={() => handleViewResearch(r.id)}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{r.title}</h3>
                  <span style={styles.badge}>{r.status}</span>
                </div>
                <p style={styles.cardDescription}>{r.description}</p>
                <div style={styles.cardFooter}>
                  <span style={styles.meta}>
                    👥 {r.participant_count || 0} participants
                  </span>
                  {r.is_participant && (
                    <span style={styles.participantBadge}>✓ Participating</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {completedResearch.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>✅ Completed Research</h2>
          <div style={styles.grid}>
            {completedResearch.map((r) => (
              <div key={r.id} style={styles.card} onClick={() => handleViewResearch(r.id)}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>{r.title}</h3>
                  <span style={styles.completedBadge}>{r.status}</span>
                </div>
                <p style={styles.cardDescription}>{r.description}</p>
                {r.results && (
                  <div style={styles.resultsPreview}>
                    <strong>Results:</strong> {r.results.substring(0, 150)}...
                  </div>
                )}
                <div style={styles.cardFooter}>
                  <span style={styles.meta}>
                    👥 {r.participant_count || 0} participants
                  </span>
                  {r.completed_at && (
                    <span style={styles.meta}>
                      Completed {new Date(r.completed_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {research.length === 0 && (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>🔬</span>
          <p>No research projects yet.</p>
          {user?.is_admin && (
            <button
              style={styles.createButton}
              onClick={() => navigate('/research/create')}
            >
              Create First Research
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: 0,
  },
  subtitle: {
    fontSize: '1.1rem',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: '0.5rem',
  },
  createButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    border: 'none',
    padding: '0.875rem 1.75rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.3s ease',
  },
  error: {
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
  section: {
    marginBottom: '3rem',
  },
  sectionTitle: {
    fontSize: '1.75rem',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: '1.5rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '1.5rem',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    border: '1px solid rgba(102, 126, 234, 0.3)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#0f172a',
    margin: 0,
    flex: 1,
  },
  badge: {
    background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
    color: '#ffffff',
    padding: '0.25rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: '600',
    marginLeft: '0.5rem',
  },
  completedBadge: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    padding: '0.25rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: '600',
    marginLeft: '0.5rem',
  },
  cardDescription: {
    fontSize: '0.95rem',
    color: '#475569',
    lineHeight: 1.6,
    marginBottom: '1rem',
  },
  resultsPreview: {
    fontSize: '0.9rem',
    color: '#1f2937',
    padding: '0.75rem',
    background: 'rgba(102, 126, 234, 0.1)',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
    color: '#64748b',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  participantBadge: {
    background: 'rgba(76, 175, 80, 0.1)',
    color: '#4caf50',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '1.1rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  emptyIcon: {
    fontSize: '4rem',
    display: 'block',
    marginBottom: '1rem',
  },
  promptText: {
    fontSize: '1.1rem',
    color: '#666',
  },
};

export default ResearchList;

