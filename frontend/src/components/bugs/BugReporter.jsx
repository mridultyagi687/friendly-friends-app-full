import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

function BugReporter() {
  const { user } = useAuth();
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myBugs, setMyBugs] = useState([]);
  const [myBugWindowHours, setMyBugWindowHours] = useState(24);
  const [loadingMyBugs, setLoadingMyBugs] = useState(true);
  const [allBugs, setAllBugs] = useState([]);
  const [loadingAllBugs, setLoadingAllBugs] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState({});
  const [feedback, setFeedback] = useState({ type: null, message: '' });

  useEffect(() => {
    fetchMyBugs();
    if (user?.is_admin) {
      fetchAllBugs();
    }
  }, [user]);

  const fetchMyBugs = async () => {
    try {
      setLoadingMyBugs(true);
      const { data } = await api.get('/api/bugs/mine');
      setMyBugs(Array.isArray(data?.bugs) ? data.bugs : []);
      setMyBugWindowHours(data?.history_window_hours || 24);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Unable to load your bug history right now.',
      });
    } finally {
      setLoadingMyBugs(false);
    }
  };

  const fetchAllBugs = async () => {
    if (!user?.is_admin) return;
    try {
      setLoadingAllBugs(true);
      const { data } = await api.get('/api/bugs');
      setAllBugs(Array.isArray(data?.bugs) ? data.bugs : []);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Unable to load reported bugs.',
      });
    } finally {
      setLoadingAllBugs(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setFeedback({ type: 'error', message: 'Please describe the bug you found.' });
      return;
    }

    setSubmitting(true);
    setFeedback({ type: null, message: '' });
    try {
      await api.post('/api/bugs', {
        title: title.trim(),
        description: description.trim(),
      });
      setTitle('');
      setDescription('');
      setFeedback({
        type: 'success',
        message: 'Bug reported! Friendly Friends admins will take it from here.',
      });
      fetchMyBugs();
      if (user?.is_admin) {
        fetchAllBugs();
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Unable to submit bug report. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolutionNoteChange = (bugId, value) => {
    setResolutionNotes((prev) => ({ ...prev, [bugId]: value }));
  };

  const handleResolve = async (bugId) => {
    const note = resolutionNotes[bugId] || '';
    try {
      await api.put(`/api/bugs/${bugId}/resolve`, { resolution_note: note });
      setFeedback({ type: 'success', message: 'Bug marked as fixed and reporter will be notified!' });
      fetchAllBugs();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Unable to mark bug as resolved.',
      });
    }
  };

  const handleClearAllBugs = async () => {
    if (!window.confirm('Are you sure you want to delete ALL bug reports? This action cannot be undone.')) {
      return;
    }
    try {
      const { data } = await api.delete('/api/bugs/clear-all');
      setFeedback({ type: 'success', message: data.message || 'All bug reports cleared successfully!' });
      fetchAllBugs();
      fetchMyBugs();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Unable to clear bug reports.',
      });
    }
  };

  const renderStatusBadge = (status) => {
    const normalized = status?.toLowerCase();
    const baseStyle = {
      padding: '0.25rem 0.65rem',
      borderRadius: '999px',
      fontSize: '0.85rem',
      fontWeight: 600,
      display: 'inline-block',
      background: theme.colors.glassBackground,
      backdropFilter: 'blur(10px)',
      border: `1px solid ${theme.colors.border}`,
      color: theme.colors.text,
      boxShadow: theme.isDarkMode ? '0 2px 8px rgba(0, 0, 0, 0.1)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
    };

    if (normalized === 'fixed') {
      return <span style={baseStyle}>✓ Fixed</span>;
    }
    return <span style={baseStyle}>● Open</span>;
  };

  const renderBugCard = (bug) => (
    <div key={bug.id} style={styles.bugCard}>
      <div style={styles.bugCardHeader}>
        <h4 style={styles.bugCardTitle}>{bug.title || 'Untitled Bug'}</h4>
        {renderStatusBadge(bug.status)}
      </div>
      <p style={styles.bugCardDescription}>{bug.description}</p>
      <div style={styles.bugCardMeta}>
        <span>Submitted: {new Date(bug.created_at).toLocaleString()}</span>
        {bug.resolved_at && <span>Resolved: {new Date(bug.resolved_at).toLocaleString()}</span>}
      </div>
      {bug.resolution_note && (
        <div style={styles.resolutionNote}>
          <strong>Resolution note:</strong> {bug.resolution_note}
        </div>
      )}
    </div>
  );

  const openAdminBugs = allBugs.filter((bug) => bug.status !== 'fixed');
  const fixedAdminBugs = allBugs.filter((bug) => bug.status === 'fixed');

  const styles = getStyles(theme);

  return (
    <div style={styles.container}>
      <style>{`
        .clear-all-bugs-btn:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3) !important;
          background: rgba(255, 255, 255, 0.3) !important;
        }
        .clear-all-bugs-btn:active {
          transform: translateY(0) !important;
        }
      `}</style>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>🐞 Report Bugs</h1>
          <p style={styles.subtitle}>
            Spot something weird? Report it here once and help the entire Friendly Friends community stay smooth.
          </p>
        </div>
      </header>

      {feedback.message && (
        <div
          style={{
            ...styles.feedback,
            ...(feedback.type === 'error' ? styles.feedbackError : styles.feedbackSuccess),
          }}
        >
          {feedback.message}
        </div>
      )}

      <div style={styles.grid}>
        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>Submit a bug</h2>
          <form style={styles.form} onSubmit={handleSubmit}>
            <input
              style={styles.input}
              placeholder="Optional title (e.g., Files app crashed)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
            />
            <textarea
              style={styles.textarea}
              rows={5}
              placeholder="What happened? Include steps to reproduce or screenshots info."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
            />
            <button
              type="submit"
              style={{
                ...styles.submitButton,
                ...(submitting ? styles.submitButtonDisabled : {}),
              }}
              disabled={submitting}
            >
              {submitting ? 'Sending...' : 'Send Bug Report'}
            </button>
          </form>
          <p style={styles.caption}>
            Your history resets every {myBugWindowHours} hours to keep things tidy, so feel free to report again if it
            reappears.
          </p>
        </div>

        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>Your recent reports</h2>
          {loadingMyBugs ? (
            <div style={styles.emptyState}>Loading your bug history…</div>
          ) : myBugs.length === 0 ? (
            <div style={styles.emptyState}>
              <span role="img" aria-label="party">
                🎉
              </span>
              <p>No bugs reported in the last {myBugWindowHours} hours.</p>
            </div>
          ) : (
            <div style={styles.bugList}>{myBugs.map(renderBugCard)}</div>
          )}
        </div>
      </div>

      {user?.is_admin && (
        <div style={styles.adminPanel}>
          <div style={styles.adminHeader}>
            <h2 style={styles.panelTitle}>Admin • Reported bugs</h2>
            {!loadingAllBugs && allBugs.length > 0 && (
              <button 
                className="clear-all-bugs-btn"
                style={styles.clearAllButton} 
                onClick={handleClearAllBugs}
              >
                🗑️ Clear All Bugs
              </button>
            )}
          </div>
          {loadingAllBugs ? (
            <div style={styles.emptyState}>Loading all bugs…</div>
          ) : (
            <>
              <section style={styles.adminSection}>
                <h3 style={styles.adminSectionTitle}>Needs attention</h3>
                {openAdminBugs.length === 0 ? (
                  <div style={styles.emptyState}>No open bugs! 🙌</div>
                ) : (
                  openAdminBugs.map((bug) => (
                    <div key={bug.id} style={styles.adminBugCard}>
                      <div style={styles.adminBugHeader}>
                        <div>
                          <h4 style={styles.bugCardTitle}>{bug.title || 'Untitled Bug'}</h4>
                          <p style={styles.adminReporter}>By {bug.owner?.username || `User #${bug.owner_id}`}</p>
                        </div>
                        {renderStatusBadge(bug.status)}
                      </div>
                      <p style={styles.bugCardDescription}>{bug.description}</p>
                      <textarea
                        style={styles.adminTextarea}
                        rows={3}
                        placeholder="Resolution note (optional, visible to reporter)"
                        value={resolutionNotes[bug.id] || ''}
                        onChange={(e) => handleResolutionNoteChange(bug.id, e.target.value)}
                      />
                      <button style={styles.resolveButton} onClick={() => handleResolve(bug.id)}>
                        Mark as fixed & notify reporter
                      </button>
                    </div>
                  ))
                )}
              </section>

              {fixedAdminBugs.length > 0 && (
                <section style={styles.adminSection}>
                  <h3 style={styles.adminSectionTitle}>Recently fixed</h3>
                  <div style={styles.bugList}>{fixedAdminBugs.map(renderBugCard)}</div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const getStyles = (theme) => ({
  container: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2.5rem',
    margin: 0,
    color: theme.colors.text,
    background: theme.isDarkMode 
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : 'linear-gradient(135deg, #000000 0%, #333333 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontWeight: 700,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: '1.1rem',
    marginTop: '0.5rem',
  },
  feedback: {
    padding: '0.85rem 1rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
    fontWeight: 500,
    backdropFilter: 'blur(10px)',
  },
  feedbackError: {
    background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(255, 82, 82, 0.15) 100%)',
    border: '1px solid rgba(255, 107, 107, 0.3)',
    color: '#ff6b6b',
  },
  feedbackSuccess: {
    background: 'linear-gradient(135deg, rgba(72, 187, 120, 0.15) 0%, rgba(56, 161, 105, 0.15) 100%)',
    border: '1px solid rgba(72, 187, 120, 0.3)',
    color: '#48bb78',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem',
  },
  panel: {
    background: theme.colors.cardBackground,
    backdropFilter: 'blur(20px)',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '20px',
    padding: '1.75rem',
    boxShadow: theme.isDarkMode ? '0 15px 35px rgba(0, 0, 0, 0.3)' : '0 15px 35px rgba(0, 0, 0, 0.1)',
  },
  panelTitle: {
    margin: '0 0 1.25rem 0',
    fontSize: '1.35rem',
    color: theme.colors.text,
    fontWeight: 600,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    borderRadius: '12px',
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.inputBackground,
    backdropFilter: 'blur(10px)',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    color: theme.colors.text,
  },
  textarea: {
    borderRadius: '12px',
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.inputBackground,
    backdropFilter: 'blur(10px)',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    resize: 'vertical',
    color: theme.colors.text,
  },
  submitButton: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    padding: '0.85rem 1.5rem',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  submitButtonDisabled: {
    opacity: 0.65,
    cursor: 'not-allowed',
  },
  caption: {
    marginTop: '1rem',
    color: theme.colors.textTertiary,
    fontSize: '0.95rem',
  },
  bugList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  bugCard: {
    borderRadius: '16px',
    border: `1px solid ${theme.colors.border}`,
    padding: '1rem 1.2rem',
    background: theme.colors.inputBackground,
    backdropFilter: 'blur(10px)',
  },
  bugCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  bugCardTitle: {
    margin: 0,
    fontSize: '1rem',
    color: theme.colors.text,
    fontWeight: 600,
  },
  bugCardDescription: {
    margin: 0,
    color: theme.colors.textSecondary,
    lineHeight: 1.5,
  },
  bugCardMeta: {
    marginTop: '0.75rem',
    fontSize: '0.85rem',
    color: theme.colors.textTertiary,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  resolutionNote: {
    marginTop: '0.75rem',
    padding: '0.75rem',
    borderRadius: '10px',
    background: theme.isDarkMode 
      ? 'rgba(102, 126, 234, 0.2)'
      : 'rgba(102, 126, 234, 0.1)',
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.text,
    fontSize: '0.9rem',
  },
  emptyState: {
    textAlign: 'center',
    color: theme.colors.textTertiary,
    padding: '1.5rem',
  },
  adminPanel: {
    marginTop: '2.5rem',
    padding: '1.75rem',
    borderRadius: '20px',
    background: 'linear-gradient(135deg, rgba(26, 26, 46, 0.95) 0%, rgba(30, 30, 60, 0.95) 100%)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    boxShadow: '0 15px 45px rgba(0, 0, 0, 0.3)',
  },
  adminHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  clearAllButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: '#ffffff',
    padding: '0.75rem 1.5rem',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  adminSection: {
    marginTop: '1.5rem',
  },
  adminSectionTitle: {
    marginBottom: '1rem',
    fontSize: '1.15rem',
    color: theme.colors.text,
    fontWeight: 600,
  },
  adminBugCard: {
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '16px',
    padding: '1.25rem',
    marginBottom: '1rem',
    background: theme.colors.inputBackground,
    backdropFilter: 'blur(10px)',
  },
  adminBugHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  adminReporter: {
    margin: 0,
    color: theme.colors.textSecondary,
    fontSize: '0.9rem',
  },
  adminTextarea: {
    width: '100%',
    marginTop: '1rem',
    borderRadius: '12px',
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.inputBackground,
    backdropFilter: 'blur(10px)',
    padding: '0.75rem',
    fontSize: '0.95rem',
    resize: 'vertical',
    color: theme.colors.text,
  },
  resolveButton: {
    marginTop: '1rem',
    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    color: '#fff',
    border: 'none',
    padding: '0.75rem 1.25rem',
    borderRadius: '10px',
    fontWeight: 600,
    cursor: 'pointer',
  },
});

export default BugReporter;

