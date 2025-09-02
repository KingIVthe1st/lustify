# Lustify AI Backend

A comprehensive Node.js backend for AI avatar and content generation platform using Grok AI, with subscription management, credit system, and user dashboard.

## Features

- **Authentication System**: JWT-based auth with email verification, password reset
- **Avatar Management**: Create AI avatars with consistent character profiles
- **Content Generation**: Generate images and videos using Grok AI
- **Credit System**: Transaction-based credit management with subscription tiers
- **Subscription Management**: Stripe integration with multiple pricing plans
- **User Dashboard**: Analytics, activity feeds, and usage statistics
- **File Storage**: AWS S3 compatible storage for generated content
- **Docker Support**: Full containerization with PostgreSQL and Redis

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL with Sequelize ORM
- **AI Provider**: Grok AI (X.AI)
- **Payment**: Stripe
- **File Storage**: AWS S3
- **Authentication**: JWT
- **Caching**: Redis
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for development)
- PostgreSQL (if running locally)

### Using Docker (Recommended)

1. **Clone and setup environment**:
```bash
cd lustify-ai-backend
cp .env.example .env
```

2. **Update environment variables**:
Edit `.env` with your API keys and configuration:
- `GROK_API_KEY`: Your Grok AI API key
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `JWT_SECRET`: Strong random secret for JWT tokens
- `AWS_*`: AWS S3 credentials for file storage

3. **Start services**:
```bash
# Development
docker-compose up -d

# Production with nginx
docker-compose --profile production up -d
```

4. **Initialize database**:
The database will be automatically initialized with tables and seed data.

### Manual Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Setup database**:
```bash
# Create PostgreSQL database
createdb lustify_ai

# Run migrations
npm run migrate
```

3. **Start development server**:
```bash
npm run dev
```

## API Documentation

### Authentication Endpoints

```http
POST /api/auth/register          # User registration
POST /api/auth/login             # User login
GET  /api/auth/verify-email/:token # Email verification
POST /api/auth/forgot-password   # Password reset request
POST /api/auth/reset-password    # Password reset
GET  /api/auth/profile           # Get user profile
PUT  /api/auth/profile           # Update user profile
```

### Avatar Management

```http
GET    /api/avatars              # List user avatars
POST   /api/avatars              # Create new avatar
GET    /api/avatars/:id          # Get avatar details
PUT    /api/avatars/:id          # Update avatar
DELETE /api/avatars/:id          # Delete avatar
GET    /api/avatars/limit        # Check avatar limits
GET    /api/avatars/stats        # Avatar statistics
POST   /api/avatars/:id/regenerate-thumbnail # Regenerate thumbnail
```

### Content Generation

```http
GET    /api/content              # List generated content
POST   /api/content/generate/image    # Generate image
POST   /api/content/generate/video    # Generate video
GET    /api/content/:id          # Get content details
DELETE /api/content/:id          # Delete content
POST   /api/content/:id/retry    # Retry failed generation
GET    /api/content/stats        # Content statistics
```

### Subscription Management

```http
GET    /api/subscriptions/plans  # Available subscription plans
GET    /api/subscriptions        # Current subscription
POST   /api/subscriptions        # Create subscription
PUT    /api/subscriptions/:id    # Update subscription
POST   /api/subscriptions/:id/cancel # Cancel subscription
POST   /api/subscriptions/:id/reactivate # Reactivate subscription
GET    /api/subscriptions/history # Subscription history
POST   /api/subscriptions/payment-intent # Create payment intent
POST   /api/subscriptions/webhook # Stripe webhook
```

### Dashboard & Analytics

```http
GET    /api/dashboard            # Complete dashboard overview
GET    /api/dashboard/quick-stats # Quick statistics
GET    /api/dashboard/analytics  # Usage analytics (?timeframe=7d|30d|90d)
GET    /api/dashboard/activity   # Recent activity feed
GET    /api/dashboard/limits     # Usage limits and warnings
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `lustify_ai` |
| `DB_USERNAME` | Database username | `lustify_user` |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT signing secret | - |
| `GROK_API_KEY` | Grok AI API key | - |
| `STRIPE_SECRET_KEY` | Stripe secret key | - |
| `AWS_ACCESS_KEY_ID` | AWS access key | - |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | - |
| `AWS_S3_BUCKET` | S3 bucket name | - |

## Database Schema

### Core Tables

- **users**: User accounts and authentication
- **user_credits**: Credit balances and tracking
- **credit_transactions**: Credit transaction history
- **subscription_plans**: Available subscription tiers
- **user_subscriptions**: User subscription records
- **avatars**: AI avatar profiles and metadata
- **generated_content**: Generated images and videos

### Relationships

- Users have credits, subscriptions, avatars, and content
- Avatars can be used to generate content
- Subscriptions determine credit allocations and avatar limits
- All operations are tracked via transactions

## Grok AI Integration

The platform integrates with Grok AI for:

1. **Avatar Profile Creation**: Generate detailed character profiles
2. **Image Generation**: Create images using avatar consistency
3. **Prompt Optimization**: Enhance user prompts with avatar data
4. **Image-to-Video**: Generate videos from images (when available)

### Credit Costs

- Image generation: 5 credits (base)
- Video generation: 15 credits (base)
- Avatar creation: 10 credits
- Quality multipliers: HD (1.5x), Premium (2x)

## Stripe Integration

### Subscription Plans

- **Starter**: $9.99/month, 100 credits, 3 avatars
- **Pro**: $29.99/month, 500 credits, 10 avatars
- **Enterprise**: $99.99/month, 2000 credits, 50 avatars

### Webhook Events

- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

## File Storage

Generated content is stored in AWS S3 with the following structure:

```
bucket/
├── avatars/
│   └── {userId}/
│       └── thumbnail_{avatarId}.jpg
└── content/
    └── {userId}/
        ├── image_{contentId}_{timestamp}.jpg
        └── video_{contentId}_{timestamp}.mp4
```

## Security Features

- JWT authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- Input validation and sanitization
- SQL injection prevention
- CORS configuration
- Helmet security headers

## Monitoring & Health Checks

- Health check endpoint: `GET /health`
- Database connection monitoring
- Redis connection health checks
- Application metrics and logging
- Error tracking (optional Sentry integration)

## Development

### Scripts

```bash
npm run dev          # Start development server
npm run start        # Start production server
npm run test         # Run tests
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data
npm run lint         # Lint code
npm run format       # Format code
```

### Database Operations

```bash
# Create migration
npx sequelize-cli migration:generate --name create-new-table

# Run migrations
npx sequelize-cli db:migrate

# Rollback migration
npx sequelize-cli db:migrate:undo

# Create seed
npx sequelize-cli seed:generate --name demo-data

# Run seeds
npx sequelize-cli db:seed:all
```

## Deployment

### Docker Production

```bash
# Build and start all services
docker-compose --profile production up -d

# View logs
docker-compose logs -f app

# Scale application
docker-compose up -d --scale app=3

# Database backup
docker-compose --profile backup run --rm db-backup
```

### Manual Deployment

1. Set environment variables
2. Install dependencies: `npm ci`
3. Run migrations: `npm run migrate`
4. Start application: `npm start`

## API Rate Limits

- Authentication endpoints: 5 requests per minute
- Content generation: 10 requests per minute
- General API: 100 requests per 15 minutes
- File uploads: 50MB max size

## Error Handling

The API returns consistent error responses:

```json
{
  "error": "Error type",
  "message": "Human readable message",
  "details": [] // Validation errors when applicable
}
```

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `402`: Payment Required (insufficient credits)
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

## Support

For technical support or questions:

1. Check the API documentation
2. Review error messages and logs
3. Verify environment configuration
4. Check Grok AI and Stripe status pages

## License

This project is proprietary software. All rights reserved.