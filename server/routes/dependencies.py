"""
Shared dependency functions for FastAPI routers.
Eliminates code duplication across multiple router files.
"""
from fastapi import Request, HTTPException, Depends


async def get_current_user(request: Request):
    """
    Dependency to get the currently authenticated user from session.
    Raises HTTPException if user is not authenticated.
    """
    user = request.session.get('user')
    if not user:
        raise HTTPException(status_code=401, detail="User not authenticated")
    return user


async def require_admin(user: dict = Depends(get_current_user)):
    """
    Dependency to require admin role.
    Raises HTTPException if user is not an admin.
    """
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_admin_or_volunteer(user: dict = Depends(get_current_user)):
    """
    Dependency to require admin or volunteer role.
    Raises HTTPException if user is neither admin nor volunteer.
    """
    if user.get("role") not in ["admin", "volunteer"]:
        raise HTTPException(status_code=403, detail="Admin or volunteer access required")
    return user
