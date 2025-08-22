# Session Lifecycle Management Implementation Specification

## Required Dependencies

- **@supabase/supabase-js**: Latest version for database operations and authentication
- **@supabase/ssr**: For server-side rendering support with authentication
- **uuid**: For generating unique session identifiers (if not using Supabase's built-in UUID generation)
- **zod**: For request/response validation schemas

## Prerequisites

- Supabase project configured with authentication enabled
- Sessions and learning_turns tables created in database
- Row Level Security (RLS) policies configured for user data isolation
- Next.js project with app router structure established
- Authentication context and middleware implemented

## Implementation Tasks

### Task 1: Database Type Generation and Client Configuration

**Objective**: Establish type-safe database operations and authentication-aware client setup

**Implementation Details**:

- Generate TypeScript types from Supabase schema using CLI command
- Create server-side Supabase client helper functions for API routes
- Implement client-side Supabase client for frontend operations
- Configure proper cookie-based authentication handling for SSR

**Technical Requirements**:

- Configure Supabase client to use cookies for SSR compatibility [Creating a Supabase client for SSR | Supabase Docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- Generate TypeScript types from database schema [Generating TypeScript Types | Supabase Docs](https://supabase.com/docs/guides/api/rest/generating-types)
- Create separate client instances for server and client-side operations
- Implement proper error handling for authentication failures

### Task 2: Session Data Models and Validation Schemas

**Objective**: Define TypeScript interfaces and validation schemas for session management

**Implementation Details**:

- Create TypeScript interfaces for session creation requests and responses
- Define validation schemas using Zod for input sanitization
- Implement session state enums and status types
- Create utility types for session metadata and progress tracking

**Technical Requirements**:

- Session creation request schema with language, difficulty, persona validation
- Session response schema with proper typing for database fields
- Turn state management types for tracking learning progression
- Error response schemas for consistent API error handling

### Task 3: Session Creation API Endpoint

**Objective**: Implement POST endpoint for creating new learning sessions

**API Route**: `/api/sessions`

**Implementation Details**:

- Create route handler following Next.js app router conventions [File-system conventions: route.js | Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/route)
- Validate user authentication using Supabase JWT
- Process and validate session creation parameters
- Generate unique session ID and initialize session record
- Return session confirmation with proper error handling

**Technical Requirements**:

- Extract user ID from authenticated Supabase session
- Validate required parameters: target_language, difficulty_level, persona_id
- Insert new session record with proper foreign key relationships
- Implement transaction handling for atomic session creation
- Return structured response with session ID and metadata

### Task 4: Session State Management API Endpoints

**Objective**: Implement endpoints for session state updates and turn management

**API Routes**:

- `PATCH /api/sessions/[sessionId]` - Update session state
- `POST /api/sessions/[sessionId]/turns` - Create new turn
- `PATCH /api/sessions/[sessionId]/turns/[turnId]` - Update turn state

**Implementation Details**:

- Implement session state validation and authorized access control
- Create turn initialization logic with proper session association
- Update session progress counters and completion tracking
- Implement turn state transitions with validation

**Technical Requirements**:

- Verify session ownership through RLS policies
- Validate state transitions to prevent invalid operations
- Update completed_turns counter atomically
- Track session context for learning continuity
- Implement proper transaction handling for state consistency

### Task 5: Session Completion Logic Implementation

**Objective**: Handle session finalization and completion processing

**Implementation Details**:

- Implement completion validation checking minimum turn requirements
- Update session status and end timestamp upon completion
- Calculate final learning metrics and progress summaries
- Trigger badge evaluation logic for milestone assessment

**Technical Requirements**:

- Validate session completion eligibility before status updates
- Update session metadata with completion timestamp and final metrics
- Prepare session summary data for client consumption
- Implement rollback mechanisms for failed completion attempts
- Ensure completion triggers proper badge evaluation workflows

### Task 6: Session Retrieval API Endpoints

**Objective**: Implement endpoints for fetching session data and history

**API Routes**:

- `GET /api/sessions` - List user sessions with filtering
- `GET /api/sessions/[sessionId]` - Get specific session details
- `GET /api/sessions/[sessionId]/turns` - Get session turns data

**Implementation Details**:

- Implement user-specific session querying with RLS enforcement
- Support filtering by session status and date ranges
- Return session details with associated turn data
- Implement proper pagination for session lists

**Technical Requirements**:

- Apply user authentication and authorization checks
- Use database indexes for efficient session querying
- Return properly structured session data with turn associations
- Implement error handling for non-existent or unauthorized sessions
- Support query parameters for filtering and pagination

### Task 7: Session State Management Utilities

**Objective**: Create utility functions and middleware for session orchestration

**Implementation Details**:

- Create session state validation utilities
- Implement session context management helpers
- Build turn progression logic and validation functions
- Create session cleanup utilities for abandoned sessions

**Technical Requirements**:

- Implement state machine logic for valid session transitions
- Create helper functions for session context preservation
- Build utilities for concurrent session handling
- Implement session timeout and cleanup mechanisms
- Create error handling utilities for state management operations

### Task 8: Error Handling and Response Standardization

**Objective**: Implement consistent error handling and API response formats

**Implementation Details**:

- Create standardized error response schemas
- Implement validation error handling with detailed messages
- Build database error handling with proper rollback mechanisms
- Create API response standardization utilities

**Technical Requirements**:

- Define error response format with error codes and messages
- Implement validation error mapping for user-friendly responses
- Create database constraint violation error handling
- Build logging mechanisms for error tracking and debugging
- Implement proper HTTP status code mapping for different error types

### Task 9: Authentication Integration and Security

**Objective**: Integrate authentication checks and security measures

**Implementation Details**:

- Implement JWT validation middleware for API routes
- Create user session extraction utilities
- Build authorization checks for session access
- Implement rate limiting for session operations

**Technical Requirements**:

- Implement authentication helpers for Next.js App Router [Supabase Auth with the Next.js App Router | Supabase Docs](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- Extract and validate user identity from Supabase session
- Enforce RLS policies for user data isolation
- Implement session ownership validation
- Create security logging for unauthorized access attempts