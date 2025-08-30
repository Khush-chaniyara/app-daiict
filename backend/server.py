from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'green_ledger')]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    role: str  # producer, buyer, regulator
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Credit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    batch_id: str
    producer_id: str
    owner_id: str
    units: float
    production_date: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_retired: bool = False
    blockchain_hash: str = ""

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    credit_id: str
    from_user_id: str
    to_user_id: str
    units: float
    transaction_type: str  # mint, transfer, retire
    blockchain_hash: str = ""
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Request Models
class LoginRequest(BaseModel):
    username: str
    role: str

class ProductionRequest(BaseModel):
    batch_id: str
    units: float
    production_date: datetime

class TransferRequest(BaseModel):
    credit_id: str
    buyer_id: str
    units: float

# Authentication endpoints
@api_router.post("/auth/login")
async def login(request: LoginRequest):
    try:
        # Check if user exists
        existing_user = await db.users.find_one({"username": request.username})
        
        if existing_user:
            user = User(**existing_user)
        else:
            # Create new user
            user = User(username=request.username, role=request.role)
            await db.users.insert_one(user.dict())
        
        return {
            "success": True,
            "user": user.dict(),
            "message": "Login successful"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

# Producer endpoints
@api_router.post("/producer/mint-credit")
async def mint_credit(request: ProductionRequest, producer_id: str):
    try:
        # Simulate blockchain transaction hash
        blockchain_hash = f"0x{uuid.uuid4().hex[:64]}"
        
        # Create credit
        credit = Credit(
            batch_id=request.batch_id,
            producer_id=producer_id,
            owner_id=producer_id,
            units=request.units,
            production_date=request.production_date,
            blockchain_hash=blockchain_hash
        )
        
        # Save credit to database
        await db.credits.insert_one(credit.dict())
        
        # Create transaction record
        transaction = Transaction(
            credit_id=credit.id,
            from_user_id="system",
            to_user_id=producer_id,
            units=request.units,
            transaction_type="mint",
            blockchain_hash=blockchain_hash
        )
        
        await db.transactions.insert_one(transaction.dict())
        
        return {
            "success": True,
            "credit": credit.dict(),
            "transaction_hash": blockchain_hash,
            "message": "Credit minted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Credit minting failed: {str(e)}")

@api_router.get("/producer/{producer_id}/credits")
async def get_producer_credits(producer_id: str):
    try:
        credits = await db.credits.find({"owner_id": producer_id}, {"_id": 0}).to_list(1000)
        return {
            "success": True,
            "credits": credits
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch credits: {str(e)}")

# Buyer endpoints
@api_router.get("/buyer/available-credits")
async def get_available_credits():
    try:
        # Get all credits that are not retired and not owned by the buyer
        credits = await db.credits.find({"is_retired": False}, {"_id": 0}).to_list(1000)
        
        # Add producer information
        for credit in credits:
            producer = await db.users.find_one({"id": credit["producer_id"]}, {"_id": 0})
            credit["producer_name"] = producer["username"] if producer else "Unknown"
        
        return {
            "success": True,
            "credits": credits
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch available credits: {str(e)}")

@api_router.post("/buyer/purchase-credit")
async def purchase_credit(request: TransferRequest):
    try:
        # Simulate blockchain transaction hash
        blockchain_hash = f"0x{uuid.uuid4().hex[:64]}"
        
        # Update credit owner
        await db.credits.update_one(
            {"id": request.credit_id},
            {"$set": {"owner_id": request.buyer_id}}
        )
        
        # Get credit details
        credit = await db.credits.find_one({"id": request.credit_id})
        
        # Create transaction record
        transaction = Transaction(
            credit_id=request.credit_id,
            from_user_id=credit["producer_id"],
            to_user_id=request.buyer_id,
            units=request.units,
            transaction_type="transfer",
            blockchain_hash=blockchain_hash
        )
        
        await db.transactions.insert_one(transaction.dict())
        
        return {
            "success": True,
            "transaction": transaction.dict(),
            "transaction_hash": blockchain_hash,
            "message": "Credit purchased successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Credit purchase failed: {str(e)}")

@api_router.get("/buyer/{buyer_id}/purchases")
async def get_buyer_purchases(buyer_id: str):
    try:
        transactions = await db.transactions.find({
            "to_user_id": buyer_id,
            "transaction_type": "transfer"
        }).to_list(1000)
        
        return {
            "success": True,
            "purchases": transactions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch purchases: {str(e)}")

# Regulator endpoints
@api_router.get("/regulator/transactions")
async def get_all_transactions():
    try:
        transactions = await db.transactions.find({}).to_list(1000)
        
        # Add user information
        for transaction in transactions:
            from_user = await db.users.find_one({"id": transaction["from_user_id"]})
            to_user = await db.users.find_one({"id": transaction["to_user_id"]})
            
            transaction["from_user_name"] = from_user["username"] if from_user else "System"
            transaction["to_user_name"] = to_user["username"] if to_user else "Unknown"
        
        return {
            "success": True,
            "transactions": transactions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch transactions: {str(e)}")

@api_router.get("/regulator/credits-overview")
async def get_credits_overview():
    try:
        total_credits = await db.credits.count_documents({})
        retired_credits = await db.credits.count_documents({"is_retired": True})
        active_credits = total_credits - retired_credits
        
        return {
            "success": True,
            "overview": {
                "total_credits": total_credits,
                "active_credits": active_credits,
                "retired_credits": retired_credits
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch credits overview: {str(e)}")

# General endpoints
@api_router.get("/")
async def root():
    return {"message": "Green Ledger API"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()