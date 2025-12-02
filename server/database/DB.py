import socket
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import Request

from config.config import MONGODB_USERNAME, MONGODB_PASSWORD, CLUSTER_NAME, APP_NAME, DATABASE_NAME
from helpers.DateTimeSerializer import DateTimeSerializerVisitor

def get_db(request: Request):
    """Dependency to get database instance from app state"""
    return request.app.state.db

class Database:
    def __init__(self):
        self.MONGO_URI = f"mongodb+srv://{MONGODB_USERNAME}:{MONGODB_PASSWORD}@{CLUSTER_NAME}.mongodb.net/?retryWrites=true&w=majority&appName={APP_NAME}"
        self.client = None
        self.db = None
    
    def connect(self):
        self.client = AsyncIOMotorClient(self.MONGO_URI)
        self.db = self.client[DATABASE_NAME]
        print(f"Connected to MongoDB at {self.MONGO_URI} on host {socket.gethostname()}")
        
    def serializer(self, obj):
        visitor = DateTimeSerializerVisitor()
        return visitor.visit(obj)
        
    def check_connection(self):
        hostname = f"{CLUSTER_NAME}.mongodb.net"
        print(f"Testing DNS resolution for: {hostname}")
        dns_success = False

        try:
            ip = socket.gethostbyname(hostname)
            print(f"Standard DNS resolution successful: {hostname} -> {ip}")
            dns_success = True
        except socket.gaierror as dns_error:
            print(f"Standard DNS resolution failed: {dns_error}")
            try:
                socket.setdefaulttimeout(10)
                ip = socket.gethostbyname(hostname)
                print(f" DNS resolution with timeout successful: {hostname} -> {ip}")
                dns_success = True
            except socket.gaierror as dns_error2:
                print(f" DNS resolution with timeout also failed: {dns_error2}")

        if not dns_success:
            print("\n DNS RESOLUTION TROUBLESHOOTING:")
            print("1. Check if you're behind a corporate firewall/proxy")
            print("2. Try using a different DNS server (8.8.8.8 or 1.1.1.1)")
            print("3. Check if MongoDB Atlas is accessible from your network")
            print("4. Verify the cluster name in MongoDB Atlas dashboard")
            print("\n  Continuing without DNS verification - connection may still work...")
    
    def get_collection(self, collection_name):
        """Get a collection object for direct MongoDB operations"""
        return self.db[collection_name]
        
    async def add(self, collection_name, data):
        collection = self.db[collection_name]
        result = await collection.insert_one(data)
        
        if result.inserted_id:
            data["_id"] = str(result.inserted_id)
            data = self.serializer(data)
            return {
                "status": 200,
                "data": data,
                "message": "Document added successfully"
            }
        else:
            return {
                "status": 500,
                "message": "Failed to add document"
            }
    
    async def find_many(self, collection_name, query={}, projection=None, sort=None, limit=None):
        """Find multiple documents matching query"""
        collection = self.db[collection_name]
        cursor = collection.find(query, projection)
        
        if sort:
            cursor = cursor.sort(sort)
        if limit:
            cursor = cursor.limit(limit)
            
        documents = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            doc = self.serializer(doc)
            documents.append(doc)
        
        return {
            "status": 200,
            "data": documents,
            "message": "Documents retrieved successfully"
        }
    
    async def find_one(self, collection_name, query):
        """Find a single document (returns document directly or None)"""
        collection = self.db[collection_name]
        document = await collection.find_one(query)
        
        if document:
            document["_id"] = str(document["_id"])
            document = self.serializer(document)
        
        return document
            
    async def update(self, collection_name, query, update_string):
        collection = self.db[collection_name]
        result = await collection.update_one(query, update_string)
        
        return {
            "status": 200 if result.modified_count > 0 else 404,
            "matched_count": result.matched_count,
            "modified_count": result.modified_count,
            "message": "Document updated successfully" if result.modified_count > 0 else "Document not found or no changes made"
        }
    
    async def update_many(self, collection_name, query, update_string):
        """Update multiple documents"""
        collection = self.db[collection_name]
        result = await collection.update_many(query, update_string)
        
        return {
            "status": 200,
            "matched_count": result.matched_count,
            "modified_count": result.modified_count,
            "message": f"Updated {result.modified_count} documents"
        }
            
    async def delete(self, collection_name, query):
        collection = self.db[collection_name]
        result = await collection.delete_one(query)
        
        return {
            "status": 200 if result.deleted_count > 0 else 404,
            "deleted_count": result.deleted_count,
            "message": "Document deleted successfully" if result.deleted_count > 0 else "Document not found"
        }
        