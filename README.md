# @ackplus/nest-seeder

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">A powerful and flexible database seeding library for NestJS applications</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ackplus/nest-seeder"><img src="https://img.shields.io/npm/v/@ackplus/nest-seeder.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/@ackplus/nest-seeder"><img src="https://img.shields.io/npm/l/@ackplus/nest-seeder.svg" alt="Package License" /></a>
  <a href="https://www.npmjs.com/package/@ackplus/nest-seeder"><img src="https://img.shields.io/npm/dm/@ackplus/nest-seeder.svg" alt="NPM Downloads" /></a>
</p>

## 📋 Table of Contents

- [Package Overview](#-package-overview)
- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Documentation](#-documentation)
- [Examples](#-examples)
- [Local Development](#-local-development)
- [Package Structure](#-package-structure)
- [Contributing](#-contributing)
- [License](#-license)

## 📦 Package Overview

`@ackplus/nest-seeder` is a powerful database seeding solution for NestJS applications that provides:

- 🏭 **Factory Pattern** - Generate fake data easily with decorators
- 🎲 **Faker.js Integration** - Built-in support for realistic fake data
- 🔄 **Refresh Mode** - Drop existing data before seeding
- 🎯 **Selective Seeding** - Run specific seeders by name
- 📦 **Multiple ORMs** - Works with TypeORM, Mongoose, Prisma, and more
- 🖥️ **CLI Support** - Run seeders from command line
- ⚙️ **Flexible Configuration** - Sync and async configuration options
- 🔗 **Dependency Management** - Handle relationships between seeders
- ✅ **Type-safe** - Full TypeScript support

## ✨ Features

- **Factory Pattern with Decorators** - Use `@Factory` decorator to define data generation
- **Faker.js Integration** - Generate realistic fake data for testing and development
- **CLI Commands** - Run seeders directly from terminal with various options
- **Watch Mode** - Auto-reseed database when factory/seeder files change
- **Batch Processing** - Efficient bulk insertion for large datasets
- **Relationship Support** - Handle foreign keys and entity relationships
- **Conditional Seeding** - Skip seeding if data already exists
- **Multiple ORMs Support** - TypeORM, Mongoose, Prisma examples included
- **Comprehensive Testing** - Well-tested with 90%+ coverage
- **Production Ready** - Error handling, logging, and best practices

## 📦 Installation

```bash
# Using npm
npm install @ackplus/nest-seeder @faker-js/faker

# Using yarn
yarn add @ackplus/nest-seeder @faker-js/faker

# Using pnpm
pnpm add @ackplus/nest-seeder @faker-js/faker
```

### Development Dependencies

```bash
# If using TypeScript files for seeders (recommended)
npm install -D ts-node typescript

# If using CLI
npm install -D @nestjs/cli
```

## 🚀 Quick Start

### 1. Create a Factory

```typescript
// src/database/factories/user.factory.ts
import { Factory } from '@ackplus/nest-seeder';

export class UserFactory {
  @Factory((faker) => faker.internet.email())
  email: string;

  @Factory((faker) => faker.person.firstName())
  firstName: string;

  @Factory((faker) => faker.person.lastName())
  lastName: string;
}
```

### 2. Create a Seeder

```typescript
// src/database/seeders/user.seeder.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seeder, SeederServiceOptions, DataFactory } from '@ackplus/nest-seeder';
import { User } from '../entities/user.entity';
import { UserFactory } from '../factories/user.factory';

@Injectable()
export class UserSeeder implements Seeder {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed(options: SeederServiceOptions): Promise<void> {
    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(10);
    await this.userRepository.save(users);
  }

  async drop(options: SeederServiceOptions): Promise<void> {
    await this.userRepository.delete({});
  }
}
```

### 3. Register Seeder Module

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederModule } from '@ackplus/nest-seeder';
import { User } from './database/entities/user.entity';
import { UserSeeder } from './database/seeders/user.seeder';

@Module({
  imports: [
    TypeOrmModule.forRoot({ /* ... */ }),
    TypeOrmModule.forFeature([User]),
    SeederModule.register({
      seeders: [UserSeeder],
    }),
  ],
})
export class AppModule {}
```

### 4. Run the Seeder

```typescript
// src/seed.ts
import { NestFactory } from '@nestjs/core';
import { SeederService } from '@ackplus/nest-seeder';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seeder = app.get(SeederService);
  await seeder.run();
  await app.close();
}

bootstrap();
```

Run it:
```bash
ts-node src/seed.ts
```

## 📚 Documentation

- **[Complete Documentation](./packages/nest-seeder/README.md)** - Full API reference and guides
- **[Quick Start Guide](./packages/nest-seeder/QUICKSTART.md)** - Get started in 5 minutes
- **[Contributing Guide](./packages/nest-seeder/CONTRIBUTING.md)** - How to contribute

## 💡 Example Application

A complete working example with TypeORM and SQLite is available in [apps/example-app/](./apps/example-app/):

```bash
cd apps/example-app
pnpm test       # Run tests
pnpm seed       # Seed database
pnpm seed:watch # Watch mode
pnpm start:dev  # Start app
```

See [Example App README](./apps/example-app/README.md) and [examples/](./packages/nest-seeder/examples/) for more.

## 🛠️ Local Development

This section covers setting up the project for local development and contributing.

### Prerequisites

- Node.js 18+ or 20+
- pnpm 10.21.0+
- Git

### Project Structure

This is a pnpm workspace monorepo:

```
nest-seeder/
├── packages/
│   └── nest-seeder/          # Main package
│       ├── src/              # Source code
│       ├── dist/             # Compiled output
│       ├── examples/         # Example files
│       ├── test/             # Tests
│       └── package.json
├── apps/
│   └── example-app/          # Example application
│       ├── src/              # Application source
│       ├── test/             # E2E tests
│       └── package.json
├── scripts/
│   └── publish.js            # Publishing script
├── .github/
│   └── workflows/
│       └── publish.yml       # CI/CD workflow
├── pnpm-workspace.yaml       # Workspace config
└── package.json              # Root package.json
```

### Initial Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/ackplus/nest-seeder.git
cd nest-seeder
```

#### 2. Install Dependencies

```bash
# Install pnpm if not already installed
npm install -g pnpm@10.21.0

# Install all workspace dependencies
pnpm install
```

This will install dependencies for:
- Root workspace
- `packages/nest-seeder` package
- `apps/example-app` example application

#### 3. Build the Package

```bash
# Build from root
pnpm -C packages/nest-seeder build

# Or navigate and build
cd packages/nest-seeder
pnpm build
cd ../..
```

#### 4. Verify Setup

```bash
# Check if package built successfully
ls packages/nest-seeder/dist

# Check if example app dependencies are linked
ls apps/example-app/node_modules/@ackplus/nest-seeder
```

### Development Workflow

#### Building the Package

```bash
# Build nest-seeder package
pnpm -C packages/nest-seeder build

# Watch mode (rebuild on changes)
pnpm -C packages/nest-seeder build --watch
```

#### Running Tests

```bash
# Run package tests
pnpm -C packages/nest-seeder test

# Run example app tests
pnpm -C apps/example-app test

# Run all tests (both package and example)
pnpm test

# Watch mode
pnpm -C apps/example-app test:watch

# Coverage report
pnpm -C apps/example-app test:cov
```

#### Running Example Application

```bash
# Navigate to example app
cd apps/example-app

# Run tests
pnpm test

# Seed database
pnpm seed

# Seed with refresh (drop & reseed)
pnpm seed:refresh

# Seed in watch mode (auto-reseed on changes)
pnpm seed:watch

# Start application
pnpm start:dev
```

#### Development with Watch Modes

For optimal development experience, use multiple terminals:

**Terminal 1: Package Build Watch**
```bash
pnpm -C packages/nest-seeder build --watch
```

**Terminal 2: Example App Tests**
```bash
pnpm -C apps/example-app test:watch
```

**Terminal 3: Seed Watch Mode**
```bash
pnpm -C apps/example-app seed:watch
```

**Terminal 4: Application Server**
```bash
pnpm -C apps/example-app start:dev
```

### Making Changes

#### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

#### 2. Make Your Changes

Edit files in:
- `packages/nest-seeder/src/` - Package source code
- `apps/example-app/src/` - Example application

#### 3. Build and Test

```bash
# Build package
pnpm -C packages/nest-seeder build

# Run tests
pnpm -C packages/nest-seeder test
pnpm -C apps/example-app test

# Lint code
pnpm -C packages/nest-seeder lint

# Format code
pnpm -C packages/nest-seeder format
```

#### 4. Update Documentation

If you've changed functionality:
- Update `packages/nest-seeder/README.md`
- Update `packages/nest-seeder/CHANGELOG.md`
- Add/update examples if needed
- Update TypeScript types/interfaces

### Code Quality

#### Linting

```bash
# Lint package
pnpm -C packages/nest-seeder lint

# Lint example app
pnpm -C apps/example-app lint

# Fix linting issues
pnpm -C packages/nest-seeder lint --fix
```

#### Formatting

```bash
# Format package
pnpm -C packages/nest-seeder format

# Format example app
pnpm -C apps/example-app format
```

#### Type Checking

```bash
# Check types
pnpm -C packages/nest-seeder build

# Should complete without errors
```

### Testing Strategy

#### Unit Tests

Test individual components in isolation:
- Factories
- Decorators
- Utilities

```bash
pnpm -C packages/nest-seeder test
```

#### Integration Tests

Test seeder integration with database:
- Seeder execution
- Relationship handling
- Options processing

```bash
pnpm -C apps/example-app test
```

#### E2E Tests

Test complete workflows:
- Full seeding process
- Data integrity
- Error scenarios

```bash
pnpm -C apps/example-app test:e2e
```

### Debugging

#### Debugging Tests

```bash
# Run specific test file
pnpm test user.seeder.spec.ts

# Run specific test suite
pnpm test -t "UserSeeder"

# Debug mode
pnpm -C apps/example-app test:debug
```

#### Debugging Application

```bash
# Start in debug mode
pnpm -C apps/example-app start:debug

# Then attach your debugger to port 9229
```

### Publishing (Maintainers Only)

#### Using CLI Script

```bash
# Patch version (0.0.1 -> 0.0.2)
npm run publish:patch

# Minor version (0.0.1 -> 0.1.0)
npm run publish:minor

# Major version (0.0.1 -> 1.0.0)
npm run publish:major
```

The script will:
1. Update package version
2. Create git tag
3. Ask to push to remote
4. GitHub Action will publish to npm automatically

#### Manual Publishing

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# GitHub Action will automatically publish to npm
```

### Troubleshooting

#### Module Not Found Errors

```bash
# Rebuild package
pnpm -C packages/nest-seeder build

# Reinstall dependencies
rm -rf node_modules
pnpm install
```

#### Test Failures

```bash
# Clear Jest cache
pnpm test --clearCache

# Rebuild and test
pnpm -C packages/nest-seeder build
pnpm -C apps/example-app test
```

#### TypeScript Errors

```bash
# Check TypeScript version
tsc --version

# Should be 5.7.3 or compatible

# Clean build
rm -rf packages/nest-seeder/dist
pnpm -C packages/nest-seeder build
```

#### Database Issues

```bash
# Delete SQLite database
rm apps/example-app/database.sqlite

# Reseed
pnpm -C apps/example-app seed
```

### Development Tips

```bash
# Build before testing
pnpm -C packages/nest-seeder build && pnpm -C apps/example-app test

# Use watch modes
pnpm -C packages/nest-seeder build --watch  # Package
pnpm -C apps/example-app test:watch         # Tests
pnpm -C apps/example-app seed:watch         # Seed

# Full verification before commit
pnpm -C packages/nest-seeder lint && \
pnpm -C packages/nest-seeder build && \
pnpm -C apps/example-app test
```

## 📦 Package Structure

### Main Package (`packages/nest-seeder/`)

```
packages/nest-seeder/
├── src/
│   ├── cli.ts                    # CLI entry point
│   ├── index.ts                  # Main exports
│   └── lib/
│       ├── decorators/           # Factory decorator
│       ├── factory/              # Data factory
│       ├── interfaces/           # TypeScript interfaces
│       ├── seeder/               # Seeder module & service
│       └── storages/             # Metadata storage
├── examples/                     # Example files
├── dist/                         # Compiled output
├── test/                         # Tests
├── README.md                     # Package docs
├── QUICKSTART.md                 # Quick start guide
├── CONTRIBUTING.md               # Contributing guide
├── CHANGELOG.md                  # Version history
├── LICENSE                       # MIT license
└── package.json
```

### Example Application (`apps/example-app/`)

```
apps/example-app/
├── src/
│   ├── database/
│   │   ├── entities/            # TypeORM entities
│   │   ├── factories/           # Data factories
│   │   └── seeders/             # Seeders
│   ├── app.module.ts            # Main module
│   ├── seed.ts                  # Seed script
│   └── main.ts                  # App entry
├── test/                        # E2E tests
├── README.md                    # Example app docs
├── TESTING.md                   # Testing guide
└── package.json
```

## 🤝 Contributing

We welcome contributions! See [Contributing Guide](./packages/nest-seeder/CONTRIBUTING.md) for details.

**Quick steps:** Fork → Clone → Branch → Code → Test → PR

## 📄 License

MIT License - see [LICENSE](./packages/nest-seeder/LICENSE)

## 🔗 Links

- [NPM Package](https://www.npmjs.com/package/@ackplus/nest-seeder)
- [GitHub Repository](https://github.com/ackplus/nest-seeder)
- [Documentation](./packages/nest-seeder/README.md)
- [Example App](./apps/example-app/)

---

Made with ❤️ for the NestJS community

