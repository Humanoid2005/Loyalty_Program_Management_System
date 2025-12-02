"""
Simple basic tests for the API
"""
import pytest
from datetime import datetime
from helpers.DateTimeSerializer import DateTimeSerializerVisitor
from helpers.SecretCodeEncryptionStrategy import SecretCodeEncryptionStrategy
from helpers.QRCodeGenerator import generate_team_qr_id, generate_team_join_code
from config.config import SECRET_KEY


def test_health_check(client):
    """Test the health check endpoint"""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_leaderboard_endpoint(client):
    """Test the leaderboard endpoint is accessible"""
    response = client.get("/api/leaderboard/full")
    assert response.status_code == 200
    data = response.json()
    assert "teams" in data


def test_protected_endpoint_requires_auth(client):
    """Test that protected endpoints require authentication"""
    response = client.get("/api/user/profile")
    assert response.status_code == 401


def test_create_team_requires_auth(client):
    """Test that creating a team requires authentication"""
    response = client.post("/api/create_team", json={"team_name": "Test Team"})
    assert response.status_code == 401


def test_datetime_serialization():
    """Test that datetime objects are properly serialized"""
    visitor = DateTimeSerializerVisitor()
    
    # Test datetime object
    dt = datetime(2024, 1, 1, 12, 30, 45)
    result = visitor.visit(dt)
    assert isinstance(result, str)
    assert "2024" in result
    
    # Test dict with datetime
    data = {"name": "test", "created_at": dt}
    result = visitor.visit(data)
    assert isinstance(result["created_at"], str)
    
    # Test list with datetime
    data_list = [dt, "string", 123]
    result = visitor.visit(data_list)
    assert isinstance(result[0], str)
    assert result[1] == "string"
    assert result[2] == 123


def test_nested_datetime_serialization():
    """Test nested datetime serialization"""
    visitor = DateTimeSerializerVisitor()
    
    data = {
        "name": "test",
        "metadata": {
            "created": datetime(2024, 1, 1),
            "updated": datetime(2024, 6, 15)
        }
    }
    
    result = visitor.visit(data)
    assert isinstance(result["metadata"]["created"], str)
    assert isinstance(result["metadata"]["updated"], str)


def test_encrypt_decrypt_secret_code():
    """Test encryption and decryption of secret codes"""
    strategy = SecretCodeEncryptionStrategy(SECRET_KEY)
    
    original = "TEST_SECRET_CODE_123"
    
    # Encrypt
    encrypted = strategy.encrypt(original)
    assert encrypted != original
    assert isinstance(encrypted, str)
    
    # Decrypt
    decrypted = strategy.decrypt(encrypted)
    assert decrypted == original


def test_encrypt_different_each_time():
    """Test that encryption produces different ciphertext each time"""
    strategy = SecretCodeEncryptionStrategy(SECRET_KEY)
    
    original = "SAME_SECRET"
    encrypted1 = strategy.encrypt(original)
    encrypted2 = strategy.encrypt(original)
    
    # Should be different due to random nonce
    assert encrypted1 != encrypted2
    
    # But both should decrypt to same value
    assert strategy.decrypt(encrypted1) == original
    assert strategy.decrypt(encrypted2) == original


def test_qr_code_generation():
    """Test QR code ID generation"""
    team_id = "test-team-123"
    
    qr_id = generate_team_qr_id(team_id)
    assert isinstance(qr_id, str)
    assert len(qr_id) > 0


def test_join_code_generation():
    """Test team join code generation"""
    team_id = "test-team-123"
    team_name = "Test Team"
    
    join_code = generate_team_join_code(team_id, team_name)
    assert isinstance(join_code, str)
    assert len(join_code) > 0


def test_different_teams_different_codes():
    """Test that different teams get different codes"""
    qr_id1 = generate_team_qr_id("team-1")
    qr_id2 = generate_team_qr_id("team-2")
    
    assert qr_id1 != qr_id2
    
    join_code1 = generate_team_join_code("team-1", "Team One")
    join_code2 = generate_team_join_code("team-2", "Team Two")
    
    assert join_code1 != join_code2


def test_invalid_endpoint_returns_404(client):
    """Test that invalid endpoints return 404"""
    response = client.get("/api/nonexistent")
    assert response.status_code == 404
