from sqlalchemy import create_engine, Column, Integer, String, Float, Date , DateTime , Text , ForeignKey , Boolean
from sqlalchemy.orm import declarative_base, sessionmaker , relationship
from datetime import datetime

# NOTE: Removed 'import utcnow' as it is likely not a standard library and unused.
# Assuming standard datetime is used.

SQLALCHEMY_DATABASE_URL = "sqlite:///./nutri_data.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Add password field to UserProfile
class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)  # NEW: Store hashed passwords
    dob = Column(Date)
    token = Column(Integer)
    height_cm = Column(Float)
    weight_kg = Column(Float)
    country = Column(String)
    city = Column(String)
    diet_type = Column(String)
    diet_duration_days = Column(Integer)
    allergies = Column(String)
    diseases = Column(String)
    servings_per_day = Column(Integer)
    main_goal = Column(String)


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id"))
    nutritionist_id = Column(Integer, ForeignKey("nutritionist_info.id"), nullable=True)
    message = Column(String)
    sender = Column(String)  # 'user', 'bot', 'nutritionist'
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    chat_type = Column(String, default='ai_chat')  # 'ai_chat' or 'nutritionist_chat'

class NutritionistInfo(Base):
    __tablename__ = "nutritionist_info"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.now)

class PlanApproval(Base):
    __tablename__ = "plan_approvals"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('user_profiles.id'))
    nutritionist_id = Column(Integer, ForeignKey('nutritionist_info.id'))
    plan_content = Column(Text)
    status = Column(String, default='pending')  # 'pending', 'approved', 'rejected'
    feedback = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class ClinicalNote(Base):
    __tablename__ = "clinical_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('user_profiles.id'))
    nutritionist_id = Column(Integer, ForeignKey('nutritionist_info.id'))
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class NutritionistStatusDB(Base):
    __tablename__ = "nutritionist_status"
    
    id = Column(Integer, primary_key=True, index=True)
    nutritionist_id = Column(Integer, ForeignKey('nutritionist_info.id'))
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, default=datetime.now)
    next_available = Column(String)
    working_hours = Column(String)

    
def create_db_tables():
    Base.metadata.create_all(bind=engine)
