# Xgaming Nova - Gaming Experimentation Platform

## Overview

Xgaming Nova is a web-based experimentation platform designed for mobile gaming teams. The application allows Product Managers and marketers to create and manage A/B tests for their games without requiring app store updates. The platform consists of a marketing landing page and a full-featured console for running experiments.

## System Architecture

### Frontend Architecture
- **React + TypeScript**: Modern React application with TypeScript for type safety
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework for styling
- **shadcn/ui**: High-quality component library built on Radix UI
- **Wouter**: Lightweight router for client-side navigation
- **TanStack Query**: Powerful data synchronization for React
- **Zustand**: Lightweight state management for authentication
- **React Hook Form**: Form handling with Zod validation

### Backend Architecture
- **Express.js**: Node.js web framework for API endpoints
- **TypeScript**: Type-safe server-side development
- **JWT Authentication**: Token-based authentication system
- **bcryptjs**: Password hashing for security
- **In-memory Storage**: Currently using memory storage with interface for easy database migration

### Database Strategy
- **Drizzle ORM**: Type-safe database toolkit
- **PostgreSQL**: Configured for production deployment (via Neon Database)
- **Schema**: Defined in shared folder for type consistency across frontend/backend

## Key Components

### Authentication System
- JWT-based authentication with refresh tokens
- Registration and login flows
- Password hashing with bcryptjs
- Persistent authentication state using Zustand

### Experiment Management
- Create, read, update, delete experiments
- Support for multiple experiment types (onboarding, tutorial, rewards, UI, level)
- Traffic splitting (50/50, 70/30, 90/10)
- Target audience selection
- Variant configuration with A/B testing

### Project Management
- Multi-project support per user
- API key generation for SDK integration
- Team collaboration features
- Role-based access control

### Data Models
- **Users**: Email, password, name, company, role
- **Projects**: Name, description, API key, user association
- **Experiments**: Comprehensive experiment configuration with variants, metrics, and results
- **Team Members**: Project collaboration with role-based permissions

## Data Flow

1. **User Registration/Login**: User creates account or logs in → JWT token generated → Stored in localStorage and Zustand
2. **Project Creation**: Default project created on registration → API key generated for SDK integration
3. **Experiment Creation**: User creates experiment through wizard → Stored with project association → Available for SDK queries
4. **Team Collaboration**: Users can invite team members → Role-based access to projects and experiments

## External Dependencies

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **next-themes**: Theme management (dark mode support)
- **class-variance-authority**: Type-safe variant styling

### Development Tools
- **ESBuild**: Fast bundling for production
- **PostCSS**: CSS processing with Tailwind
- **Autoprefixer**: CSS vendor prefixing

### Database & Storage
- **@neondatabase/serverless**: PostgreSQL serverless driver
- **connect-pg-simple**: PostgreSQL session store
- **nanoid**: Unique ID generation

## Deployment Strategy

### Development
- Vite development server with HMR
- Express server with middleware mode
- In-memory storage for rapid prototyping

### Production
- Vite build process for optimized frontend bundle
- ESBuild for server-side bundling
- Environment-based configuration
- Database migrations via Drizzle Kit

### Environment Configuration
- `NODE_ENV` for environment detection
- `DATABASE_URL` for PostgreSQL connection
- `JWT_SECRET` for authentication security
- Replit-specific configurations for development

## Changelog

Changelog:
- July 04, 2025. Initial setup
- July 04, 2025. Added light/dark theme toggle with custom OKLCH color scheme
- July 04, 2025. Transformed UI from generic "experiments" to FTUE-focused "personalizations" with objects and cohorts workflow
- July 05, 2025. Added comprehensive Segments page with segment builder modal, API endpoints, and storage layer
- July 05, 2025. Updated Experience Wizard Step 4 to "Target Audience & Traffic Split" with dual functionality:
  - All players mode: single global traffic slider (default)
  - Specific segments mode: multi-segment selection with individual splits per segment
  - Added segment search, validation, helper buttons (copy split, equalize), and low traffic warnings
- July 05, 2025. Implemented comprehensive Settings page with four-tab MVP structure:
  - Profile tab: Account management, security settings, locale preferences, API key management
  - Billing tab: Credit balance display, usage charts, payment methods, credit recharge options
  - Knowledge Base tab: Document upload/management for LLM citations with file status tracking
  - Integrations tab: Slack integration with workspace connection and event notifications
  - Added Avatar and Textarea UI components, integrated with console navigation
- July 05, 2025. Added PostgreSQL database integration with complete schema migration:
  - Created database tables for users, projects, experiments, team members, segments, objects, and campaigns
  - Implemented DatabaseStorage class with full CRUD operations for all entities
  - Added database relations using Drizzle ORM with proper foreign key relationships
  - Migrated from memory storage to persistent PostgreSQL database via Neon
  - Updated storage interface to support objects and campaigns with comprehensive data models
- July 05, 2025. Enhanced Objects page and added comprehensive Object Details functionality:
  - Updated Objects list table to show "Variants" column instead of "Flags Count"
  - Made object rows clickable to navigate to individual object detail pages
  - Created full-featured Object Details page (/objects/:id) with tabbed interface:
    * Overview tab: Summary tiles, description editing, quick actions
    * Parameters tab: Detailed flag configuration with copy functionality
    * Usage tab: List of experiences using the object with filtering
    * History tab: Timeline of object changes and modifications
  - Added API endpoints for object details, usage tracking, and history
  - Replaced all hardcoded mock data with real database queries
  - Fixed frontend components to use API data instead of static content
- July 05, 2025. Implemented project-based settings architecture with restructured navigation:
  - Updated sidebar to include project selector dropdown and settings menu
  - Replaced single settings link with dropdown containing Personal Settings and Project Settings
  - Created Personal Settings page (/personal-settings) with Profile and Members tabs:
    * Profile tab: Account information, security settings, API key management
    * Members tab: Team member management with role assignments and invitation system
  - Created Project Settings page (/project-settings) with Billing, Knowledge Base, and Integrations tabs:
    * Billing tab: Credit balance, payment methods, transaction history
    * Knowledge Base tab: Document upload/management for LLM citations
    * Integrations tab: Slack integration and notification settings
  - Added team member API endpoints for CRUD operations
  - Implemented project selector with mock project data in sidebar header
- July 05, 2025. Enhanced campaigns with comprehensive detail page system:
  - Removed non-functional manage buttons, made campaign table rows fully clickable
  - Added launch date field to campaign creation supporting past/future dates
  - Created comprehensive campaign details page (/campaigns/{id}) with four-tab layout:
    * Overview: KPI tiles, experience allocation bar, top segments, bound objects
    * Experiences: Table of campaign experiences with split percentages and performance
    * Schedule: Read-only timeline showing campaign release dates (informational only)
    * History: Chronological timeline of campaign events and modifications
  - Campaign schedule section displays marketing team release dates, not user-editable
  - Full breadcrumb navigation with status badges and action buttons
- July 05, 2025. Implemented OpenAI integration for AI-powered experience creation:
  - Created OpenAI service to analyze user descriptions like "Double coins on Level 5 for TikTok users"
  - Added /api/analyze-experience endpoint for processing natural language experiment ideas
  - Updated Quick Experience Prompt component to use OpenAI API for draft generation
  - Modified experience wizard to accept AI analysis data via URL parameters
  - Added automatic prefilling of wizard steps including objects, campaigns, target audiences, and variants
  - Implemented object name to ID mapping for proper selection in wizard interface
  - System can now interpret user intent and suggest relevant objects, segments, and campaign settings

## User Preferences

Preferred communication style: Simple, everyday language.