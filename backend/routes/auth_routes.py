from flask import Blueprint, request, jsonify
from models import db, User
from werkzeug.security import check_password_hash
from dotenv import load_dotenv
import os
import jwt
import datetime
from functools import wraps

auth_bp = Blueprint('auth', __name__)
load_dotenv()

SECRET_KEY = os.getenv('SECRET_KEY', 'your-default-secret')  # from .env

# Decorator to verify token and role
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            bearer = request.headers['Authorization']
            token = bearer.split()[1] if " " in bearer else bearer
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user = User.query.get(data['user_id'])
        except Exception as e:
            return jsonify({'message': 'Token is invalid!'}), 401

        return f(current_user, *args, **kwargs)
    return decorated

def admin_only(f):
    @wraps(f)
    def wrapper(current_user, *args, **kwargs):
        if current_user.role != 'admin':
            return jsonify({'message': 'Admin access required.'}), 403
        return f(current_user, *args, **kwargs)
    return wrapper


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.get_user_by_username(data.get('username'))

    if not user or not user.check_password(data.get('password')):
        return jsonify({'message': 'Invalid credentials'}), 401

    token = jwt.encode({
        'user_id': user.id,
        'exp': datetime.datetime.now() + datetime.timedelta(hours=12)
    }, SECRET_KEY, algorithm="HS256")

    return jsonify({'token': token, 'role': user.role})


@auth_bp.route('/users', methods=['POST'])
@token_required
@admin_only
def create_user(current_user):
    data = request.get_json()
    if User.get_user_by_username(data.get('username')):
        return jsonify({'message': 'User already exists'}), 400

    new_user = User(
        username=data['username'],
        role=data.get('role', 'user')
    )
    new_user.set_password(data['password'])
    new_user.save()
    return jsonify({'message': 'User created successfully'})

@auth_bp.route('/users', methods=['GET'])
@admin_only
def list_users():
    users = User.query.all()
    return jsonify([
        {"id": u.id, "username": u.username, "role": u.role} for u in users
    ]), 200


@auth_bp.route('/users/<string:username>', methods=['PUT'])
@token_required
@admin_only
def edit_user(current_user, username):  # ✅ change this
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'message': 'User not found'}), 404

    data = request.get_json()
    user.username = data.get('username', user.username)
    if 'password' in data:
        user.set_password(data['password'])
    user.role = data.get('role', user.role)
    user.save()
    return jsonify({'message': f'User "{username}" updated successfully'})
