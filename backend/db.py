import os
import json
import sqlite3
import traceback
from contextlib import closing
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta

# Database location (keeps using the existing Friendly Friends App Database folder)
BASE_DIR = os.environ.get('BASE_DIR') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Friendly Friends App Database')
DB_PATH = os.path.join(BASE_DIR, 'mydatabase.db')

SQL_CREATE_USERS = '''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT,
    email TEXT UNIQUE,
    is_admin INTEGER DEFAULT 0,
    role TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
'''

SQL_CREATE_TODOS = '''
CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
'''

SQL_CREATE_PAINTINGS = '''
CREATE TABLE IF NOT EXISTS paintings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    image_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
'''

SQL_CREATE_VIDEOS = '''
CREATE TABLE IF NOT EXISTS videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
'''

SQL_CREATE_MESSAGES = '''
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    text TEXT DEFAULT '',
    attachment_path TEXT DEFAULT '',
    attachment_name TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);
'''

SQL_CREATE_BLOGS = '''
CREATE TABLE IF NOT EXISTS blogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
'''

SQL_CREATE_BLOG_IMAGES = '''
CREATE TABLE IF NOT EXISTS blog_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blog_id INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    image_name TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE
);
'''

SQL_CREATE_CALLS = '''
CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    caller_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, accepted, rejected, missed, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP,
    ended_at TIMESTAMP,
    offer_sdp TEXT, -- WebRTC offer SDP
    answer_sdp TEXT, -- WebRTC answer SDP
    caller_ice TEXT, -- Caller ICE candidates (JSON array)
    receiver_ice TEXT, -- Receiver ICE candidates (JSON array)
    FOREIGN KEY (caller_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);
'''

SQL_CREATE_USER_PRESENCE = '''
CREATE TABLE IF NOT EXISTS user_presence (
    user_id INTEGER PRIMARY KEY,
    is_online INTEGER DEFAULT 0,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
'''

SQL_CREATE_AI_CHATS = '''
CREATE TABLE IF NOT EXISTS ai_chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
'''

SQL_CREATE_AI_MESSAGES = '''
CREATE TABLE IF NOT EXISTS ai_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES ai_chats(id) ON DELETE CASCADE
);
'''

SQL_CREATE_AI_VIDEOS = '''
CREATE TABLE IF NOT EXISTS ai_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    prompt TEXT NOT NULL,
    style TEXT DEFAULT '',
    audio_enabled INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending',
    file_path TEXT DEFAULT '',
    meta_json TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
'''

SQL_CREATE_AI_DOCS = '''
CREATE TABLE IF NOT EXISTS ai_docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    prompt TEXT DEFAULT '',
    is_public INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
'''

SQL_CREATE_AI_TRAINING = '''
CREATE TABLE IF NOT EXISTS ai_training (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    category TEXT DEFAULT '',
    tags TEXT DEFAULT '',
    created_by INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
'''


def get_connection():
    """Create a SQLite connection with sane defaults for concurrent access."""
    os.makedirs(BASE_DIR, exist_ok=True)
    try:
        conn = sqlite3.connect(
            DB_PATH,
            timeout=30,  # wait up to 30s if the database is busy
            detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES,
            check_same_thread=False  # allow usage across threads (Flask dev server)
        )
        conn.row_factory = sqlite3.Row
        # Enable foreign keys and WAL for better resilience
        conn.execute('PRAGMA foreign_keys = ON;')
        conn.execute('PRAGMA journal_mode = WAL;')
        conn.execute('PRAGMA synchronous = NORMAL;')
        return conn
    except sqlite3.DatabaseError as exc:
        print(f"[DB] Critical error opening database: {exc}")
        traceback.print_exc()
        raise


def init_db():
    with closing(get_connection()) as conn:
        conn.execute(SQL_CREATE_USERS)
        conn.execute(SQL_CREATE_TODOS)
        conn.execute(SQL_CREATE_PAINTINGS)
        conn.execute(SQL_CREATE_VIDEOS)
        conn.execute(SQL_CREATE_MESSAGES)
        conn.execute(SQL_CREATE_BLOGS)
        conn.execute(SQL_CREATE_BLOG_IMAGES)
        conn.execute(SQL_CREATE_CALLS)
        conn.execute(SQL_CREATE_USER_PRESENCE)
        conn.execute(SQL_CREATE_AI_CHATS)
        conn.execute(SQL_CREATE_AI_MESSAGES)
        conn.execute(SQL_CREATE_AI_VIDEOS)
        conn.execute(SQL_CREATE_AI_DOCS)
        conn.execute(SQL_CREATE_AI_TRAINING)
        
        # Add role column if it doesn't exist (for existing databases)
        try:
            conn.execute('ALTER TABLE users ADD COLUMN role TEXT DEFAULT ""')
            conn.commit()
        except sqlite3.OperationalError:
            pass  # Column already exists
        
        conn.commit()

        # ensure an admin user exists (update password to use pbkdf2 if exists)
        cur = conn.execute('SELECT id FROM users WHERE username = ?', ('admin',))
        admin_user = cur.fetchone()
        password_hash = generate_password_hash('admin123', method='pbkdf2:sha256')
        if not admin_user:
            conn.execute('INSERT INTO users (username, password_hash, email, is_admin, role) VALUES (?, ?, ?, ?, ?)',
                         ('admin', password_hash, 'admin@example.com', 1, 'Biggest Full Control Boss'))
        else:
            # Update existing admin password to use pbkdf2 instead of scrypt
            try:
                conn.execute('UPDATE users SET password_hash = ? WHERE username = ?', (password_hash, 'admin'))
            except sqlite3.OperationalError as update_error:
                print(f"[DB] Warning updating admin password: {update_error}")
        conn.commit()


def create_user(username, email, password, is_admin=False, role=''):
    with closing(get_connection()) as conn:
        try:
            password_hash = generate_password_hash(password, method='pbkdf2:sha256')
            cur = conn.execute(
                'INSERT INTO users (username, email, password_hash, is_admin, role) VALUES (?, ?, ?, ?, ?)',
                (username, email, password_hash, int(bool(is_admin)), role)
            )
            conn.commit()
            uid = cur.lastrowid
            cur2 = conn.execute('SELECT id, username, email, is_admin, role FROM users WHERE id = ?', (uid,))
            row = cur2.fetchone()
            return dict(row) if row else None
        except sqlite3.IntegrityError:
            return None


def get_user_by_id(user_id):
    with closing(get_connection()) as conn:
        cur = conn.execute('SELECT id, username, email, is_admin, role FROM users WHERE id = ?', (user_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def get_user_by_username(username):
    with closing(get_connection()) as conn:
        cur = conn.execute('SELECT * FROM users WHERE username = ?', (username,))
        row = cur.fetchone()
        return dict(row) if row else None

def get_all_users():
    with closing(get_connection()) as conn:
        cur = conn.execute('SELECT id, username, email, is_admin, role, created_at FROM users ORDER BY created_at DESC')
        return [dict(row) for row in cur.fetchall()]


def get_other_users(current_user_id):
    with closing(get_connection()) as conn:
        # Get all users except current user
        # The WHERE clause ensures we only get users that still exist (not deleted)
        cur = conn.execute('''
            SELECT id, username, email, is_admin, role 
            FROM users 
            WHERE id != ? 
            ORDER BY username ASC
        ''', (current_user_id,))
        return [dict(row) for row in cur.fetchall()]


def verify_user(username, password):
    with closing(get_connection()) as conn:
        cur = conn.execute('SELECT * FROM users WHERE username = ?', (username,))
        user = cur.fetchone()
        if user:
            try:
                # Explicitly check password hash
                password_valid = check_password_hash(user['password_hash'], password)
            except Exception as e:
                print(f"Password verification error: {e}")
                import traceback
                traceback.print_exc()
                # Development recovery path: if stored hash uses an unsupported method
                # (e.g., scrypt on older Python), migrate to pbkdf2 using the provided password
                try:
                    new_hash = generate_password_hash(password, method='pbkdf2:sha256')
                    conn.execute('UPDATE users SET password_hash=? WHERE id=?', (new_hash, user['id']))
                    conn.commit()
                    # After migration, treat as valid login
                    password_valid = True
                except Exception as migrate_err:
                    print(f"Password migration error: {migrate_err}")
                    return None
            if password_valid:
                user_dict = dict(user)
                return {
                    'id': user_dict['id'], 
                    'username': user_dict['username'], 
                    'email': user_dict['email'], 
                    'is_admin': bool(user_dict['is_admin']),
                    'role': user_dict.get('role') or ''
                }
        return None


# Todo List Functions
def get_todos(user_id):
    with closing(get_connection()) as conn:
        cur = conn.execute('SELECT * FROM todos WHERE user_id=? ORDER BY created_at DESC', (user_id,))
        return [dict(row) for row in cur.fetchall()]


def add_todo(user_id, title):
    with closing(get_connection()) as conn:
        cur = conn.execute('INSERT INTO todos (user_id, title) VALUES (?, ?)', (user_id, title))
        conn.commit()
        return {'id': cur.lastrowid, 'user_id': user_id, 'title': title, 'completed': False}


def update_todo(todo_id, user_id, completed):
    with closing(get_connection()) as conn:
        conn.execute('UPDATE todos SET completed=? WHERE id=? AND user_id=?', (completed, todo_id, user_id))
        conn.commit()

def update_todo_title(todo_id, user_id, title):
    with closing(get_connection()) as conn:
        conn.execute('UPDATE todos SET title=? WHERE id=? AND user_id=?', (title, todo_id, user_id))
        conn.commit()
        # Return updated todo
        cur = conn.execute('SELECT * FROM todos WHERE id=? AND user_id=?', (todo_id, user_id))
        row = cur.fetchone()
        return dict(row) if row else None


def delete_todo(todo_id, user_id):
    with closing(get_connection()) as conn:
        conn.execute('DELETE FROM todos WHERE id=? AND user_id=?', (todo_id, user_id))
        conn.commit()


# Painting Functions
def save_painting(user_id, title, image_data):
    with closing(get_connection()) as conn:
        cur = conn.execute('INSERT INTO paintings (user_id, title, image_data) VALUES (?, ?, ?)',
                         (user_id, title, image_data))
        conn.commit()
        return {'id': cur.lastrowid, 'user_id': user_id, 'title': title}


def get_paintings(user_id):
    with closing(get_connection()) as conn:
        cur = conn.execute('SELECT * FROM paintings WHERE user_id=? ORDER BY created_at DESC', (user_id,))
        return [dict(row) for row in cur.fetchall()]


def delete_painting(painting_id, user_id):
    with closing(get_connection()) as conn:
        conn.execute('DELETE FROM paintings WHERE id=? AND user_id=?', (painting_id, user_id))
        conn.commit()


# Video Functions
def save_video(user_id, title, file_path):
    with closing(get_connection()) as conn:
        # Ensure the owning user still exists (avoid foreign key failures)
        cur = conn.execute('SELECT 1 FROM users WHERE id = ?', (user_id,))
        if not cur.fetchone():
            return None

        cur = conn.execute('INSERT INTO videos (user_id, filename, file_path) VALUES (?, ?, ?)',
                         (user_id, title, file_path))
        conn.commit()
        return {'id': cur.lastrowid, 'user_id': user_id, 'filename': title, 'file_path': file_path}


def get_videos(user_id):
    with closing(get_connection()) as conn:
        cur = conn.execute('SELECT * FROM videos WHERE user_id=? ORDER BY created_at DESC', (user_id,))
        return [dict(row) for row in cur.fetchall()]

def get_all_videos():
    with closing(get_connection()) as conn:
        cur = conn.execute('SELECT v.*, u.username as owner_username FROM videos v JOIN users u ON v.user_id = u.id ORDER BY v.created_at DESC')
        return [dict(row) for row in cur.fetchall()]

def get_video_by_id(video_id):
    with closing(get_connection()) as conn:
        cur = conn.execute('SELECT v.*, u.username as owner_username FROM videos v JOIN users u ON v.user_id = u.id WHERE v.id=?', (video_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def delete_video(video_id, user_id):
    with closing(get_connection()) as conn:
        # Get the file path and owner info before deleting
        cur = conn.execute('SELECT file_path, user_id FROM videos WHERE id=?', (video_id,))
        video = cur.fetchone()
        if video:
            video_dict = dict(video)
            # Only allow deletion if user is the owner or admin
            # Check will be done in the endpoint
            file_path = video_dict['file_path']
            # Delete the file if it exists
            try:
                os.remove(file_path)
            except OSError:
                pass
            # Delete the database record
            conn.execute('DELETE FROM videos WHERE id=?', (video_id,))
            conn.commit()
            return True
        return False


# Messaging Functions
def save_message(sender_id, receiver_id, text='', attachment_path='', attachment_name=''):
    with closing(get_connection()) as conn:
        cur = conn.execute(
            'INSERT INTO messages (sender_id, receiver_id, text, attachment_path, attachment_name) VALUES (?, ?, ?, ?, ?)',
            (sender_id, receiver_id, text or '', attachment_path or '', attachment_name or '')
        )
        conn.commit()
        return {
            'id': cur.lastrowid,
            'sender_id': sender_id,
            'receiver_id': receiver_id,
            'text': text or '',
            'attachment_path': attachment_path or '',
            'attachment_name': attachment_name or ''
        }


def get_conversation(user_id, other_user_id):
    with closing(get_connection()) as conn:
        cur = conn.execute(
            'SELECT * FROM messages WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?) ORDER BY created_at ASC',
            (user_id, other_user_id, other_user_id, user_id)
        )
        return [dict(row) for row in cur.fetchall()]


def get_message_by_id(message_id):
    with closing(get_connection()) as conn:
        cur = conn.execute('SELECT * FROM messages WHERE id=?', (message_id,))
        row = cur.fetchone()
        return dict(row) if row else None


# Blog Functions
def create_blog(user_id, title, content):
    with closing(get_connection()) as conn:
        cur = conn.execute(
            'INSERT INTO blogs (user_id, title, content) VALUES (?, ?, ?)',
            (user_id, title, content)
        )
        conn.commit()
        blog_id = cur.lastrowid
        cur2 = conn.execute(
            'SELECT b.*, u.username as author_username FROM blogs b JOIN users u ON b.user_id = u.id WHERE b.id = ?',
            (blog_id,)
        )
        row = cur2.fetchone()
        return dict(row) if row else None


def get_all_blogs():
    with closing(get_connection()) as conn:
        cur = conn.execute(
            'SELECT b.*, u.username as author_username FROM blogs b JOIN users u ON b.user_id = u.id ORDER BY b.created_at DESC'
        )
        return [dict(row) for row in cur.fetchall()]


def get_blog_by_id(blog_id):
    with closing(get_connection()) as conn:
        cur = conn.execute(
            'SELECT b.*, u.username as author_username FROM blogs b JOIN users u ON b.user_id = u.id WHERE b.id = ?',
            (blog_id,)
        )
        row = cur.fetchone()
        return dict(row) if row else None


def update_blog(blog_id, user_id, title, content):
    with closing(get_connection()) as conn:
        conn.execute(
            'UPDATE blogs SET title=?, content=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?',
            (title, content, blog_id, user_id)
        )
        conn.commit()
        cur = conn.execute(
            'SELECT b.*, u.username as author_username FROM blogs b JOIN users u ON b.user_id = u.id WHERE b.id = ?',
            (blog_id,)
        )
        row = cur.fetchone()
        return dict(row) if row else None


def delete_blog(blog_id, user_id):
    with closing(get_connection()) as conn:
        # Delete blog images first
        conn.execute('DELETE FROM blog_images WHERE blog_id=?', (blog_id,))
        # Delete blog
        conn.execute('DELETE FROM blogs WHERE id=? AND user_id=?', (blog_id, user_id))
        conn.commit()
        return True


def add_blog_image(blog_id, image_path, image_name, display_order=0):
    with closing(get_connection()) as conn:
        cur = conn.execute(
            'INSERT INTO blog_images (blog_id, image_path, image_name, display_order) VALUES (?, ?, ?, ?)',
            (blog_id, image_path, image_name, display_order)
        )
        conn.commit()
        return {'id': cur.lastrowid, 'blog_id': blog_id, 'image_path': image_path, 'image_name': image_name, 'display_order': display_order}


def get_blog_images(blog_id):
    with closing(get_connection()) as conn:
        cur = conn.execute(
            'SELECT * FROM blog_images WHERE blog_id=? ORDER BY display_order ASC, created_at ASC',
            (blog_id,)
        )
        return [dict(row) for row in cur.fetchall()]


# Call Functions
def create_call(caller_id, receiver_id, status='pending'):
    with closing(get_connection()) as conn:
        cur = conn.execute(
            'INSERT INTO calls (caller_id, receiver_id, status) VALUES (?, ?, ?)',
            (caller_id, receiver_id, status)
        )
        conn.commit()
        call_id = cur.lastrowid
        cur2 = conn.execute('''
            SELECT c.*, 
                   caller.username as caller_username, 
                   receiver.username as receiver_username
            FROM calls c
            JOIN users caller ON c.caller_id = caller.id
            JOIN users receiver ON c.receiver_id = receiver.id
            WHERE c.id = ?
        ''', (call_id,))
        row = cur2.fetchone()
        return dict(row) if row else None


def update_call_sdp(call_id, user_id, offer_sdp=None, answer_sdp=None):
    with closing(get_connection()) as conn:
        updates = []
        params = []
        if offer_sdp is not None:
            updates.append('offer_sdp = ?')
            params.append(offer_sdp)
        if answer_sdp is not None:
            updates.append('answer_sdp = ?')
            params.append(answer_sdp)
        if updates:
            params.append(call_id)
            params.append(user_id)
            query = f"UPDATE calls SET {', '.join(updates)} WHERE id = ? AND (caller_id = ? OR receiver_id = ?)"
            conn.execute(query, params)
            conn.commit()


def update_call_ice(call_id, user_id, ice_candidate):
    import json
    with closing(get_connection()) as conn:
        cur = conn.execute('SELECT caller_id, caller_ice, receiver_ice FROM calls WHERE id = ?', (call_id,))
        row = cur.fetchone()
        if row:
            is_caller = row['caller_id'] == user_id
            existing_ice = row['caller_ice'] if is_caller else row['receiver_ice']
            
            # Parse existing ICE candidates or create new array
            if existing_ice:
                try:
                    ice_list = json.loads(existing_ice)
                except Exception:
                    ice_list = []
            else:
                ice_list = []
            
            # Normalize candidate keys for dedupe
            def key(c):
                try:
                    return (c.get('candidate'), c.get('sdpMid'), c.get('sdpMLineIndex'))
                except Exception:
                    return str(c)
            
            # Only add if not already present (by candidate triplet)
            incoming_key = key(ice_candidate)
            if all(key(c) != incoming_key for c in ice_list):
                ice_list.append(ice_candidate)
            
            # Cap list length to prevent DB growth (keep last 30)
            MAX_ICE = 30
            if len(ice_list) > MAX_ICE:
                ice_list = ice_list[-MAX_ICE:]
            
            ice_json = json.dumps(ice_list)
            
            if is_caller:
                conn.execute('UPDATE calls SET caller_ice = ? WHERE id = ?', (ice_json, call_id))
            else:
                conn.execute('UPDATE calls SET receiver_ice = ? WHERE id = ?', (ice_json, call_id))
            conn.commit()


def update_call_status(call_id, status, user_id):
    with closing(get_connection()) as conn:
        if status == 'accepted':
            conn.execute(
                'UPDATE calls SET status=?, answered_at=CURRENT_TIMESTAMP WHERE id=? AND (caller_id=? OR receiver_id=?)',
                (status, call_id, user_id, user_id)
            )
        elif status in ('rejected', 'missed', 'completed'):
            # Mark ended and clear large signaling blobs to save space
            conn.execute(
                "UPDATE calls SET status=?, ended_at=CURRENT_TIMESTAMP, offer_sdp=NULL, answer_sdp=NULL, caller_ice=NULL, receiver_ice=NULL WHERE id=? AND (caller_id=? OR receiver_id=?)",
                (status, call_id, user_id, user_id)
            )
        else:
            conn.execute(
                'UPDATE calls SET status=? WHERE id=? AND (caller_id=? OR receiver_id=?)',
                (status, call_id, user_id, user_id)
            )
        conn.commit()
        # Prune old calls (older than 3 days)
        conn.execute("DELETE FROM calls WHERE ended_at IS NOT NULL AND ended_at < datetime('now','-3 days')")
        conn.commit()
        cur = conn.execute('''
            SELECT c., 
                   caller.username as caller_username, 
                   receiver.username as receiver_username
            FROM calls c
            JOIN users caller ON c.caller_id = caller.id
            JOIN users receiver ON c.receiver_id = receiver.id
            WHERE c.id = ?
        ''', (call_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def get_pending_calls(user_id):
    with closing(get_connection()) as conn:
        cur = conn.execute('''
            SELECT c.*, 
                   caller.username as caller_username, 
                   receiver.username as receiver_username
            FROM calls c
            JOIN users caller ON c.caller_id = caller.id
            JOIN users receiver ON c.receiver_id = receiver.id
            WHERE (c.receiver_id = ? AND c.status = 'pending')
            ORDER BY c.created_at DESC
            LIMIT 1
        ''', (user_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def get_call_by_id(call_id, user_id):
    with closing(get_connection()) as conn:
        cur = conn.execute('''
            SELECT c.*, 
                   caller.username as caller_username, 
                   receiver.username as receiver_username
            FROM calls c
            JOIN users caller ON c.caller_id = caller.id
            JOIN users receiver ON c.receiver_id = receiver.id
            WHERE c.id = ? AND (c.caller_id = ? OR c.receiver_id = ?)
        ''', (call_id, user_id, user_id))
        row = cur.fetchone()
        return dict(row) if row else None


# User Presence Functions
def update_user_presence(user_id, is_online=True):
    with closing(get_connection()) as conn:
        # Skip if the user does not exist (prevents FK constraint errors)
        cur = conn.execute('SELECT 1 FROM users WHERE id = ?', (user_id,))
        if not cur.fetchone():
            return False

        conn.execute('''
            INSERT OR REPLACE INTO user_presence (user_id, is_online, last_seen)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        ''', (user_id, 1 if is_online else 0))
        conn.commit()
        return True


def is_user_online(user_id, timeout_seconds: int = 120):
    with closing(get_connection()) as conn:
        # Compute staleness in SQLite to avoid Python timestamp parsing issues
        cur = conn.execute(
            """
            SELECT is_online,
                   COALESCE(strftime('%s','now') - strftime('%s', last_seen), 999999) AS age_secs
            FROM user_presence
            WHERE user_id=?
            """,
            (user_id,)
        )
        row = cur.fetchone()
        if not row:
            return False
        try:
            return bool(row['is_online']) and int(row['age_secs']) < int(timeout_seconds)
        except Exception:
            return bool(row['is_online'])


def get_all_online_users():
    with closing(get_connection()) as conn:
        cur = conn.execute('''
            SELECT u.id, u.username, u.email, up.last_seen
            FROM users u
            JOIN user_presence up ON u.id = up.user_id
            WHERE up.is_online = 1
        ''')
        return [dict(row) for row in cur.fetchall()]


# AI Chat Functions
def create_ai_chat(user_id, title):
    normalized_title = (title or '').strip() or 'New Chat'
    with closing(get_connection()) as conn:
        cur = conn.execute(
            'INSERT INTO ai_chats (user_id, title) VALUES (?, ?)',
            (user_id, normalized_title)
        )
        conn.commit()
        chat_id = cur.lastrowid
        cur = conn.execute('SELECT * FROM ai_chats WHERE id = ?', (chat_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def get_ai_chats(user_id):
    with closing(get_connection()) as conn:
        cur = conn.execute(
            'SELECT * FROM ai_chats WHERE user_id = ? ORDER BY created_at DESC, id DESC',
            (user_id,)
        )
        return [dict(row) for row in cur.fetchall()]


def get_ai_chat(chat_id):
    with closing(get_connection()) as conn:
        cur = conn.execute('SELECT * FROM ai_chats WHERE id = ?', (chat_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def add_ai_message(chat_id, role, content):
    with closing(get_connection()) as conn:
        cur = conn.execute(
            'INSERT INTO ai_messages (chat_id, role, content) VALUES (?, ?, ?)',
            (chat_id, role, content)
        )
        conn.commit()
        message_id = cur.lastrowid
        cur = conn.execute('SELECT * FROM ai_messages WHERE id = ?', (message_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def get_ai_messages(chat_id, limit=None):
    with closing(get_connection()) as conn:
        query = '''
            SELECT *
            FROM ai_messages
            WHERE chat_id = ?
            ORDER BY created_at ASC, id ASC
        '''
        cur = conn.execute(query, (chat_id,))
        rows = cur.fetchall()
        messages = [dict(row) for row in rows]
        if limit is not None and limit > 0:
            messages = messages[-limit:]
        return messages


# AI Video Functions
def create_ai_video(user_id, prompt, audio_enabled=True, style='', status='pending', file_path='', meta=None):
    meta_json = json.dumps(meta or {})
    with closing(get_connection()) as conn:
        try:
            cur = conn.execute(
                '''
                INSERT INTO ai_videos (user_id, prompt, style, audio_enabled, status, file_path, meta_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ''',
                (user_id, prompt, style or '', int(bool(audio_enabled)), status, file_path or '', meta_json)
            )
            conn.commit()
            video_id = cur.lastrowid
            return get_ai_video_by_id(video_id)
        except sqlite3.OperationalError as err:
            if 'disk I/O error' in str(err).lower():
                print(f"[DB] Disk I/O error while creating ai_video: {err}")
                return None
            raise


def update_ai_video(video_id, status=None, file_path=None, meta=None):
    meta_json = json.dumps(meta or {}) if meta is not None else None
    with closing(get_connection()) as conn:
        updates = []
        params = []
        if status is not None:
            updates.append('status = ?')
            params.append(status)
        if file_path is not None:
            updates.append('file_path = ?')
            params.append(file_path)
        if meta_json is not None:
            updates.append('meta_json = ?')
            params.append(meta_json)
        if not updates:
            return get_ai_video_by_id(video_id)
        updates.append('updated_at = CURRENT_TIMESTAMP')
        query = f"UPDATE ai_videos SET {', '.join(updates)} WHERE id = ?"
        params.append(video_id)
        try:
            conn.execute(query, params)
            conn.commit()
            return get_ai_video_by_id(video_id)
        except sqlite3.OperationalError as err:
            if 'disk I/O error' in str(err).lower():
                print(f"[DB] Disk I/O error while updating ai_video: {err}")
                return get_ai_video_by_id(video_id)
            raise


def get_ai_videos(user_id):
    with closing(get_connection()) as conn:
        cur = conn.execute(
            'SELECT * FROM ai_videos WHERE user_id = ? ORDER BY created_at DESC, id DESC',
            (user_id,)
        )
        return [dict(row) for row in cur.fetchall()]


def get_ai_video_by_id(video_id):
    with closing(get_connection()) as conn:
        cur = conn.execute('SELECT * FROM ai_videos WHERE id = ?', (video_id,))
        row = cur.fetchone()
        return dict(row) if row else None


# AI Doc Functions
def create_ai_doc(user_id, title, content, prompt='', is_public=False):
    with closing(get_connection()) as conn:
        cur = conn.execute(
            '''
            INSERT INTO ai_docs (user_id, title, content, prompt, is_public)
            VALUES (?, ?, ?, ?, ?)
            ''',
            (user_id, title.strip() or 'Untitled Doc', content, prompt or '', int(bool(is_public)))
        )
        conn.commit()
        doc_id = cur.lastrowid
        return get_ai_doc_by_id(doc_id)


def update_ai_doc(doc_id, user_id=None, title=None, content=None, is_public=None):
    with closing(get_connection()) as conn:
        updates = []
        params = []
        if title is not None:
            updates.append('title = ?')
            params.append(title.strip() or 'Untitled Doc')
        if content is not None:
            updates.append('content = ?')
            params.append(content)
        if is_public is not None:
            updates.append('is_public = ?')
            params.append(int(bool(is_public)))
        if not updates:
            return get_ai_doc_by_id(doc_id)
        updates.append('updated_at = CURRENT_TIMESTAMP')
        params.append(doc_id)
        if user_id is not None:
            params.append(user_id)
            query = f"UPDATE ai_docs SET {', '.join(updates)} WHERE id = ? AND user_id = ?"
        else:
            query = f"UPDATE ai_docs SET {', '.join(updates)} WHERE id = ?"
        conn.execute(query, params)
        conn.commit()
        return get_ai_doc_by_id(doc_id)


def get_ai_doc_by_id(doc_id):
    with closing(get_connection()) as conn:
        cur = conn.execute('SELECT * FROM ai_docs WHERE id = ?', (doc_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def list_ai_docs_for_user(user):
    """Return docs visible to the user. Admins see all, owners see their own with editor access, public docs visible to all."""
    user_id = user.get('id') if user else None
    is_admin = bool(user.get('is_admin')) if user else False

    query = '''
        SELECT d.*,
               (d.user_id = ?) AS is_owner
        FROM ai_docs d
        WHERE
            (d.user_id = ?)
            OR (d.is_public = 1)
            OR (? = 1)
        ORDER BY d.updated_at DESC, d.id DESC
    '''
    params = (user_id, user_id, 1 if is_admin else 0)
    with closing(get_connection()) as conn:
        cur = conn.execute(query, params)
        rows = cur.fetchall()
        docs = []
        for row in rows:
            doc = dict(row)
            doc['is_owner'] = bool(doc.get('is_owner'))
            docs.append(doc)
        return docs


def list_public_ai_docs():
    with closing(get_connection()) as conn:
        cur = conn.execute(
            'SELECT * FROM ai_docs WHERE is_public = 1 ORDER BY updated_at DESC, id DESC'
        )
        return [dict(row) for row in cur.fetchall()]


def delete_ai_chat(chat_id, user_id=None):
    with closing(get_connection()) as conn:
        if user_id is not None:
            cur = conn.execute('DELETE FROM ai_chats WHERE id = ? AND user_id = ?', (chat_id, user_id))
        else:
            cur = conn.execute('DELETE FROM ai_chats WHERE id = ?', (chat_id,))
        conn.commit()
        return cur.rowcount > 0


# AI Training Functions
def create_ai_training(prompt, response, created_by, category='', tags=''):
    with closing(get_connection()) as conn:
        cur = conn.execute(
            '''
            INSERT INTO ai_training (prompt, response, category, tags, created_by)
            VALUES (?, ?, ?, ?, ?)
            ''',
            (prompt.strip(), response.strip(), category.strip(), tags.strip(), created_by)
        )
        conn.commit()
        training_id = cur.lastrowid
        return get_ai_training_by_id(training_id)


def get_ai_training_by_id(training_id):
    with closing(get_connection()) as conn:
        cur = conn.execute('SELECT * FROM ai_training WHERE id = ?', (training_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def get_all_ai_training():
    with closing(get_connection()) as conn:
        cur = conn.execute(
            '''
            SELECT t.*, u.username as created_by_username
            FROM ai_training t
            LEFT JOIN users u ON t.created_by = u.id
            ORDER BY t.created_at DESC
            '''
        )
        return [dict(row) for row in cur.fetchall()]


def update_ai_training(training_id, prompt=None, response=None, category=None, tags=None):
    with closing(get_connection()) as conn:
        updates = []
        params = []
        if prompt is not None:
            updates.append('prompt = ?')
            params.append(prompt.strip())
        if response is not None:
            updates.append('response = ?')
            params.append(response.strip())
        if category is not None:
            updates.append('category = ?')
            params.append(category.strip())
        if tags is not None:
            updates.append('tags = ?')
            params.append(tags.strip())
        if not updates:
            return get_ai_training_by_id(training_id)
        updates.append('updated_at = CURRENT_TIMESTAMP')
        params.append(training_id)
        query = f"UPDATE ai_training SET {', '.join(updates)} WHERE id = ?"
        conn.execute(query, params)
        conn.commit()
        return get_ai_training_by_id(training_id)


def delete_ai_training(training_id):
    with closing(get_connection()) as conn:
        cur = conn.execute('DELETE FROM ai_training WHERE id = ?', (training_id,))
        conn.commit()
        return cur.rowcount > 0


def get_matching_training_data(user_query):
    """Find training data where the prompt (keywords/topics) matches the user query."""
    query_lower = (user_query or '').strip().lower()
    if not query_lower:
        return []
    
    with closing(get_connection()) as conn:
        # Get all training data
        cur = conn.execute('SELECT * FROM ai_training ORDER BY created_at DESC')
        all_training = [dict(row) for row in cur.fetchall()]
        
        matches = []
        for training in all_training:
            keywords = (training.get('prompt') or '').strip().lower()
            if not keywords:
                continue
            
            # Split keywords by comma, space, or newline
            keyword_list = [k.strip() for k in keywords.replace(',', ' ').replace('\n', ' ').split() if k.strip()]
            
            # Check if any keyword appears in the user query
            for keyword in keyword_list:
                if keyword and keyword in query_lower:
                    matches.append(training)
                    break  # Only add once per training entry
        
        return matches
