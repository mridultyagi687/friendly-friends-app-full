import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

function Robots() {
  const [robots, setRobots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.is_admin) {
      navigate('/');
      return;
    }
    fetchRobots();
  }, [user, navigate]);

  const fetchRobots = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/robots');
      setRobots(response.data?.robots || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch robots:', err);
      if (err.response?.status === 401) {
        setError('Please log in as an admin to manage robots.');
      } else {
        setError('Failed to fetch robots: ' + (err.response?.data?.error || err.message));
      }
      setRobots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Robot name is required.');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await api.post('/api/robots', formData);
      setSuccess('Robot created successfully.');
      setFormData({ name: '', description: '' });
      setShowForm(false);
      await fetchRobots();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Failed to create robot';
      if (err.response?.status === 401) {
        setError('Please log in as an admin to create robots.');
      } else {
        setError('Failed to create robot: ' + message);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this robot?')) {
      return;
    }

    try {
      await api.delete(`/api/robots/${id}`);
      setSuccess('Robot deleted successfully.');
      await fetchRobots();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Failed to delete robot';
      if (err.response?.status === 401) {
        setError('Please log in as an admin to delete robots.');
      } else {
        setError('Failed to delete robot: ' + message);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '' });
    setShowForm(false);
    setError(null);
    setSuccess(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('URL copied to clipboard!');
      setTimeout(() => setSuccess(null), 2000);
    }).catch(() => {
      setError('Failed to copy to clipboard');
    });
  };

  if (!user?.is_admin) {
    return null;
  }

  // Get base URL for API
  const getBaseUrl = () => {
    const apiBase = api.defaults.baseURL || window.location.origin;
    return apiBase.replace(/\/$/, '');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🤖 Robots</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              handleCancel();
            }
          }}
          style={showForm ? styles.cancelButton : styles.newButton}
        >
          {showForm ? '✕ Cancel' : '+ New Robot'}
        </button>
      </div>
      
      <p style={styles.subtitle}>
        Create and manage robots. Each robot gets a unique API URL that it can use to send vision and receive commands.
      </p>

      {error && (
        <div style={styles.error}>
          <span style={styles.errorIcon}>⚠️</span>
          {error}
        </div>
      )}
      {success && (
        <div style={styles.success}>
          <span style={styles.successIcon}>✓</span>
          {success}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <h3 style={styles.formTitle}>Create New Robot</h3>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Robot Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={styles.input}
                placeholder="e.g., robot-1, my-robot"
                required
                pattern="[a-zA-Z0-9-_]+"
                title="Only letters, numbers, hyphens, and underscores allowed"
              />
              <div style={styles.helpText}>
                Robot name will be used in the API URL. Only letters, numbers, hyphens, and underscores allowed.
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={styles.textarea}
                placeholder="Optional description for this robot..."
                rows={4}
              />
            </div>
          </div>
          <div style={styles.formActions}>
            <button type="submit" style={styles.submitButton}>
              Create Robot
            </button>
            <button type="button" onClick={handleCancel} style={styles.cancelButton}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loading}>Loading robots...</div>
        ) : robots.length === 0 ? (
          <div style={styles.empty}>
            <span style={styles.emptyIcon}>🤖</span>
            <p>No robots yet. Click "+ New Robot" to create your first robot.</p>
          </div>
        ) : (
          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <div style={styles.headerCell}>Name</div>
              <div style={styles.headerCell}>Description</div>
              <div style={styles.headerCell}>API URL</div>
              <div style={styles.headerCell}>Status</div>
              <div style={styles.headerCell}>Actions</div>
            </div>
            {robots.map((robot) => {
              const apiUrl = robot.api_url || `${getBaseUrl()}/api/robots/${robot.name}`;
              return (
                <div key={robot.id} style={styles.tableRow}>
                  <div style={styles.cell}>
                    <div style={styles.nameText}>{robot.name}</div>
                  </div>
                  <div style={styles.cell}>
                    <div style={styles.descriptionText}>{robot.description || 'No description'}</div>
                  </div>
                  <div style={styles.cell}>
                    <div style={styles.urlContainer}>
                      <code style={styles.urlText}>{apiUrl}</code>
                      <button
                        onClick={() => copyToClipboard(apiUrl)}
                        style={styles.copyButton}
                        title="Copy URL"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  <div style={styles.cell}>
                    <span style={robot.is_active ? styles.activeBadge : styles.inactiveBadge}>
                      {robot.is_active ? '🟢 Active' : '🔴 Inactive'}
                    </span>
                  </div>
                  <div style={styles.cell}>
                    <button
                      onClick={() => handleDelete(robot.id)}
                      style={styles.deleteButton}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={styles.infoBox}>
        <h3 style={styles.infoTitle}>📖 How to Use</h3>
        <div style={styles.infoContent}>
          <p><strong>1. Create a Robot:</strong> Click "+ New Robot" and give it a name.</p>
          <p><strong>2. Get the API URL:</strong> After creating, copy the API URL shown in the table.</p>
          <p><strong>3. Configure Your Robot:</strong> Point your robot to the API URL:</p>
          <ul style={styles.infoList}>
            <li><code>POST {base_url}/api/robots/{robot_name}/vision</code> - Send camera images</li>
            <li><code>POST {base_url}/api/robots/{robot_name}/command</code> - Send voice/text commands and get AI responses</li>
          </ul>
          <p><strong>4. AI Response Format:</strong> The AI will respond with JSON like:</p>
          <pre style={styles.codeBlock}>
{`{
  "action": "move_forward",
  "parameters": {"distance": 10},
  "speak": "Okay, moving forward!"
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    backgroundSize: '400% 400%',
    animation: 'gradientShift 15s ease infinite',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
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
    marginBottom: '2rem',
    maxWidth: '800px',
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
    boxShadow: '0 4px 15px rgba(211, 47, 47, 0.1)',
  },
  errorIcon: {
    fontSize: '1.25rem',
  },
  success: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#2e7d32',
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem',
    backgroundColor: 'rgba(232, 245, 233, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(46, 125, 50, 0.2)',
    boxShadow: '0 4px 15px rgba(46, 125, 50, 0.1)',
  },
  successIcon: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
  },
  newButton: {
    padding: '0.875rem 1.75rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.3s ease',
  },
  cancelButton: {
    padding: '0.875rem 1.75rem',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    boxShadow: '0 4px 15px rgba(245, 87, 108, 0.4)',
    transition: 'all 0.3s ease',
  },
  form: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '2rem',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    marginBottom: '2rem',
    border: '1px solid rgba(102, 126, 234, 0.3)',
  },
  formTitle: {
    marginBottom: '1.5rem',
    color: '#333',
    fontSize: '1.5rem',
    fontWeight: '600',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '1.5rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#333',
  },
  helpText: {
    fontSize: '0.85rem',
    color: '#666',
    marginTop: '0.25rem',
    fontStyle: 'italic',
  },
  input: {
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    border: '2px solid rgba(102, 126, 234, 0.3)',
    borderRadius: '12px',
    transition: 'all 0.3s ease',
    backgroundColor: 'white',
    color: '#000000',
  },
  textarea: {
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    border: '2px solid rgba(102, 126, 234, 0.3)',
    borderRadius: '12px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '100px',
    backgroundColor: 'white',
    color: '#000000',
  },
  formActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem',
  },
  submitButton: {
    padding: '0.875rem 1.75rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.3s ease',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '1.1rem',
  },
  empty: {
    textAlign: 'center',
    padding: '3rem',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(102, 126, 234, 0.3)',
  },
  emptyIcon: {
    fontSize: '3rem',
    display: 'block',
    marginBottom: '1rem',
  },
  tableContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    padding: '2rem',
    border: '1px solid rgba(102, 126, 234, 0.3)',
    overflow: 'hidden',
    marginBottom: '2rem',
  },
  table: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '0.75rem',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 2fr 3fr 1fr 1fr',
    padding: '1.25rem 1rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontWeight: '600',
    fontSize: '0.95rem',
    borderRadius: '12px',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 2fr 3fr 1fr 1fr',
    padding: '1.25rem 1rem',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: 'white',
    borderRadius: '12px',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  headerCell: {
    padding: '0 0.5rem',
  },
  cell: {
    padding: '0 0.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  nameText: {
    fontWeight: '600',
    color: '#333',
    fontSize: '1rem',
  },
  descriptionText: {
    fontSize: '0.9rem',
    color: '#666',
    lineHeight: '1.4',
  },
  urlContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    width: '100%',
  },
  urlText: {
    fontSize: '0.85rem',
    color: '#667eea',
    backgroundColor: '#f5f5f5',
    padding: '0.25rem 0.5rem',
    borderRadius: '6px',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  copyButton: {
    padding: '0.25rem 0.5rem',
    background: 'transparent',
    border: '1px solid #667eea',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s ease',
  },
  activeBadge: {
    display: 'inline-block',
    padding: '0.375rem 0.875rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600',
    background: 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
    color: 'white',
  },
  inactiveBadge: {
    display: 'inline-block',
    padding: '0.375rem 0.875rem',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600',
    backgroundColor: '#e0e0e0',
    color: '#666',
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    boxShadow: '0 2px 8px rgba(245, 87, 108, 0.3)',
    transition: 'all 0.3s ease',
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(102, 126, 234, 0.3)',
  },
  infoTitle: {
    marginTop: 0,
    marginBottom: '1rem',
    color: '#333',
    fontSize: '1.5rem',
  },
  infoContent: {
    color: '#666',
    lineHeight: '1.6',
  },
  infoList: {
    marginLeft: '1.5rem',
    marginTop: '0.5rem',
    marginBottom: '1rem',
  },
  codeBlock: {
    backgroundColor: '#f5f5f5',
    padding: '1rem',
    borderRadius: '8px',
    overflow: 'auto',
    fontSize: '0.9rem',
    color: '#333',
    marginTop: '0.5rem',
  },
};

export default Robots;

