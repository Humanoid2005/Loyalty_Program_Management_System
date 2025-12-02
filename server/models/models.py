from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class User(BaseModel):
    name: str
    email: str
    rollNumber: str
    role:str
    
    def __init__(self, **data):
        super().__init__(**data)
        self.role = data.get("role", "participant")

class Team(BaseModel):
    team_id: str
    team_name: str
    members: List[User] = Field(default_factory=list)
    points: int = 0
    events_participated: List[str] = Field(default_factory=list)
    
    def __init__(self, **data):
        super().__init__(**data)
        if "members" not in data:
            self.members = []
        if "events_participated" not in data:
            self.events_participated = []
    
class Event(BaseModel):
    event_id: str
    event_name: str
    points: int
    secret_code:str
    expired: bool = False
    participants: int = 0
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    
    def __init__(self, **data):
        super().__init__(**data)
        self.expired = data.get("expired", False)
        self.participants = data.get("participants", 0)

class Volunteer(BaseModel):
    rollNumber: str
    name: str
    email: str
    added_at: Optional[datetime] = None
    added_by: Optional[str] = None
    
    def __init__(self, **data):
        super().__init__(**data)