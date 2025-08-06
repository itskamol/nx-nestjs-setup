# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Running
- `npm run start:dev` - Start development server with hot reload
- `npm run start:debug` - Start debug mode with inspector
- `npm run build` - Build the application
- `npm run build:prod` - Build for production
- `npm run start:prod` - Start production server

### Testing
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:cov` - Run tests with coverage
- `npm run test:e2e` - Run E2E tests
- `npm run test:integration` - Run integration tests
- `npm run test:unit` - Run unit tests only
- `npm run test:all` - Run all tests (unit, integration, E2E)

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Database Operations
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Seed database with test data
- `npm run db:studio` - Open Prisma Studio

### Docker Operations
- `npm run docker:up` - Start all services with Docker
- `npm run docker:down` - Stop Docker services
- `npm run docker:logs` - View Docker logs

## Architecture Overview

This is a NestJS monorepo using Nx for workspace management. The application follows a modular architecture with clear separation of concerns.

### Key Components

**Core Infrastructure:**
- **Authentication**: JWT-based auth with refresh tokens and token blacklisting
- **Authorization**: Role-based access control (USER, ADMIN, MODERATOR)
- **Database**: PostgreSQL with Prisma ORM, connection pooling, and health checks
- **Caching**: Redis-based caching with multiple strategies and cache warming
- **Logging**: Winston-based structured logging with file rotation
- **Security**: Multiple layers including Helmet, CORS, rate limiting, and input validation

**Project Structure:**
```
apps/
├── backend/              # Main NestJS application
│   ├── src/app/
│   │   ├── auth/         # Authentication module
│   │   ├── users/        # Users module
│   │   ├── common/       # Shared utilities and infrastructure
│   │   ├── config/       # Configuration management
│   │   └── database/     # Database configuration
│   └── test/             # Integration tests
├── backend-e2e/          # E2E tests
└── libs/
    └── shared/           # Shared libraries (types, utils, constants)
```

### Security Features

- **JWT Authentication**: Access tokens (15m) and refresh tokens (7d)
- **Token Blacklisting**: Revoked tokens stored in Redis
- **Password Security**: bcrypt with 12 rounds, automatic rehashing
- **Rate Limiting**: 100 requests per minute per IP
- **Input Validation**: Global validation pipes with class-validator
- **Security Headers**: Helmet.js with CSP, HSTS, and other security headers
- **CORS**: Configured origins with credentials support

### Database Schema

**User Model:**
- Fields: id, email, password, firstName, lastName, role, isActive, createdAt, updatedAt
- Roles: USER, ADMIN, MODERATOR
- Indexes: email (unique), role, isActive
- Password excluded from responses by default

### Configuration Management

Environment-based configuration with validation:
- **Development**: `.env.development`
- **Staging**: `.env.staging`
- **Production**: `.env.production`

Key configuration sections:
- Application settings (port, API prefix, CORS origins)
- Database connection and pooling
- JWT secrets and expiration
- Redis connection settings
- Logging configuration

### Testing Strategy

**Test Types:**
- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoints with test database
- **E2E Tests**: Complete user workflows

**Test Database:**
- Separate test database automatically created/cleaned
- Prisma migrations run before tests
- Test data seeding with consistent test users

### Common Patterns

**Guards and Decorators:**
- `@Public()` decorator for public routes
- `@Roles()` decorator for role-based access
- Global JWT authentication guard
- Global rate limiting guard

**Error Handling:**
- Global exception filter with structured responses
- Business logic exceptions
- Validation exceptions
- Error monitoring and logging

**Interceptors:**
- Transform interceptor for response formatting
- Logging interceptor for request/response tracking
- Cache interceptor for performance optimization

### Development Guidelines

**Code Style:**
- ESLint with TypeScript rules (see `eslint.config.mjs`)
- Prettier for code formatting
- Husky git hooks for pre-commit validation
- No unused variables (ignored if prefixed with `_`)

**TypeScript:**
- Strict type checking enabled
- Interfaces for all DTOs and responses
- Shared types in `libs/shared/src/types`
- Implicit conversion enabled in validation pipes

**Database:**
- All database changes through Prisma migrations
- Connection pooling configured
- Health checks for database connectivity
- Query logging in development mode

**Performance:**
- Redis caching for frequently accessed data
- Database connection pooling
- Request/response transformation
- Cache warming strategies

### Health Monitoring

**Health Check Endpoints:**
- `GET /api/health` - Basic health status
- `GET /api/health/detailed` - Detailed system information
- Database connectivity checks
- Redis connectivity checks
- Memory usage monitoring

### API Documentation

Swagger/OpenAPI documentation available at:
- Development: `http://localhost:3000/api/docs`
- Auto-generated from controllers and DTOs
- Bearer token authentication support
- Persistent authorization in development

### Default Test Users

After running `npm run db:seed`:
- **Admin**: `admin@example.com` / `Admin123!`
- **User**: `user@example.com` / `User123!`
- **Moderator**: `moderator@example.com` / `Moderator123!`