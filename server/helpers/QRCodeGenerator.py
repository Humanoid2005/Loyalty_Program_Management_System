import hashlib
import base64


def generate_team_qr_id(team_id: str) -> str:
    """Generate a unique, short hashed ID for team QR code"""
    hash_object = hashlib.sha256(team_id.encode())
    hash_bytes = hash_object.digest()
    short_hash = base64.urlsafe_b64encode(hash_bytes[:12]).decode('utf-8').rstrip('=')
    return short_hash


def generate_team_join_code(team_id: str, team_name: str) -> str:
    """Generate a short join code for team invitation"""
    combined = f"{team_id}-{team_name}"
    hash_object = hashlib.sha256(combined.encode())
    hash_bytes = hash_object.digest()
    short_code = base64.urlsafe_b64encode(hash_bytes[:6]).decode('utf-8').rstrip('=')
    return short_code