from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from config.config import DEADLINE_DATE
from helpers.QRCodeGenerator import generate_team_qr_id, generate_team_join_code
from database.DB import get_db
from .dependencies import get_current_user

router = APIRouter()


# Pydantic models
class TeamCreate(BaseModel):
    team_name: Optional[str] = None


class TeamAction(BaseModel):
    team_id: str


@router.post('/create_team')
async def create_team(payload: TeamCreate, request: Request, user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Create a new team with the requesting user as the only member."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not available. Please check MongoDB configuration.")

    try:
        if DEADLINE_DATE:
            try:
                deadline_dt = datetime.fromisoformat(DEADLINE_DATE)
            except Exception:
                try:
                    deadline_dt = datetime.strptime(DEADLINE_DATE, "%Y-%m-%d")
                except Exception:
                    deadline_dt = None

            if deadline_dt and datetime.utcnow() > deadline_dt:
                return JSONResponse(status_code=400, content={"success": False, "message": "Cannot create team after the deadline."})

        team_name = payload.team_name
        if team_name:
            existing_name = await db.find_one("teams", {"team_name": team_name})
            if existing_name:
                return JSONResponse(status_code=400, content={"success": False, "message": "Team name already taken. Choose a different name."})

        email = user.get("email")
        if email:
            already_in = await db.find_one("teams", {"members.email": email})
            if already_in:
                return JSONResponse(status_code=400, content={"success": False, "message": "User already belongs to a team and cannot create another."})

        team_id = str(uuid.uuid4())
        team_name = team_name or f"Team-{team_id[:8]}"

        member = {
            "name": user.get("name"),
            "email": user.get("email"),
            "rollNumber": user.get("rollNumber"),
            "role": user.get("role")
        }

        qr_id = generate_team_qr_id(team_id)
        join_code = generate_team_join_code(team_id, team_name)

        team = {
            "team_id": team_id,
            "team_name": team_name,
            "qr_id": qr_id,
            "join_code": join_code,
            "members": [member],
            "points": 0,
            "events_participated": [],
            "created_at": datetime.utcnow(),
            "created_by": user.get("email")
        }

        result = await db.add("teams", team)
        if result["status"] == 200:
            return JSONResponse(status_code=201, content={"message": "Team created successfully", "team": result["data"]})
        else:
            raise HTTPException(status_code=500, detail="Failed to create team")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating team: {str(e)}")


@router.get('/my_team')
async def get_my_team(request: Request, user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Get the team that the current user belongs to"""
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not available")

    try:
        email = user.get("email")
        if not email:
            return JSONResponse(status_code=400, content={"error": "User email not found"})

        team = await db.find_one("teams", {"members.email": email})
        if not team:
            return JSONResponse(content={"team": None, "message": "User not in any team"})

        if not team.get("qr_id"):
            team["qr_id"] = generate_team_qr_id(team["team_id"])
        if not team.get("join_code"):
            team["join_code"] = generate_team_join_code(team["team_id"], team["team_name"])

        if not team.get("qr_id") or not team.get("join_code"):
            await db.update(
                "teams",
                {"team_id": team["team_id"]},
                {"$set": {
                    "qr_id": team["qr_id"],
                    "join_code": team["join_code"]
                }}
            )

        return JSONResponse(content={"team": team})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching team: {str(e)}")


@router.post('/join_team_by_code')
async def join_team_by_code(request: Request, user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Join a team using a join code"""
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not available")

    try:
        body = await request.json()
        join_code = body.get("join_code")

        if not join_code:
            return JSONResponse(status_code=400, content={"success": False, "message": "Join code is required"})

        if DEADLINE_DATE:
            try:
                deadline_dt = datetime.fromisoformat(DEADLINE_DATE)
            except Exception:
                try:
                    deadline_dt = datetime.strptime(DEADLINE_DATE, "%Y-%m-%d")
                except Exception:
                    deadline_dt = None

            if deadline_dt and datetime.utcnow() > deadline_dt:
                return JSONResponse(status_code=400, content={"success": False, "message": "Cannot join team after the deadline"})

        matching_team = await db.find_one("teams", {"join_code": join_code})

        if not matching_team:
            result = await db.find_many("teams", {})
            if result["status"] == 200:
                for team in result["data"]:
                    team_join_code = generate_team_join_code(team["team_id"], team["team_name"])
                    if team_join_code == join_code:
                        matching_team = team
                        await db.update(
                            "teams",
                            {"team_id": team["team_id"]},
                            {"$set": {"join_code": join_code}}
                        )
                        break

        if not matching_team:
            return JSONResponse(status_code=404, content={"success": False, "message": "Invalid join code"})

        if len(matching_team.get("members", [])) >= 3:
            return JSONResponse(status_code=400, content={"success": False, "message": "Team is full (maximum 3 members)"})

        email = user.get("email")
        if email:
            existing_team = await db.find_one("teams", {"members.email": email})
            if existing_team:
                if existing_team.get("team_id") == matching_team["team_id"]:
                    return JSONResponse(status_code=400, content={"success": False, "message": "Already a member of this team"})
                else:
                    return JSONResponse(status_code=400, content={"success": False, "message": "Already belongs to another team"})

        member = {
            "name": user.get("name"),
            "email": user.get("email"),
            "rollNumber": user.get("rollNumber"),
            "role": user.get("role")
        }

        result = await db.update(
            "teams",
            {"team_id": matching_team["team_id"]},
            {"$push": {"members": member}}
        )

        if result["status"] != 200:
            raise HTTPException(status_code=500, detail="Failed to add member to team")

        updated_team = await db.find_one("teams", {"team_id": matching_team["team_id"]})

        if not updated_team.get("qr_id"):
            updated_team["qr_id"] = generate_team_qr_id(updated_team["team_id"])
        if not updated_team.get("join_code"):
            updated_team["join_code"] = generate_team_join_code(updated_team["team_id"], updated_team["team_name"])

        return JSONResponse(status_code=200, content={"success": True, "message": "Joined team successfully", "team": updated_team})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error joining team: {str(e)}")


@router.post('/leave_team')
async def leave_team(payload: TeamAction, request: Request, user: dict = Depends(get_current_user), db = Depends(get_db)):
    """Remove the requesting user from the team if before DEADLINE_DATE."""
    if db is None:
        raise HTTPException(status_code=503, detail="Database connection not available. Please check MongoDB configuration.")

    try:
        if DEADLINE_DATE:
            try:
                deadline_dt = datetime.fromisoformat(DEADLINE_DATE)
            except Exception:
                try:
                    deadline_dt = datetime.strptime(DEADLINE_DATE, "%Y-%m-%d")
                except Exception:
                    deadline_dt = None

            if deadline_dt:
                now = datetime.utcnow()
                if now > deadline_dt:
                    return JSONResponse(status_code=400, content={"success": False, "message": "Cannot leave team after the deadline."})

        team = await db.find_one("teams", {"team_id": payload.team_id})
        if not team:
            raise HTTPException(status_code=404, detail="Team not found")

        email = user.get("email")
        found = False

        for m in team.get("members", []):
            if m.get("email") == email:
                found = True
                break

        if not found:
            return JSONResponse(status_code=400, content={"success": False, "message": "User is not a member of this team."})

        result = await db.update("teams", {"team_id": payload.team_id}, {"$pull": {"members": {"email": email}}})
        if result["status"] != 200:
            raise HTTPException(status_code=500, detail="Failed to remove member from team")

        updated_team = await db.find_one("teams", {"team_id": payload.team_id})

        return JSONResponse(status_code=200, content={"success": True, "message": "Left team successfully.", "team": updated_team})

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error leaving team: {str(e)}")


@router.get("/leaderboard")
async def leaderboard_short(db = Depends(get_db)):
    """Return top 10 teams with name and points, sorted by points descending."""
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database connection not available. Please check MongoDB configuration."
        )

    try:
        teams_collection = db.get_collection("teams")
        teams = []
        cursor = teams_collection.find(
            {"points": {"$gt": 0}},
            {"_id": 1, "team_name": 1, "points": 1}
        ).sort("points", -1).limit(10)

        async for team in cursor:
            team["_id"] = str(team["_id"])
            team["name"] = team.pop("team_name")
            teams.append(team)

        # Return empty list format that matches volunteers structure for backwards compatibility
        return JSONResponse(content={"volunteers": teams})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching leaderboard: {str(e)}")


@router.get("/leaderboard/full")
async def leaderboard_full(db = Depends(get_db)):
    """Return all teams with only name and points, sorted by points descending."""
    if db is None:
        raise HTTPException(
            status_code=503,
            detail="Database connection not available. Please check MongoDB configuration."
        )

    try:
        teams_collection = db.get_collection("teams")
        teams = []
        cursor = teams_collection.find(
            {"points": {"$gt": 0}},
            {"_id": 1, "team_name": 1, "points": 1}
        ).sort("points", -1)

        async for team in cursor:
            team["_id"] = str(team["_id"])
            team["name"] = team.pop("team_name")
            teams.append(team)

        return JSONResponse(content={"teams": teams})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching teams: {str(e)}")
