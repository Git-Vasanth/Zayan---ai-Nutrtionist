import uvicorn
from fastapi import FastAPI, Request, HTTPException, Depends
from starlette.middleware.cors import CORSMiddleware
import json
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta 
from DB import create_db_tables, SessionLocal, UserProfile, PlanApproval, Message, NutritionistInfo, NutritionistStatusDB , ClinicalNote
import bcrypt
from sqlalchemy import text, func
import uuid
from typing import Dict, Any, List, Optional
from enum import Enum 
from agents import workflow_app



# --- Placeholder/Mock Agents Module (Required to run /chat/ai endpoint) ---
# Since agents.py was not provided, these classes and function must be defined 
# or mocked for the app.py to be runnable.

class AgentState(BaseModel):
    messages: List[Dict[str, str]] = []
    diet_type: str
    user_data: Dict[str, Any]
    data_level: int = 1
    plan_generated: bool = False
    nutrition_feedback: str = ""
    needs_revision: bool = False

def route_based_on_diet(state: AgentState, db: Session) -> AgentState:
    """Mock function to simulate AI agent routing and response generation."""
    last_message_content = state.messages[-1]["content"] if state.messages else "Hello."
    
    # Simple mock logic
    if "plan" in last_message_content.lower() and not state.plan_generated:
        response = "I can start building your plan based on your data, but first, tell me your biggest challenge this week."
        state.plan_generated = True
    elif "hello" in last_message_content.lower() or "hi" in last_message_content.lower():
        response = "Hello! I'm your Nutrition AI Assistant. How can I help you achieve your goals today?"
    else:
        response = f"That's interesting. As a {state.diet_type} diet AI, I recommend drinking more water. What else is on your mind?"
        
    state.messages.append({"role": "assistant", "content": response})
    return state

# --- FastAPI Initialization ---
app = FastAPI()

# Add the CORS middleware to allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Utility Functions (Hashed from Part 1) ---

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def is_user_online(last_message):
    if not last_message:
        return False
    return (datetime.utcnow() - last_message.created_at) < timedelta(minutes=30)

def format_timespan(dt):
    now = datetime.utcnow()
    diff = now - dt
    
    if diff < timedelta(minutes=1):
        return "Just now"
    elif diff < timedelta(hours=1):
        return f"{int(diff.seconds / 60)}m ago"
    elif diff < timedelta(days=1):
        return f"{int(diff.seconds / 3600)}h ago"
    else:
        return f"{diff.days}d ago"

# --- Database Dependency and Startup ---

# Standard FastAPI dependency function for a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"Hello": "Nutri-App Backend Running"}

# --- Pydantic Schemas (Combined from Part 1 & 2) ---

class UserFormData(BaseModel):
    name: str
    email: str
    password: str
    confirm_password: str
    dob: str
    token: int
    height_cm: float
    weight_kg: float
    country: str
    city: str
    diet_type: str
    diet_duration_days: int
    allergies: str
    diseases: str
    servings_per_day: int
    main_goal: str

class LoginData(BaseModel):
    email: str
    password: str

class NutritionistLogin(BaseModel):
    email: str
    password: str

class NutritionistRegister(BaseModel):
    name: str
    email: str
    password: str

class MessageCreate(BaseModel):
    message: str

class MessageResponse(BaseModel):
    id: int
    message: str
    sender: str
    created_at: datetime
    is_read: bool

class NutritionistStatusSchema(BaseModel):
    is_online: bool
    next_available: Optional[str] = None
    working_hours: Optional[str] = None

class PlanApprovalUpdate(BaseModel):
    status: str
    feedback: Optional[str] = None
    modified_plan: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    diet_type: str
    user_data: Dict[str, Any]
    conversation_history: List[Dict[str, str]] = [] 
    data_level: int = 1
    plan_generated: bool = False  
    nutrition_feedback: str = ""
    needs_revision: bool = False

# --- User Profile Endpoints (from Part 1, with FIX applied) ---

@app.post("/auth/process-form")
async def process_form(form_data: UserFormData, db: Session = Depends(get_db)):
    try:
        if form_data.password != form_data.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match")
        if len(form_data.password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
        
        hashed_password = hash_password(form_data.password)
        dob_date = datetime.strptime(form_data.dob, "%Y-%m-%d").date()

        new_profile = UserProfile(
            name=form_data.name,
            email=form_data.email,
            password_hash=hashed_password,
            dob=dob_date,
            token=form_data.token,
            height_cm=form_data.height_cm,
            weight_kg=form_data.weight_kg,
            country=form_data.country,
            city=form_data.city,
            diet_type=form_data.diet_type,
            diet_duration_days=form_data.diet_duration_days,
            allergies=form_data.allergies,
            diseases=form_data.diseases,
            servings_per_day=form_data.servings_per_day,
            main_goal=form_data.main_goal,
        )
        
        db.add(new_profile)
        db.commit()
        db.refresh(new_profile)
        
        return {"message": "Profile saved successfully!", "profile_id": new_profile.id, "email": new_profile.email}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save profile: {str(e)}")

# !!! FIX APPLIED HERE: Changed "/profile/{token}" to "/get-profile/{token}" !!

@app.put("/update-profile/{token}")
async def update_user_profile(token: int, updated_data: dict, db: Session = Depends(get_db)):
    try:
        user = db.query(UserProfile).filter(UserProfile.token == token).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if 'height_cm' in updated_data:
            user.height_cm = updated_data['height_cm']
        if 'weight_kg' in updated_data:
            user.weight_kg = updated_data['weight_kg']
        if 'allergies' in updated_data:
            user.allergies = updated_data['allergies']
        if 'diseases' in updated_data:
            user.diseases = updated_data['diseases']
        if 'diet_type' in updated_data:
            user.diet_type = updated_data['diet_type']
        
        db.commit()
        db.refresh(user)
        
        return {"message": "Profile updated successfully!", "user": user}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

@app.post("/auth/login")
async def login(login_data: LoginData, db: Session = Depends(get_db)):
    user = db.query(UserProfile).filter(UserProfile.email == login_data.email).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(login_data.password, str(user.password_hash)):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return {
        "message": "Login successful",
        "user_id": user.id,
        "token": user.token,
        "name": user.name
    }

# --- Nutritionist Endpoints (from Part 1) ---

@app.post("/nutritionist/login")
async def nutritionist_login(login_data: NutritionistLogin, db: Session = Depends(get_db)):
    nutritionist = db.execute(
        text("SELECT * FROM nutritionist_info WHERE email = :email"),
        {"email": login_data.email}
    ).fetchone()
    
    if not nutritionist:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(login_data.password, nutritionist.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    session_token = str(uuid.uuid4())
    
    return {
        "message": "Login successful",
        "session_token": session_token,
        "name": nutritionist.name,
        "email": nutritionist.email,
        # IMPORTANT: Return ID for use in other endpoints
        "nutritionist_id": nutritionist.id 
    }

@app.get("/nutritionist/verify/{token}")
async def verify_nutritionist(token: str):
    return {"valid": True, "message": "Token valid"}

@app.post("/nutritionist/register", operation_id="nutritionist_register")
async def register_nutritionist(register_data: NutritionistRegister, db: Session = Depends(get_db)):
    try:
        existing_nutritionist = db.execute(
            text("SELECT * FROM nutritionist_info WHERE email = :email"),
            {"email": register_data.email}
        ).fetchone()
        
        if existing_nutritionist:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        hashed_password = hash_password(register_data.password)
        
        db.execute(
            text("""
                INSERT INTO nutritionist_info (name, email, password_hash)
                VALUES (:name, :email, :password_hash)
            """),
            {
                "name": register_data.name,
                "email": register_data.email,
                "password_hash": hashed_password
            }
        )
        db.commit()
        
        return {"message": "Nutritionist registered successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
    
@app.get("/api/nutritionist/users")
async def get_nutritionist_users(db: Session = Depends(get_db)):
    try:
        users = db.query(UserProfile).all()
        
        user_list = []
        for user in users:
            pending_approvals = db.query(PlanApproval).filter(
                PlanApproval.user_id == user.id,
                PlanApproval.status == 'pending'
            ).count()
            
            unread_messages = db.query(Message).filter(
                Message.user_id == user.id,
                Message.sender == 'user',
                Message.is_read == False
            ).count()
            
            last_message = db.query(Message).filter(
                Message.user_id == user.id
            ).order_by(Message.created_at.desc()).first()
            
            last_activity = "No activity"
            if last_message:
                last_activity = format_timespan(last_message.created_at)
            
            user_list.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "pending_approvals": pending_approvals,
                "unread_messages": unread_messages,
                "last_activity": last_activity,
                "status": "online" if is_user_online(last_message) else "offline"
            })
        
        return user_list
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")

@app.get("/nutritionist/status/{nutritionist_id}")
async def get_nutritionist_status(
    nutritionist_id: int,
    db: Session = Depends(get_db)
):
    try:
        current_hour = datetime.now().hour
        is_weekday = datetime.now().weekday() < 5
        
        is_online = is_weekday and 9 <= current_hour < 18
        
        if is_online:
            next_available = "Now"
        else:
            now = datetime.now()
            if now.weekday() >= 5:
                next_monday = now + timedelta(days=(7 - now.weekday()))
                next_available = next_monday.strftime("%A at 9:00 AM")
            elif current_hour < 9:
                next_available = "Today at 9:00 AM"
            else:
                tomorrow = now + timedelta(days=1)
                if tomorrow.weekday() < 5:
                    next_available = "Tomorrow at 9:00 AM"
                else:
                    next_available = "Monday at 9:00 AM"
        
        return {
            "is_online": is_online,
            "next_available": next_available,
            "working_hours": "Monday-Friday, 9:00 AM - 6:00 PM",
            "nutritionist_id": nutritionist_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching status: {str(e)}")

@app.post("/nutritionist/status/{nutritionist_id}")
async def update_nutritionist_status(
    nutritionist_id: int,
    status_data: dict,
    db: Session = Depends(get_db)
):
    try:
        existing_status = db.query(NutritionistStatusDB).filter(
            NutritionistStatusDB.nutritionist_id == nutritionist_id
        ).first()
        
        if existing_status:
            existing_status.is_online = status_data.get('is_online', existing_status.is_online)
            existing_status.last_seen = datetime.now()
            existing_status.next_available = status_data.get('next_available', existing_status.next_available)
            existing_status.working_hours = status_data.get('working_hours', existing_status.working_hours)
        else:
            new_status = NutritionistStatusDB(
                nutritionist_id=nutritionist_id,
                is_online=status_data.get('is_online', False),
                last_seen=datetime.now(),
                next_available=status_data.get('next_available'),
                working_hours=status_data.get('working_hours')
            )
            db.add(new_status)
        
        db.commit()
        return {"message": "Status updated successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating status: {str(e)}")

# --- Messaging Endpoints (from Part 2) ---
    


@app.put("/messages/mark-read/{user_id}/{nutritionist_id}")
async def mark_messages_read(
    user_id: int,
    nutritionist_id: int,
    db: Session = Depends(get_db)
):
    try:
        db.query(Message).filter(
            Message.user_id == user_id,
            Message.nutritionist_id == nutritionist_id,
            Message.sender == 'user',
            Message.is_read == False
        ).update({Message.is_read: True})
        
        db.commit()
        return {"message": "Messages marked as read"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating messages: {str(e)}")

@app.get("/messages/unread-count/{nutritionist_id}")
async def get_unread_count(
    nutritionist_id: int,
    db: Session = Depends(get_db)
):
    try:
        count = db.query(Message).filter(
            Message.nutritionist_id == nutritionist_id,
            Message.sender == 'user',
            Message.is_read == False
        ).count()
        
        return {"unread_count": count}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching unread count: {str(e)}")

# --- Plan Approval Endpoints (from Part 2) ---

@app.get("/nutritionist/plans/pending")
async def get_pending_plans(
    # NOTE: Assumed nutritionist_id is passed as a query param or from auth context
    nutritionist_id: int = 1, # Hardcoded for demo/simplicity
    db: Session = Depends(get_db)
):
    try:
        plans = db.query(PlanApproval).filter(
            PlanApproval.nutritionist_id == nutritionist_id,
            PlanApproval.status == 'pending'
        ).all()
        
        return plans
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching pending plans: {str(e)}")

@app.get("/plans/{plan_id}")
async def get_plan(
    plan_id: int,
    db: Session = Depends(get_db)
):
    try:
        plan = db.query(PlanApproval).filter(PlanApproval.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        return plan
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching plan: {str(e)}")

@app.put("/plans/{plan_id}")
async def update_plan(
    plan_id: int,
    update_data: PlanApprovalUpdate,
    db: Session = Depends(get_db)
):
    try:
        plan = db.query(PlanApproval).filter(PlanApproval.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        plan.status = update_data.status
        plan.feedback = update_data.feedback
        
        if update_data.status == 'modified' and update_data.modified_plan:
            plan.plan_content = update_data.modified_plan
        
        plan.updated_at = datetime.now()
        
        db.commit()
        db.refresh(plan)
        
        return plan
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating plan: {str(e)}")

@app.get("/plans/{plan_id}/user")
async def get_plan_user(
    plan_id: int,
    db: Session = Depends(get_db)
):
    try:
        plan = db.query(PlanApproval).filter(PlanApproval.id == plan_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        user = db.query(UserProfile).filter(UserProfile.id == plan.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")

@app.get("/user/plan-status/{user_id}")
async def get_plan_status(user_id: int, db: Session = Depends(get_db)):
    try:
        plan = db.query(PlanApproval).filter(
            PlanApproval.user_id == user_id,
            PlanApproval.status == 'approved'
        ).order_by(PlanApproval.updated_at.desc()).first()
        
        if not plan:
            return {"status": "no_approved_plan", "plan_content": None}
        
        return {
            "status": plan.status,
            "plan_content": plan.plan_content
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching plan status: {str(e)}")

# --- AI Agent Endpoint (from Part 2) ---



def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.headers.get("Authorization")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Note: This simple token lookup is likely insufficient for production but matches the intent.
    try:
        token_int = int(token)
    except ValueError:
        # If token is not an integer, check if it's a UUID session token or handle appropriately
        pass 
    
    # Check UserProfile (using the integer token)
    user = db.query(UserProfile).filter(UserProfile.token == token_int).first()
    if user:
        return {"id": user.id, "type": "user", "name": user.name}
    
    # Check NutritionistInfo (using ID, although token handling here is complex in practice)
    # Assuming token is the nutritionist ID for this lookup
    nutritionist = db.query(NutritionistInfo).filter(NutritionistInfo.id == token_int).first()
    if nutritionist:
        return {"id": nutritionist.id, "type": "nutritionist", "name": nutritionist.name}
    
    raise HTTPException(status_code=401, detail="Invalid token")


# new working ------------------------------------------------------------------------------------------------

@app.get("/get-profile/{token}")
def get_user_profile(token: int, db: Session = Depends(get_db)):
    """Fetches user profile."""
    try:
        print(f"🔍 Looking for user with token: {token}")
        token_int = int(token)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid token format")
    
    user_data = db.query(UserProfile).filter(UserProfile.token == token_int).first()
    print(f"🔍 User found: {user_data}")
    
    if not user_data:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    return user_data

@app.post("/chat/save-message")
async def save_chat_message(request_data: dict, db: Session = Depends(get_db)):
    try:
        user_token = request_data.get('user_token')
        message_text = request_data.get('message')
        is_user = request_data.get('is_user', True)
        chat_type = request_data.get('chat_type', 'ai_chat')  # 'ai_chat' or 'nutritionist_chat'
        
        user = db.query(UserProfile).filter(UserProfile.token == user_token).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # FIX: Determine sender based on chat_type and is_user
        if chat_type == 'ai_chat':
            sender = 'user' if is_user else 'bot'
            nutritionist_id = None
        else:  # nutritionist_chat
            sender = 'user' if is_user else 'nutritionist'
            nutritionist_id = 1  # Always set for nutritionist chats
        
        new_message = Message(
            user_id=user.id,
            nutritionist_id=nutritionist_id,
            message=message_text,
            sender=sender,  # CORRECT sender
            is_read=False,
            chat_type=chat_type  # CORRECT chat_type
        )
        
        db.add(new_message)
        db.commit()
        return {"success": True, "message_id": new_message.id}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save message: {str(e)}")
        
@app.get("/chat/history-grouped/{token}")
async def get_chat_history_grouped(token: int, db: Session = Depends(get_db)):
    """Get ALL chat history grouped by date and chat type"""
    try:
        user = db.query(UserProfile).filter(UserProfile.token == token).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        messages = db.query(Message).filter(
            Message.user_id == user.id
        ).order_by(Message.created_at.asc()).all()
        
        # Group by date AND chat type
        grouped_messages = {}
        for msg in messages:
            date_key = msg.created_at.date().isoformat()
            chat_type = msg.chat_type
            
            if date_key not in grouped_messages:
                grouped_messages[date_key] = {}
            
            if chat_type not in grouped_messages[date_key]:
                grouped_messages[date_key][chat_type] = []
            
            grouped_messages[date_key][chat_type].append({
                "id": msg.id,
                "content": msg.message,
                "is_user": msg.sender == 'user',
                "timestamp": msg.created_at,
                "chat_type": chat_type
            })
        
        return grouped_messages
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching chat history: {str(e)}")
    
@app.get("/nutritionist/user-profile/{user_id}")
async def get_user_profile_for_nutritionist(user_id: int, db: Session = Depends(get_db)):
    user = db.query(UserProfile).filter(UserProfile.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Return all user profile data including height, weight, etc.
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "height_cm": user.height_cm,
        "weight_kg": user.weight_kg,
        "allergies": user.allergies,
        "diseases": user.diseases,
        "diet_type": user.diet_type,
        "dob": user.dob,
        "country": user.country,
        "city": user.city,
        "diet_duration_days": user.diet_duration_days,
        "servings_per_day": user.servings_per_day,
        "main_goal": user.main_goal
    }

@app.get("/nutritionist/clinical-notes/{user_id}")
async def get_clinical_note(user_id: int, db: Session = Depends(get_db)):
    """Get the single clinical note for a user"""
    try:
        note = db.query(ClinicalNote).filter(
            ClinicalNote.user_id == user_id
        ).first()
        
        print(f"📖 Fetching note for user {user_id}: {note.notes if note else 'No note found'}")
        
        # Return empty object if no note exists
        if not note:
            return {"id": None, "notes": "", "created_at": None, "updated_at": None}
        
        return note
        
    except Exception as e:
        print(f"❌ Error fetching note: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching note: {str(e)}")

import time

@app.post("/nutritionist/clinical-notes/{user_id}")
async def upsert_clinical_note(user_id: int, note_data: dict, db: Session = Depends(get_db)):
    """Force update the first valid note for this user"""
    try:
        print(f"📝 Saving note for user {user_id}")
        
        # Get ALL notes for this user
        all_notes = db.query(ClinicalNote).filter(
            ClinicalNote.user_id == user_id
        ).order_by(ClinicalNote.id.asc()).all()
        
        print(f"🔍 Found {len(all_notes)} notes for user {user_id}")
        
        if all_notes:
            # Use the first valid note (lowest ID > 0)
            target_note = None
            for note in all_notes:
                if note.id > 0:
                    target_note = note
                    break
            
            if target_note:
                # Update the first valid note
                target_note.notes = note_data.get('notes', '')
                target_note.updated_at = datetime.utcnow()
                db.commit()
                db.refresh(target_note)
                print(f"✅ Updated note ID: {target_note.id}")
                return {"action": "updated", "note": target_note}
        
        # If no valid note exists, create one
        new_note = ClinicalNote(
            user_id=user_id,
            nutritionist_id=note_data.get('nutritionist_id', 1),
            notes=note_data.get('notes', '')
        )
        db.add(new_note)
        db.commit()
        db.refresh(new_note)
        print(f"✅ Created new note ID: {new_note.id}")
        return {"action": "created", "note": new_note}
            
    except Exception as e:
        db.rollback()
        print(f"❌ Error saving note: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving note: {str(e)}")
    
        
@app.get("/messages/conversation/{user_id}/{nutritionist_id}")
async def get_conversation(user_id: int, nutritionist_id: int, db: Session = Depends(get_db)):
    """Get ALL messages between user and nutritionist"""
    try:
        # Get messages where:
        # - User sent to nutritionist (nutritionist_chat) 
        # - Nutritionist sent to user (nutritionist_chat)
        messages = db.query(Message).filter(
            Message.user_id == user_id,
            Message.chat_type == 'nutritionist_chat'
        ).order_by(Message.created_at.asc()).all()
        
        print(f"💬 Found {len(messages)} messages for user {user_id}")
        return messages
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching messages: {str(e)}")
    
@app.delete("/messages/{message_id}")
async def delete_message(message_id: int, db: Session = Depends(get_db)):
    """Delete a message"""
    try:
        print(f"🗑️ Attempting to delete message ID: {message_id}")
        
        message = db.query(Message).filter(Message.id == message_id).first()
        if not message:
            print(f"❌ Message {message_id} not found")
            raise HTTPException(status_code=404, detail="Message not found")
        
        print(f"✅ Found message: {message.id} from {message.sender}")
        db.delete(message)
        db.commit()
        
        print(f"✅ Successfully deleted message {message_id}")
        return {"success": True, "message": "Message deleted"}
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error deleting message: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting message: {str(e)}")
    
# User and cmulti agent connections
    
@app.post("/chat/ai")
async def chat_with_ai(request: ChatRequest, db: Session = Depends(get_db)):  

    try:
        # Create initial state for the multi-agent system
        state = {
            "messages": request.conversation_history + [{"role": "user", "content": request.message}],
            "diet_type": request.diet_type,
            "user_data": request.user_data,
            "data_level": request.data_level,
            "plan_generated": request.plan_generated,
            "nutrition_feedback": request.nutrition_feedback,
            "needs_revision": request.needs_revision
        }

        # ✅ USE YOUR LANGGRAPH MULTI-AGENT SYSTEM
        print("🚀 Invoking multi-agent system...")
        final_state = workflow_app.invoke(state)  # Use workflow_app, not app
        
        # ✅ CHECK IF PLAN WAS GENERATED AND SAVE TO DB
        if final_state.get("generated_plan") and not final_state.get("db_plan_saved"):
            user_id = request.user_data.get('id')
            if user_id:
                print(f"💾 Saving generated plan to DB for user {user_id}")
                new_plan = PlanApproval(
                    user_id=user_id,
                    nutritionist_id=1,
                    plan_content=final_state["generated_plan"],
                    status='pending'
                )
                db.add(new_plan)
                db.commit()
                final_state["db_plan_saved"] = True
                print("✅ Plan saved to DB with status 'pending'")
        
        # Get the last AI response
        last_ai_message = None
        api_messages = []


        for msg in final_state["messages"]:
            if msg["role"] == "assistant":
                last_ai_message = msg["content"]
                break
        
        if not last_ai_message:
            last_ai_message = "I'm here to help with your nutrition goals!"
        
        return {
            "response": last_ai_message,
            "conversation_history": final_state["messages"],
            "data_level": final_state.get("data_level", 1),
            "plan_generated": final_state.get("plan_generated", False),
            "plan_created": final_state.get("db_plan_saved", False)
        }
    
    except Exception as e:
        print(f"❌ Multi-agent error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"AI chat error: {str(e)}")
        
@app.on_event("startup")
def on_startup():
    try:
        create_db_tables()
        print("✅ Database tables created successfully!")
        
        # Test database connection
        db = SessionLocal()
        tables = db.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()
        print(f"✅ Database tables: {tables}")
        db.close()
        
    except Exception as e:
        print(f"❌ Database startup error: {e}")
    
# --- Run Command ---
if __name__ == "__main__":
    # Ensure this file runs on port 8000, matching your frontend's request
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
