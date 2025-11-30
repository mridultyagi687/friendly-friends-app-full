import React, { useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

function ResearchData() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [aggregatedData, setAggregatedData] = useState(null);
  const [sources, setSources] = useState([]);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || searching) return;

    setSearching(true);
    setError(null);
    setAggregatedData(null);
    setSources([]);

    try {
      const { data } = await api.post('/api/research/data/search', {
        query: searchQuery.trim(),
      });

      if (data) {
        setAggregatedData(data.aggregated_data);
        setSources(data.sources || []);
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to search research data. Please try again.';
      setError(message);
    } finally {
      setSearching(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>🔬 Research Data</h1>
        <p style={styles.subtitle}>Search and aggregate data from multiple research sources</p>
      </div>

      <form onSubmit={handleSearch} style={styles.searchForm}>
        <div style={styles.searchContainer}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter your research query..."
            style={styles.searchInput}
            disabled={searching}
          />
          <button
            type="submit"
            style={styles.searchButton}
            disabled={searching || !searchQuery.trim()}
          >
            {searching ? '🔍 Searching...' : '🔍 Search'}
          </button>
        </div>
      </form>

      {error && (
        <div style={styles.error}>
          <span style={styles.errorIcon}>⚠️</span>
          {error}
        </div>
      )}

      {aggregatedData && (
        <div style={styles.resultsContainer}>
          <div style={styles.aggregatedSection}>
            <h2 style={styles.sectionTitle}>📊 Aggregated Research Data</h2>
            <div style={styles.aggregatedContent}>
              {aggregatedData.split('\n').map((line, index) => (
                <p key={index} style={styles.aggregatedLine}>
                  {line || '\u00A0'}
                </p>
              ))}
            </div>
          </div>

          {sources.length > 0 && (
            <div style={styles.sourcesSection}>
              <h2 style={styles.sectionTitle}>
                📚 Sources ({sources.length})
              </h2>
              <div style={styles.sourcesList}>
                {sources.map((source) => (
                  <div key={source.id} style={styles.sourceCard}>
                    <div style={styles.sourceHeader}>
                      <h3 style={styles.sourceTitle}>{source.title}</h3>
                    </div>
                    <div style={styles.sourceMeta}>
                      <div style={styles.sourceMetaItem}>
                        <span style={styles.metaLabel}>📅 Date:</span>
                        <span style={styles.metaValue}>{formatDate(source.date)}</span>
                      </div>
                      <div style={styles.sourceMetaItem}>
                        <span style={styles.metaLabel}>👤 Published By:</span>
                        <span style={styles.metaValue}>{source.published_by}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!aggregatedData && !searching && !error && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🔬</div>
          <p style={styles.emptyText}>
            Enter a search query to find and aggregate research data from multiple sources.
          </p>
          <p style={styles.emptyHint}>
            The AI will combine relevant information from all matching research and present it in a comprehensive format.
          </p>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '2rem auto',
    padding: '0 1rem',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    backgroundSize: '400% 400%',
    animation: 'gradientShift 15s ease infinite',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: '0.5rem',
  },
  searchForm: {
    marginBottom: '2rem',
  },
  searchContainer: {
    display: 'flex',
    gap: '1rem',
    maxWidth: '800px',
    margin: '0 auto',
  },
  searchInput: {
    flex: 1,
    padding: '1rem 1.25rem',
    fontSize: '1rem',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    color: '#1f2937',
    outline: 'none',
    transition: 'all 0.3s ease',
  },
  searchButton: {
    padding: '1rem 2rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#d32f2f',
    margin: '1rem 0',
    padding: '1rem 1.25rem',
    backgroundColor: 'rgba(255, 235, 238, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(211, 47, 47, 0.2)',
    boxShadow: '0 4px 15px rgba(211, 47, 47, 0.1)',
  },
  errorIcon: {
    fontSize: '1.25rem',
  },
  resultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  aggregatedSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(102, 126, 234, 0.3)',
    color: '#1f2937',
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: '1.5rem',
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1f2937',
    borderBottom: '2px solid rgba(102, 126, 234, 0.2)',
    paddingBottom: '0.75rem',
  },
  aggregatedContent: {
    lineHeight: '1.8',
    fontSize: '1rem',
    color: '#1f2937',
    whiteSpace: 'pre-wrap',
  },
  aggregatedLine: {
    margin: '0.5rem 0',
    color: '#1f2937',
  },
  sourcesSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(102, 126, 234, 0.3)',
    color: '#1f2937',
  },
  sourcesList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  sourceCard: {
    backgroundColor: 'rgba(102, 126, 234, 0.05)',
    borderRadius: '12px',
    padding: '1.25rem',
    border: '1px solid rgba(102, 126, 234, 0.2)',
    transition: 'all 0.3s ease',
  },
  sourceHeader: {
    marginBottom: '1rem',
  },
  sourceTitle: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1f2937',
  },
  sourceMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  sourceMetaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
  },
  metaLabel: {
    fontWeight: '600',
    color: '#667eea',
  },
  metaValue: {
    color: '#1f2937',
  },
  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '3rem',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(102, 126, 234, 0.3)',
    color: '#1f2937',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  emptyText: {
    fontSize: '1.1rem',
    marginBottom: '0.5rem',
    color: '#1f2937',
  },
  emptyHint: {
    fontSize: '0.95rem',
    color: '#666',
    fontStyle: 'italic',
  },
};

export default ResearchData;

