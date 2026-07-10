import secrets
import datetime

# In-memory token store: token -> { user_id, expiry }
SESSION_TOKENS = {}

def generate_token():
    return secrets.token_hex(32)

def store_token(user_id, duration_minutes=30):
    token = generate_token()
    expiry_time = datetime.datetime.utcnow() + datetime.timedelta(minutes=duration_minutes)
    SESSION_TOKENS[token] = {
        'user_id': user_id,
        'expires_at': expiry_time
    }
    return token

def is_token_valid(token):
    token_data = SESSION_TOKENS.get(token)
    if not token_data:
        return False
    if datetime.datetime.utcnow() > token_data['expires_at']:
        del SESSION_TOKENS[token]
        return False
    return True

def get_user_id_from_token(token):
    return SESSION_TOKENS.get(token, {}).get('user_id')
