# Loyalty Program Management Website

## CSE303P Software Engineering Lab Project
## Team Name: DeLeetcode
## Team Members: 
- Gourav Anirudh B J (IMT2023005)
- Sathish Adithiyaa S V (IMT2023030)
- Sahil Kolte (IMT2023066)
- Sriram Srikanth (IMT2023115)

## About the project

A comprehensive web-based platform for managing college event participation and tracking loyalty points. The system enables administrators to create events, volunteers to mark attendance, and participants to join teams and compete on a leaderboard.

---

## Software Development Lifecycle phases:
- **Requirements Analysis:** We listed down all the requirements in SRS, adding the function and non-functional requirements, UML diagrams.
- **Design Phase:** We designed the low level and high level architecture of the project using architecture diagrams and planned possible design patterns which can be used.
- **Implementation Phase:** We implemented the project which follows a three tier client-server-database architecture, by implementing the frontend in ReactJS + Typescript, backend in FAST API (Python) and using MongoDB as the data store. 
- **Testing Phase:** The frontend was testing visually by clicking and testing all features for functionality, responsivness and UI completeness, the backend was tested using pytest which enabled us to test the backend API endpoint functionalities.


## Roles and Features

### Admin
- **Event Management**: Create, update, and delete events with custom points and secret codes
- **Volunteer Management**: Add or remove volunteers who can mark attendance
- **Dashboard**: View comprehensive statistics including total events, participants, and leaderboard
- **Event Control**: Mark events as expired to prevent further participation
- **Full Access**: Access to all administrative endpoints and data

### Volunteer
- **Event Authorization**: Authenticate for specific events using secret codes
- **QR Code Scanning**: Scan team QR codes to mark attendance and award points
- **Event Selection**: Choose which event they are working on
- **Limited Access**: Can only access assigned events and attendance marking features

### Participant
- **Team Management**: Create or join teams (max 3 members per team)
- **Team Dashboard**: View team details, points, and participated events
- **Join Options**: Join teams using join codes or QR codes
- **Leaderboard**: Track team rankings and compare with other teams
- **Event Participation**: Earn points by participating in events through team attendance
- **Team Actions**: Leave team before deadline, view team QR code and join code

---

## Tech Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.2
- **Styling**: Tailwind CSS 3.4.18
- **Routing**: React Router DOM 7.9.1
- **QR Code**: 
  - `qrcode.react` for QR generation
  - `@yudiel/react-qr-scanner` for QR scanning
  - `html5-qrcode` for additional scanning support
- **HTTP Client**: Axios 1.12.2
- **Icons**: Lucide React 0.344.0

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: 
  - Microsoft OAuth 2.0 (Authlib)
  - Session-based auth with Starlette SessionMiddleware
- **Security**: 
  - JWT tokens (Python-JOSE) for volunteer authorization
  - AES-GCM encryption for secret codes
- **Testing**: Pytest
- **Additional Libraries**:
  - `python-dotenv` for environment configuration
  - `httpx` for async HTTP requests

---

## UML Diagrams

#### Class Diagrams

![Class Diagrams](./diagrams/class_diagram.jpeg)

#### Use Case Diagram

![Use Case Diagram](./diagrams/use_case_diagram.jpeg)

#### Sequence Diagram

**Authentication and event creation flow**

![Sequence Diagram](./diagrams/sequence_diagram1.jpeg)

**Team management and attendance flow**

![Sequence Diagram](./diagrams/sequence_diagram2.jpeg)

---

## Architecture Design

### Client-Server Architecture

The application follows a traditional **3-tier client-server architecture**:

![Architecture Diagram](./diagrams/architecture_diagram.jpeg)

### Frontend Architecture

#### Folder Structure

```
client/
├── public/
│   └── images/              # Static assets
├── src/
│   ├── components/          # React components organized by role
│   │   ├── admin/          # Admin-specific components
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── EventCard.tsx
│   │   │   ├── EventModal.tsx
│   │   │   ├── FilterModal.tsx
│   │   │   ├── LeaderboardPage.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── VolunteerModal.tsx
│   │   ├── participant/    # Participant-specific components
│   │   │   ├── ParticipantPortal.tsx
│   │   │   ├── ProfileDropDown.tsx
│   │   │   ├── TeamDashboard.tsx
│   │   │   └── TeamJoinCreate.tsx
│   │   ├── volunteer/      # Volunteer-specific components
│   │   │   ├── EventSelector.tsx
│   │   │   ├── QRScanner.tsx
│   │   │   └── VolunteerPortal.tsx
│   │   ├── shared/         # Shared components
│   │   │   └── ProtectedRoute.tsx
│   │   └── Login.tsx       # Login component
│   ├── config/             # Configuration files
│   │   └── config.ts       # API URLs and constants
│   ├── hooks/              # Custom React hooks (Business Logic Layer)
│   │   ├── useAuth.tsx     # Authentication logic
│   │   ├── useEvents.ts    # Event management logic
│   │   ├── useLeaderboard.ts
│   │   ├── useTeams.ts     # Team management logic
│   │   ├── useVolunteerActions.ts
│   │   └── useVolunteers.ts
│   ├── models/             # TypeScript interfaces and API service
│   │   ├── props/          # Component prop interfaces
│   │   ├── API_Service.ts  # API client wrapper
│   │   ├── Event.ts        # Event interface
│   │   ├── Team.ts         # Team interface
│   │   └── User.ts         # User interface
│   ├── pages/              # Top-level page components
│   │   ├── AdminPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── LeaderboardPage.tsx
│   │   ├── ParticipantPage.tsx
│   │   └── VolunteersPage.tsx
│   ├── service/            # API and utility services
│   │   ├── api.ts          # Axios configuration
│   │   └── cryptography.ts # Encryption utilities
│   ├── App.tsx             # Root component with routing
│   ├── main.tsx            # Application entry point
│   └── index.css           # Global styles (Tailwind)
├── index.html              # HTML template
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
└── tailwind.config.js      # Tailwind CSS configuration
```

#### Martin Fowler Architecture for React Applications

The frontend follows **Martin Fowler's Presentation Domain Data Layering** pattern adapted for React:

1. **Presentation Layer (Components)**
   - Pure UI components focused on rendering
   - Minimal business logic
   - Organized by feature/role (admin, volunteer, participant)
   - Reusable shared components

2. **Domain/Business Logic Layer (Custom Hooks)**
   - `useAuth`: Authentication state and operations
   - `useEvents`: Event CRUD operations
   - `useTeams`: Team management logic
   - `useVolunteers`: Volunteer management
   - `useLeaderboard`: Leaderboard data fetching
   - Encapsulates business rules and state management

3. **Data Access Layer (Services)**
   - `api.ts`: Axios instance with interceptors
   - `API_Service.ts`: Centralized API calls
   - `cryptography.ts`: Encryption/decryption utilities
   - Abstracts HTTP communication

4. **Models (TypeScript Interfaces)**
   - Type definitions for data structures
   - Prop interfaces for component contracts
   - Ensures type safety across layers

**Benefits:**
- Clear separation of concerns
- Testable business logic
- Reusable hooks across components
- Easy to maintain and scale

#### Frontend Endpoints

| Endpoint | Purpose | Access |
|----------|---------|--------|
| `/` | Login home page | All (Unauthenticated) |
| `/admin` | Admin page | Admin |
| `/volunteer` | Volunteers' page | Admin,Volunteers |
| `/participant` | Participants' page | Admin,Volunteers,Participants |
| `/leaderboard` | Leaderboard page | Admin,Volunteers,Participants |

---

### Backend Architecture

#### Folder Structure

```
server/
├── routes/                     # API route handlers (Controller Layer)
│   ├── AuthRouter.py          # Authentication endpoints
│   ├── EventRouter.py         # Event management endpoints
│   ├── VolunteerRouter.py     # Volunteer management endpoints
│   ├── AttendanceRouter.py    # QR scanning and attendance
│   ├── TeamRouter.py          # Team management endpoints
│   └── dependencies.py        # Shared dependency functions (NEW)
├── models.py                   # Pydantic models for request/response
├── database/                   # Data Access Layer
│   └── DB.py                  # Database class with CRUD operations
├── helpers/                    # Utility functions and strategies
│   ├── DateTimeSerializer.py  # Visitor pattern for datetime serialization
│   ├── QRCodeGenerator.py     # QR code generation utilities
│   └── SecretCodeEncryptionStrategy.py  # Strategy pattern for encryption
├── config/                     # Configuration management
│   └── config.py              # Environment variables and settings
├── tests/                      # Test suite
│   ├── conftest.py            # Pytest fixtures
│   └── test_basic.py          # Unit tests
├── main.py                     # FastAPI application entry point
├── requirements.txt            # Python dependencies
└── pyproject.toml             # Pytest configuration
```

#### Design Patterns Used

##### 1. **Singleton Pattern** (Database Connection)

**File**: `database/DB.py`

**Benefits**:
- Single MongoDB connection pool
- Prevents resource exhaustion
- Centralized database access

##### 2. **Visitor Pattern** (DateTime Serialization)

**File**: `helpers/DateTimeSerializer.py`

**Benefits**:
- Separates serialization logic from data structures
- Easy to extend for other types
- Handles nested objects recursively

##### 3. **Strategy Pattern** (Encryption/Decryption)

**File**: `helpers/SecretCodeEncryptionStrategy.py`

**Benefits**:
- Interchangeable encryption algorithms
- Encapsulates encryption logic
- Easy to swap strategies (e.g., RSA, AES-CBC)

##### 4. **Dependency Injection Pattern** (FastAPI)

**File**: `routes/dependencies.py` (Centralized dependencies)

**Benefits**:
- Automatic authentication/authorization
- Reusable across all routers
- Testable (can mock dependencies)
- Single source of truth

##### 5. **Repository Pattern** (Database Abstraction)

**File**: `database/DB.py`

**Benefits**:
- Abstracts MongoDB operations
- Easy to switch databases
- Consistent error handling

#### (iii) Backend API Endpoints

| Endpoint | Method | Purpose | Access | Route File |
|----------|--------|---------|--------|------------|
| **Authentication & Session** |
| `/api/login` | GET | Initiate Microsoft OAuth flow | Public | AuthRouter.py |
| `/api/auth` | GET | OAuth callback, create session | Public | AuthRouter.py |
| `/api/health` | GET | Health check endpoint | Public | AuthRouter.py |
| `/api/user/profile` | GET | Get current user info | Authenticated | AuthRouter.py |
| `/api/logout` | GET | Clear session, logout | Authenticated | AuthRouter.py |
| `/api/debug/session` | GET | Debug session data (dev) | Authenticated | AuthRouter.py |
| **Event Management** |
| `/api/events` | GET | List all events | Authenticated | EventRouter.py |
| `/api/events?ids={id1,id2}` | GET | Get specific events by IDs | Authenticated | EventRouter.py |
| `/api/events` | POST | Create new event | Admin | EventRouter.py |
| `/api/events/{event_id}` | PUT | Update event details | Admin | EventRouter.py |
| `/api/events/{event_id}` | DELETE | Delete event | Admin | EventRouter.py |
| **Volunteer Management** |
| `/api/volunteer` | GET | List all volunteers | Admin, Volunteer | VolunteerRouter.py |
| `/api/volunteer` | POST | Add new volunteer | Admin | VolunteerRouter.py |
| `/api/volunteer/{roll_number}` | GET | Get volunteer by roll number | Admin, Volunteer | VolunteerRouter.py |
| `/api/volunteer/{roll_number}` | DELETE | Remove volunteer | Admin | VolunteerRouter.py |
| `/api/volunteer/authorize` | POST | Authorize volunteer for event (returns JWT) | Admin, Volunteer | VolunteerRouter.py |
| **Attendance & QR Scanning** |
| `/api/volunteer/scan` | POST | Scan team QR, award points | Admin, Volunteer (JWT) | AttendanceRouter.py |
| **Team Management** |
| `/api/create_team` | POST | Create new team | Participant | TeamRouter.py |
| `/api/my_team` | GET | Get user's current team | Participant | TeamRouter.py |
| `/api/join_team_by_code` | POST | Join team using join code | Participant | TeamRouter.py |
| `/api/leave_team` | POST | Leave current team | Participant | TeamRouter.py |
| `/api/leaderboard/full` | GET | Get sorted leaderboard | Authenticated | TeamRouter.py |

**Authentication Mechanisms:**
- **Session-based**: Used for main user authentication (stored in secure cookies)
- **JWT tokens**: Used for volunteer event authorization (short-lived, event-specific)

---

##  Testing

### Testing Framework: Pytest

**Location**: `server/tests/`

### Test Structure

```
tests/
├── conftest.py          # Pytest fixtures and configuration
└── test_basic.py        # Unit tests for backend
```

### Test Coverage

#### 1. **API Endpoint Tests**
- Health check endpoint
- Authentication requirements
- Leaderboard access
- 404 error handling

#### 2. **Helper Function Tests**
- **DateTime Serialization** (Visitor Pattern)
  - Nested dictionary serialization
  - List serialization with datetime objects
- **Encryption/Decryption** (Strategy Pattern)
  - Secret code encryption
  - Decryption and roundtrip testing
- **QR Code Generation**
  - Team QR ID generation
  - Join code generation
  - ID format validation

#### 3. **Access Control Tests**
- Authenticated endpoints return 401 for unauthenticated users
- Role-based access control validation

### Running Tests

```bash
# Navigate to server directory
cd server

# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/test_basic.py

# Run with coverage report
pytest --cov=. --cov-report=html
```

### Test Configuration

**File**: `pyproject.toml`

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
```

![Test Results](./diagrams/test_results.png)

## How to Run Locally

### Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.9 or higher)
- **MongoDB** (local installation or MongoDB Atlas account)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/Humanoid2005/Loyalty_Program_Management_System.git
cd Loyalty_Program_Management_System
```

**Fill in the values for the environment variables in frontend and backend by following the .env.example present in both client, server folders**

### 2. Backend Setup

####  Navigate to server directory

```bash
cd server
```

#### Install dependencies

```bash
pip install -r requirements.txt
```

#### Run the backend server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup

#### Navigate to client directory

```bash
cd ../client # From project route
```

#### Install dependencies

```bash
npm install
```

### Run the frontend app

```bash
npm run dev
```
