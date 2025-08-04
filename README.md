# NestJS Backend API

A production-ready NestJS backend application with comprehensive features, security, and best practices.

## 🚀 Features

### Core Technologies
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Primary database
- **Redis** - Caching and session storage
- **JWT** - Authentication and authorization
- **Winston** - Structured logging
- **Nx** - Monorepo management

### Security Features
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Input validation and sanitization
- Rate limiting and throttling
- Security headers with Helmet
- SQL injection prevention
- XSS protection

### Performance & Reliability
- Redis caching with multiple strategies
- Database connection pooling
- Request/response logging
- Health checks and monitoring
- Error tracking and alerting
- Cache warming strategies
- Comprehensive testing suite

### Development Experience
- Hot reload development server
- Swagger/OpenAPI documentation
- ESLint and Prettier configuration
- Husky git hooks
- Comprehensive test coverage
- Docker containerization
- CI/CD ready

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 13+
- Redis 6+
- Docker (optional)

## 🛠️ Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nestjs-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.development .env
   # Edit .env with your configuration
   ```

4. **Start PostgreSQL and Redis**
   ```bash
   # Using Docker
   docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:15
   docker run -d --name redis -p 6379:6379 redis:7-alpine
   ```

5. **Run database migrations**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

6. **Start the development server**
   ```bash
   npm run start:dev
   ```

### Docker Development

1. **Start all services**
   ```bash
   npm run docker:up
   ```

2. **View logs**
   ```bash
   npm run docker:logs
   ```

3. **Stop services**
   ```bash
   npm run docker:down
   ```

## 🔧 Configuration

### Environment Variables

Create environment files for different stages:

- `.env.development` - Development configuration
- `.env.staging` - Staging configuration  
- `.env.production` - Production configuration

#### Required Variables

```bash
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/database
DATABASE_MAX_CONNECTIONS=10
DATABASE_SSL=false

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Logging
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
LOG_MAX_FILES=14d
LOG_MAX_SIZE=20m

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:4200
```

## 🏃‍♂️ Running the Application

### Development
```bash
npm run start:dev          # Hot reload development server
npm run start:debug        # Debug mode with inspector
```

### Production
```bash
npm run build:prod         # Build for production
npm run start:prod         # Start production server
```

### Testing
```bash
npm run test               # Run unit tests
npm run test:e2e          # Run E2E tests
npm run test:cov          # Run tests with coverage
npm run test:all          # Run all tests
```

### Database Operations
```bash
npm run db:generate       # Generate Prisma client
npm run db:migrate        # Run migrations
npm run db:seed           # Seed database
npm run db:studio         # Open Prisma Studio
```

### Code Quality
```bash
npm run lint              # Run ESLint
npm run lint:fix          # Fix ESLint issues
npm run format            # Format code with Prettier
npm run format:check      # Check code formatting
```

## 📚 API Documentation

When running in development mode, Swagger documentation is available at:
```
http://localhost:3000/api/docs
```

### Authentication

The API uses JWT Bearer tokens for authentication:

```bash
# Register a new user
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe"
}

# Login
POST /api/auth/login
{
  "email": "user@example.com", 
  "password": "Password123!"
}

# Use the returned token in subsequent requests
Authorization: Bearer <access_token>
```

### Default Users (Development)

After seeding the database:

- **Admin**: `admin@example.com` / `Admin123!`
- **User**: `user@example.com` / `User123!`
- **Moderator**: `moderator@example.com` / `Moderator123!`

## 🏗️ Architecture

### Project Structure
```
apps/
├── backend/                 # Main NestJS application
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/        # Authentication module
│   │   │   ├── users/       # Users module
│   │   │   ├── common/      # Shared utilities
│   │   │   ├── config/      # Configuration
│   │   │   └── database/    # Database configuration
│   │   └── test/            # Integration tests
│   └── prisma/              # Database schema and migrations
├── backend-e2e/             # E2E tests
└── libs/
    └── shared/              # Shared libraries
        ├── types/           # TypeScript types
        ├── utils/           # Utility functions
        └── constants/       # Application constants
```

### Key Components

- **Authentication**: JWT-based auth with refresh tokens
- **Authorization**: Role-based access control (USER, ADMIN, MODERATOR)
- **Validation**: Input validation with class-validator
- **Caching**: Redis-based caching with multiple strategies
- **Logging**: Structured logging with Winston
- **Error Handling**: Global exception filter with structured responses
- **Health Checks**: Comprehensive health monitoring
- **Security**: Multiple security layers and best practices

## 🧪 Testing

### Test Types

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test API endpoints with database
- **E2E Tests**: Test complete user workflows

### Running Tests

```bash
# Run all tests
npm run test:all

# Run specific test types
npm run test:unit
npm run test:integration  
npm run test:e2e

# Run tests with coverage
npm run test:cov

# Watch mode for development
npm run test:watch
```

### Test Database

Tests use a separate test database that is automatically created and cleaned up.

## 🚀 Deployment

### Docker Production Build

```bash
# Build production image
npm run docker:build

# Run production container
npm run docker:run
```

### Environment-Specific Builds

```bash
# Staging deployment
npm run deploy:staging

# Production deployment  
npm run deploy:prod
```

### Health Checks

The application provides several health check endpoints:

- `GET /api/health` - Basic health status
- `GET /api/health/detailed` - Detailed system information
- `GET /api/auth/health` - Authentication service health

## 🔍 Monitoring & Logging

### Logging

- Structured JSON logging in production
- Multiple log levels (error, warn, info, debug, verbose)
- Request/response logging with correlation IDs
- File rotation and retention policies

### Health Monitoring

- Database connectivity checks
- Redis connectivity checks  
- Memory usage monitoring
- Custom health indicators

### Error Tracking

- Global exception handling
- Error categorization and codes
- Automatic error logging
- Performance monitoring

## 🛡️ Security

### Authentication & Authorization
- JWT tokens with secure secret management
- Password hashing with bcrypt (12 rounds)
- Role-based access control
- Token refresh mechanism
- Session invalidation

### Input Validation
- Global validation pipes
- DTO validation with class-validator
- Custom validation decorators
- SQL injection prevention
- XSS protection

### Security Headers
- Helmet.js security headers
- CORS configuration
- Rate limiting
- Request size limits
- Content Security Policy

## 🔧 Development

### Code Quality

- ESLint with TypeScript rules
- Prettier code formatting
- Husky git hooks for pre-commit validation
- Conventional commit messages

### Database

- Prisma ORM with type safety
- Database migrations
- Connection pooling
- Query optimization
- Seeding scripts

### Caching

- Redis-based caching
- Multiple caching strategies
- Cache warming
- Cache invalidation
- Performance monitoring

## 📈 Performance

### Optimizations

- Database connection pooling
- Redis caching layers
- Webpack bundle optimization
- Tree shaking
- Code splitting
- Gzip compression (Nginx)

### Monitoring

- Request/response time tracking
- Database query performance
- Cache hit/miss ratios
- Memory usage monitoring
- Error rate tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Development Workflow

1. **Setup**: Follow installation instructions
2. **Development**: Use `npm run start:dev` for hot reload
3. **Testing**: Write tests for new features
4. **Linting**: Run `npm run lint:fix` before committing
5. **Formatting**: Code is auto-formatted with Prettier

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

1. Check the documentation
2. Review existing issues
3. Create a new issue with detailed information
4. Include logs and error messages

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.