"""
Flask Application for Friendly Friends App
Main entry point for the backend API
"""

import os
from flask import Flask, request, jsonify, session, redirect, url_for
from flask_cors import CORS
from db import init_db, get_connection, create_user, get_user_by_username, get_user_by_email
from werkzeug.security import check_password_hash
import json

app = Flask(__name__)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('SESSION_COOKIE_SECURE', 'false').lower() == 'true'
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# CORS configuration
frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
CORS(app, origins=[frontend_url], supports_credentials=True)

# Initialize database on startup
with app.app_context():
    init_db()

# Health check endpoint
@app.route('/')
def health():
    return jsonify({'status': 'ok', 'message': 'Friendly Friends API is running'})

@app.route('/api/health')
def api_health():
    return jsonify({'status': 'ok', 'message': 'API is healthy'})

# Authentication endpoints
@app.route('/api/me', methods=['GET'])
def get_current_user():
    """Get current authenticated user"""
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    with get_connection() as conn:
        user = conn.execute(
            'SELECT id, username, email, is_admin, role FROM users WHERE id = ?',
            (user_id,)
        ).fetchone()
        
                if user:
            return jsonify({
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'is_admin': bool(user['is_admin']),
                'role': user['role'] or ''
            })
        return jsonify({'error': 'User not found'}), 404

@app.route('/api/login', methods=['POST'])
def login():
    """Login endpoint"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

        if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    with get_connection() as conn:
        user = conn.execute(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            (username, username)
        ).fetchone()
        
        if user and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
    return jsonify({
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'is_admin': bool(user['is_admin']),
                'role': user['role'] or ''
            })
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout endpoint"""
            session.clear()
    return jsonify({'message': 'Logged out successfully'})

# Basic API endpoints
@app.route('/api/users', methods=['GET'])
def get_users():
    """Get all users (admin only)"""
    user_id = session.get('user_id')
        if not user_id:
        return jsonify({'error': 'Not authenticated'}), 401
    
    with get_connection() as conn:
        user = conn.execute('SELECT is_admin FROM users WHERE id = ?', (user_id,)).fetchone()
        if not user or not user['is_admin']:
            return jsonify({'error': 'Unauthorized'}), 403
        
        users = conn.execute(
            'SELECT id, username, email, is_admin, role FROM users'
        ).fetchall()
        
        return jsonify([dict(u) for u in users])

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Initialize database
    init_db()
    
    # Run development server
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_ENV') == 'development')

