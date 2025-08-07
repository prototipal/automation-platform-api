<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Automation Platform API - A NestJS-based API for automation services with integrated proxy management.

## Project setup

```bash
$ npm install
```

## Environment Configuration

1. Copy the environment example file:
```bash
$ cp .env.example .env
```

2. Update the `.env` file with your configuration values.

## Local Development

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Database Setup

```bash
# Run database migrations
$ npm run migration:run

# Seed the database
$ npm run seed
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Docker Deployment

This project includes a complete Docker setup with Nginx Proxy Manager for easy deployment.

### Quick Start with Docker

1. **Clone the repository and navigate to the project directory**

2. **Copy environment configuration:**
```bash
cp .env.example .env
```

3. **Update environment variables** in `.env` file as needed.

4. **Start all services:**
```bash
docker-compose up -d
```

This will start:
- **Nginx Proxy Manager** (Port 81 for admin, 80/443 for proxied services)
- **Application API** (Port 3000)
- **PostgreSQL Database** (Port 5432)
- **MariaDB** (for Nginx Proxy Manager)

### Service Access

- **Nginx Proxy Manager Admin:** http://localhost:81
  - Default login: `admin@example.com` / `changeme`
- **API Application:** http://localhost:3000
- **API Documentation (Swagger):** http://localhost:3000/api

### Nginx Proxy Manager Setup

1. Access the admin panel at http://localhost:81
2. Login with default credentials (change on first login)
3. Add a new proxy host:
   - **Domain Names:** your-domain.com
   - **Scheme:** http
   - **Forward Hostname/IP:** app
   - **Forward Port:** 3000
   - **SSL:** Enable if needed

### Data Persistence

Data is stored in the following directories:
- `./data/nginx-proxy-manager/` - NPM configuration and data
- `./data/postgres/` - PostgreSQL database files
- `./data/mysql/` - MariaDB database files
- `./letsencrypt/` - SSL certificates

### Useful Docker Commands

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop all services
docker-compose down

# Rebuild and start services
docker-compose up -d --build

# View running containers
docker-compose ps
```

### Production Deployment

For production deployment:

1. Update environment variables for production
2. Ensure proper SSL certificates are configured
3. Use a reverse proxy (handled by Nginx Proxy Manager)
4. Monitor logs and performance

### Manual Deployment

If you prefer manual deployment without Docker:

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
