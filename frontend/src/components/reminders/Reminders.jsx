import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import './Reminders.css';

const Reminders = () => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [alarmSound, setAlarmSound] = useState(null);
  const [activeAlarms, setActiveAlarms] = useState([]);
  const alarmCheckInterval = useRef(null);
  const audioContextRef = useRef(null);
  const activeAlarmsRef = useRef([]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminder_time: '',
  });

  // Load reminders
  const fetchReminders = async () => {
    try {
      const { data } = await api.get('/api/reminders');
      setReminders(data.reminders || []);
    } catch (err) {
      console.error('Failed to load reminders:', err);
      setError('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  // Check for upcoming reminders and trigger alarms
  const checkUpcomingReminders = useCallback(async () => {
    // Play alarm sound using Web Audio API
    const playAlarmSound = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const audioContext = audioContextRef.current;
        
        // Resume audio context if suspended (required for autoplay policies)
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Create a pleasant alarm tone (longer and more noticeable)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.3);
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.4);
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.5);

        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.6);
      } catch (err) {
        console.error('Failed to play alarm sound:', err);
      }
    };

    // Trigger alarm for a reminder
    const triggerAlarm = (reminder) => {
      // Request notification permission if not granted
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Reminder: ${reminder.title}`, {
          body: reminder.description || 'Time for your reminder!',
          icon: '/favicon.ico',
          tag: `reminder-${reminder.id}`,
          requireInteraction: true,
        });
      }

      // Play alarm sound (async but don't wait)
      playAlarmSound().catch(err => console.error('Alarm sound error:', err));
    };

    try {
      const { data } = await api.get('/api/reminders/upcoming');
      const upcoming = data.reminders || [];
      
      // Filter out reminders that are already in activeAlarms (using ref for latest value)
      const newAlarms = upcoming.filter(
        reminder => !activeAlarmsRef.current.find(a => a.id === reminder.id)
      );

      if (newAlarms.length > 0) {
        console.log('Triggering alarms for reminders:', newAlarms);
        // Trigger alarms for new reminders
        newAlarms.forEach(reminder => {
          triggerAlarm(reminder);
        });
        const updatedAlarms = [...activeAlarmsRef.current, ...newAlarms];
        activeAlarmsRef.current = updatedAlarms;
        setActiveAlarms(updatedAlarms);
      }
    } catch (err) {
      console.error('Failed to check upcoming reminders:', err);
    }
  }, []);

  // Dismiss alarm
  const handleDismissAlarm = async (reminderId) => {
    try {
      await api.post(`/api/reminders/${reminderId}/dismiss`);
      const updatedAlarms = activeAlarmsRef.current.filter(a => a.id !== reminderId);
      activeAlarmsRef.current = updatedAlarms;
      setActiveAlarms(updatedAlarms);
      await fetchReminders();
    } catch (err) {
      console.error('Failed to dismiss reminder:', err);
    }
  };

  // Create reminder
  const handleCreateReminder = async (e) => {
    e.preventDefault();
    try {
      // Convert local datetime to ISO string for backend
      const reminderData = {
        ...formData,
        reminder_time: formData.reminder_time ? new Date(formData.reminder_time).toISOString() : formData.reminder_time
      };
      await api.post('/api/reminders', reminderData);
      setShowCreateForm(false);
      setFormData({ title: '', description: '', reminder_time: '' });
      await fetchReminders();
    } catch (err) {
      console.error('Failed to create reminder:', err);
      setError('Failed to create reminder');
    }
  };

  // Update reminder
  const handleUpdateReminder = async (e) => {
    e.preventDefault();
    try {
      // Convert local datetime to ISO string for backend
      const reminderData = {
        ...formData,
        reminder_time: formData.reminder_time ? new Date(formData.reminder_time).toISOString() : formData.reminder_time
      };
      await api.put(`/api/reminders/${editingReminder.id}`, reminderData);
      setEditingReminder(null);
      setFormData({ title: '', description: '', reminder_time: '' });
      await fetchReminders();
    } catch (err) {
      console.error('Failed to update reminder:', err);
      setError('Failed to update reminder');
    }
  };

  // Delete reminder
  const handleDeleteReminder = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reminder?')) {
      return;
    }
    try {
      await api.delete(`/api/reminders/${id}`);
      await fetchReminders();
    } catch (err) {
      console.error('Failed to delete reminder:', err);
      setError('Failed to delete reminder');
    }
  };

  // Toggle reminder completion
  const handleToggleComplete = async (reminder) => {
    try {
      await api.put(`/api/reminders/${reminder.id}`, {
        is_completed: !reminder.is_completed,
      });
      await fetchReminders();
    } catch (err) {
      console.error('Failed to update reminder:', err);
    }
  };

  // Initialize
  useEffect(() => {
    if (user) {
      fetchReminders();
      
      // Check for upcoming reminders every 5 seconds for more responsive alarms
      alarmCheckInterval.current = setInterval(checkUpcomingReminders, 5000);
      
      // Also check immediately
      checkUpcomingReminders();
    }

    return () => {
      if (alarmCheckInterval.current) {
        clearInterval(alarmCheckInterval.current);
      }
    };
  }, [user, checkUpcomingReminders]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  if (!user) {
    return (
      <div className="reminders-container">
        <div className="reminders-header">
          <h1>⏰ Reminders</h1>
        </div>
        <div className="reminders-login-prompt">
          <p>Please log in to use reminders.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="reminders-container">
        <div className="reminders-loading">Loading reminders...</div>
      </div>
    );
  }

  const now = new Date();
  // Parse reminder times and compare properly
  const upcomingReminders = reminders.filter(r => {
    if (r.is_completed || r.is_dismissed) return false;
    const reminderTime = new Date(r.reminder_time);
    return reminderTime > now;
  });
  const pastReminders = reminders.filter(r => {
    if (r.is_completed || r.is_dismissed) return true;
    const reminderTime = new Date(r.reminder_time);
    return reminderTime <= now;
  });

  return (
    <div className="reminders-container">
      <div className="reminders-header">
        <h1>⏰ Reminders</h1>
        <button
          className="reminders-create-btn"
          onClick={() => {
            setShowCreateForm(true);
            setEditingReminder(null);
            setFormData({ title: '', description: '', reminder_time: '' });
          }}
        >
          ➕ New Reminder
        </button>
      </div>

      {error && <div className="reminders-error">{error}</div>}

      {/* Active Alarms Modal */}
      {activeAlarms.length > 0 && (
        <div className="reminders-alarm-overlay">
          <div className="reminders-alarm-modal">
            <h2>🔔 Reminder Alarms</h2>
            {activeAlarms.map(reminder => (
              <div key={reminder.id} className="reminders-alarm-item">
                <div className="reminders-alarm-content">
                  <h3>{reminder.title}</h3>
                  {reminder.description && <p>{reminder.description}</p>}
                  <p className="reminders-alarm-time">
                    {new Date(reminder.reminder_time).toLocaleString()}
                  </p>
                </div>
                <button
                  className="reminders-dismiss-btn"
                  onClick={() => handleDismissAlarm(reminder.id)}
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {(showCreateForm || editingReminder) && (
        <div className="reminders-form-overlay">
          <div className="reminders-form-modal">
            <h2>{editingReminder ? 'Edit Reminder' : 'Create Reminder'}</h2>
            <form
              onSubmit={editingReminder ? handleUpdateReminder : handleCreateReminder}
            >
              <div className="reminders-form-group">
                <label>Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  placeholder="e.g., Meeting with team"
                />
              </div>
              <div className="reminders-form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional description..."
                  rows="3"
                />
              </div>
              <div className="reminders-form-group">
                <label>Reminder Time *</label>
                <input
                  type="datetime-local"
                  value={formData.reminder_time}
                  onChange={(e) =>
                    setFormData({ ...formData, reminder_time: e.target.value })
                  }
                  required
                />
              </div>
              <div className="reminders-form-actions">
                <button type="submit" className="reminders-save-btn">
                  {editingReminder ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  className="reminders-cancel-btn"
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingReminder(null);
                    setFormData({ title: '', description: '', reminder_time: '' });
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upcoming Reminders */}
      <div className="reminders-section">
        <h2>Upcoming ({upcomingReminders.length})</h2>
        {upcomingReminders.length === 0 ? (
          <p className="reminders-empty">No upcoming reminders</p>
        ) : (
          <div className="reminders-list">
            {upcomingReminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`reminders-item ${reminder.is_completed ? 'completed' : ''}`}
              >
                <div className="reminders-item-content">
                  <div className="reminders-item-header">
                    <h3>{reminder.title}</h3>
                    <span className="reminders-item-time">
                      {new Date(reminder.reminder_time).toLocaleString()}
                    </span>
                  </div>
                  {reminder.description && (
                    <p className="reminders-item-description">
                      {reminder.description}
                    </p>
                  )}
                </div>
                <div className="reminders-item-actions">
                  <button
                    className="reminders-edit-btn"
                    onClick={() => {
                      setEditingReminder(reminder);
                    // Convert UTC time to local datetime-local format
                    const reminderDate = new Date(reminder.reminder_time);
                    const localDate = new Date(reminderDate.getTime() - reminderDate.getTimezoneOffset() * 60000);
                    setFormData({
                      title: reminder.title,
                      description: reminder.description || '',
                      reminder_time: localDate.toISOString().slice(0, 16),
                    });
                      setShowCreateForm(false);
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="reminders-delete-btn"
                    onClick={() => handleDeleteReminder(reminder.id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past/Completed Reminders */}
      {pastReminders.length > 0 && (
        <div className="reminders-section">
          <h2>Past/Completed ({pastReminders.length})</h2>
          <div className="reminders-list">
            {pastReminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`reminders-item ${reminder.is_completed ? 'completed' : ''}`}
              >
                <div className="reminders-item-content">
                  <div className="reminders-item-header">
                    <h3>{reminder.title}</h3>
                    <span className="reminders-item-time">
                      {new Date(reminder.reminder_time).toLocaleString()}
                    </span>
                  </div>
                  {reminder.description && (
                    <p className="reminders-item-description">
                      {reminder.description}
                    </p>
                  )}
                </div>
                <div className="reminders-item-actions">
                  <button
                    className="reminders-delete-btn"
                    onClick={() => handleDeleteReminder(reminder.id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reminders;

