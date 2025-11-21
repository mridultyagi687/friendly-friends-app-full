import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

function SidebarAiChat({ onClose }) {
  const { user } = useAuth();
  const theme = useTheme();
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchChats();
  }, [user]);

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
    } else {
      setMessages([]);
    }
  }, [selectedChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChats = async () => {
    try {
      const { data } = await api.get('/api/ai/chats');
      const chatsList = Array.isArray(data?.chats) ? data.chats : [];
      setChats(chatsList);
      if (chatsList.length > 0 && !selectedChatId) {
        setSelectedChatId(chatsList[0].id);
      }
    } catch (err) {
      console.error('Failed to load chats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatId) => {
    try {
      const { data } = await api.get(`/api/ai/chats/${chatId}/messages`);
      const messagesList = Array.isArray(data?.messages) ? data.messages : [];
      setMessages(messagesList);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleNewChat = async () => {
    try {
      const { data } = await api.post('/api/ai/chats', {});
      const newChat = data.chat;
      setChats([newChat, ...chats]);
      setSelectedChatId(newChat.id);
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || sending) return;

    const message = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Optimistically add user message immediately
    const tempUserMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages([...messages, tempUserMessage]);

    try {
      const { data } = await api.post('/api/ai/chat', {
        message,
        chat_id: selectedChatId,
      });

      if (data.chat && data.messages) {
        // Update chat list if new chat was created
        if (!chats.find(c => c.id === data.chat.id)) {
          setChats([data.chat, ...chats]);
        }
        setSelectedChatId(data.chat.id);
        // Replace temp message with real messages from server
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      // Remove temp message and restore input on error
      setMessages(messages.filter(m => m.id !== tempUserMessage.id));
      setInputMessage(message);
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>🤖 AI Help</h3>
          <button style={styles.closeButton} onClick={onClose} title="Close AI Help">
            ✕
          </button>
        </div>
        <div style={styles.loginPrompt}>
          <p>Please log in to use AI Help.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .sidebar-ai-chat-input::placeholder {
          color: ${theme.colors.inputPlaceholder};
        }
        .sidebar-chat-item:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          transform: translateX(2px);
        }
      `}</style>
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>🤖 AI Help</h3>
          <button style={styles.closeButton} onClick={onClose} title="Close AI Help">
            ✕
          </button>
        </div>

      {loading ? (
        <div style={styles.loading}>Loading...</div>
      ) : (
        <>
          <div style={styles.chatSelector}>
            <button style={styles.newChatButton} onClick={handleNewChat}>
              ➕ New Chat
            </button>
            {chats.length > 0 && (
              <>
                <div style={styles.chatListHeader}>Your Chats ({chats.length})</div>
                <div style={styles.chatList}>
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      className="sidebar-chat-item"
                      style={{
                        ...styles.chatItem,
                        ...(chat.id === selectedChatId ? styles.chatItemActive : {}),
                      }}
                      onClick={() => setSelectedChatId(chat.id)}
                      title={chat.title || 'New Chat'}
                    >
                      <div style={styles.chatItemTitle}>
                        {chat.title || 'New Chat'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div style={styles.chatArea}>
            {selectedChatId ? (
              <>
                <div style={styles.messagesContainer}>
                  {messages.length === 0 ? (
                    <div style={styles.emptyState}>
                      <p>Start a conversation! Ask me anything about the app.</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          ...styles.message,
                          ...(msg.role === 'user' ? styles.userMessage : styles.aiMessage),
                        }}
                      >
                        <div style={styles.messageContent}>{msg.content}</div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                <form style={styles.inputForm} onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    className="sidebar-ai-chat-input"
                    style={styles.input(theme)}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask a question..."
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    style={{
                      ...styles.sendButton,
                      ...(sending || !inputMessage.trim() ? styles.sendButtonDisabled : {}),
                    }}
                    disabled={sending || !inputMessage.trim()}
                  >
                    ➤
                  </button>
                </form>
              </>
            ) : (
              <div style={styles.emptyState}>
                <p>Create a new chat to get started!</p>
                <button style={styles.newChatButton} onClick={handleNewChat}>
                  ➕ New Chat
                </button>
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </>
  );
}

const styles = {
  container: {
    position: 'fixed',
    left: 0,
    top: 0,
    height: '100vh',
    width: '250px',
    background: 'linear-gradient(180deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '2px 0 15px rgba(0, 0, 0, 0.2)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  header: {
    padding: '1rem 1rem 0.75rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
  },
  title: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: '600',
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    color: 'white',
    borderRadius: '4px',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
  },
  loginPrompt: {
    padding: '2rem 1rem',
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  loading: {
    padding: '2rem',
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  chatSelector: {
    padding: '0.75rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    maxHeight: '45%',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  newChatButton: {
    background: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: 'white',
    borderRadius: '6px',
    padding: '0.5rem 0.75rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '0.5rem',
    width: '100%',
    transition: 'background 0.2s',
  },
  chatListHeader: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  chatList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    minHeight: 0,
  },
  chatItem: {
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    background: 'rgba(255, 255, 255, 0.1)',
    transition: 'all 0.2s',
    border: '1px solid transparent',
  },
  chatItemActive: {
    background: 'rgba(255, 255, 255, 0.3)',
    fontWeight: '600',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
  },
  chatItemTitle: {
    fontSize: '0.8rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    padding: '0.75rem',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '0.75rem',
    minHeight: 0,
  },
  message: {
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    maxWidth: '85%',
    wordWrap: 'break-word',
  },
  userMessage: {
    background: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'flex-end',
    marginLeft: 'auto',
  },
  aiMessage: {
    background: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'flex-start',
  },
  messageContent: {
    fontSize: '0.8rem',
    lineHeight: 1.4,
  },
  inputForm: {
    display: 'flex',
    gap: '0.5rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
  },
  input: (theme) => ({
    flex: 1,
    background: theme.colors.inputBackground,
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '6px',
    padding: '0.5rem 0.75rem',
    color: theme.colors.inputText,
    fontSize: '0.8rem',
    outline: 'none',
  }),
  sendButton: {
    background: 'rgba(255, 255, 255, 0.3)',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'background 0.2s',
  },
  sendButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.85rem',
  },
};

export default SidebarAiChat;

