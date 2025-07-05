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
- July 05, 2025. Enhanced Quick Experience with random selection functionality:
  - Updated API endpoint to randomly select 1-3 objects from available pool (levels, popups, params)
  - Added random campaign selection from 6 available campaigns (TikTok, Facebook, Google, etc.)
  - Implemented random targeting: either "all players" with random traffic split or specific segments
  - Experience Wizard now pre-populates with draft data from Quick Experience
  - Added detailed feedback showing selected objects and targeting type
  - Integrated seamless workflow: Quick Experience prompt → AI generation → pre-filled wizard

## User Preferences

Preferred communication style: Simple, everyday language.