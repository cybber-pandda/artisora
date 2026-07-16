# Artisora - Project Documentation

## Overview

Artisora is a modern full-stack web application built with **Laravel 12**, **React 18**, and **Tailwind CSS**. The project combines a robust PHP backend with a dynamic React frontend, enhanced with real-time capabilities through Pusher and Inertia.js integration.

## Technology Stack

### Backend
- **Laravel 12** - PHP web framework
- **PHP 8.2+** - Server-side language
- **Laravel Sanctum** - API authentication
- **Inertia.js** - Server-side routing with React
- **Pusher** - Real-time event broadcasting
- **AWS S3** - Cloud storage integration

### Frontend
- **React 18** - UI library
- **Vite 7** - Module bundler and dev server
- **Tailwind CSS 3** - Utility-first CSS framework
- **Headless UI** - Unstyled, accessible components
- **Framer Motion** - Animation library
- **MapLibre GL** - Map visualization
- **TurfJS** - Geospatial analysis library
- **Lucide React** - Icon library
- **QR Code** - QR code generation

### Development & Testing
- **PHPUnit** - PHP testing framework
- **Laravel Pint** - PHP code style fixer
- **Laravel Pail** - Application log viewer
- **Laravel Sail** - Docker development environment
- **FakerPHP** - Data generation for testing
- **Concurrently** - Run multiple processes simultaneously

## Project Structure

```
artisora/
├── app/                    # Laravel application code
├── bootstrap/             # Framework bootstrap files
├── config/               # Configuration files
├── database/             # Migrations and seeders
├── public/               # Publicly accessible files
├── resources/            # Frontend assets and views
├── routes/               # API and web routes
├── storage/              # Application storage
├── tests/                # Test files
├── composer.json         # PHP dependencies
├── package.json          # Node.js dependencies
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── postcss.config.js     # PostCSS configuration
└── jsconfig.json         # JavaScript configuration
```

## Getting Started

### Prerequisites
- PHP 8.2 or higher
- Node.js and npm
- Composer
- MySQL/PostgreSQL database (optional for SQLite)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/cybber-pandda/artisora.git
   cd artisora
   ```

2. **Run the setup script**
   ```bash
   composer run setup
   ```
   This will:
   - Install PHP dependencies
   - Copy `.env.example` to `.env`
   - Generate application key
   - Run database migrations
   - Install npm dependencies
   - Build frontend assets

### Development

Start the development environment:
```bash
composer run dev
```

This runs concurrently:
- PHP development server (`php artisan serve`)
- Queue worker (`php artisan queue:listen`)
- Application logger (`php artisan pail`)
- Vite dev server (`npm run dev`)

### Building for Production

Build frontend assets:
```bash
npm run build
```

## Key Features

### Real-Time Communication
- Pusher integration for real-time event broadcasting
- Live data updates across connected clients
- Websocket support for instant notifications

### Geospatial Capabilities
- MapLibre GL for interactive map visualization
- TurfJS for geospatial calculations (distance, bearing, nearest points)
- QR code generation for location sharing

### Modern Frontend
- React 18 with server-side routing via Inertia.js
- Responsive design with Tailwind CSS
- Smooth animations with Framer Motion
- Accessible UI components via Headless UI

### Authentication & Authorization
- Laravel Sanctum for API token authentication
- Session-based authentication
- Built-in role and permission system

## Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:
```
APP_NAME=Artisora
APP_URL=http://localhost:8000
DB_CONNECTION=sqlite
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=
```

### Database
Configure your database connection in `.env`. Supported options:
- SQLite (default)
- MySQL
- PostgreSQL

Run migrations:
```bash
php artisan migrate
```

## Testing

Run the test suite:
```bash
composer run test
```

This will:
- Clear configuration cache
- Run PHPUnit tests

## Code Quality

Format PHP code with Laravel Pint:
```bash
./vendor/bin/pint
```

## Language Composition

- **JavaScript**: 76.2%
- **PHP**: 23.7%
- **Other**: 0.1%

## Available Scripts

### Composer Commands
```bash
composer run setup      # Initial project setup
composer run dev        # Start development server
composer run test       # Run test suite
```

### npm Commands
```bash
npm run dev             # Start Vite dev server
npm run build           # Build for production
```

## API Documentation

### Authentication Endpoints
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `POST /api/register` - User registration

### Protected Routes
All routes requiring authentication should include:
```
Authorization: Bearer {token}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Code of Conduct

Please review and abide by the [Laravel Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security

If you discover a security vulnerability, please email the maintainers directly instead of using the issue tracker.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues, questions, or suggestions, please open an issue on the GitHub repository.

## Acknowledgments

- Built with [Laravel](https://laravel.com)
- Frontend powered by [React](https://react.dev)
- Styled with [Tailwind CSS](https://tailwindcss.com)
- Real-time features with [Pusher](https://pusher.com)
- Maps integration with [MapLibre](https://maplibre.org)
