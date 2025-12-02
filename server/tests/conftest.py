"""
Simple pytest configuration
"""
import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Create a test client"""
    with TestClient(app) as test_client:
        yield test_client
