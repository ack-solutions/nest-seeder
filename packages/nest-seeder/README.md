# @ackplus/nest-seeder

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

A powerful and flexible database seeding library for NestJS applications with support for factories, data generation using Faker.js, and CLI commands.

## 📋 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
  - [Basic Setup](#basic-setup)
  - [Async Configuration](#async-configuration)
- [Creating Seeders](#-creating-seeders)
  - [Basic Seeder](#basic-seeder)
  - [Using TypeORM](#using-typeorm)
  - [Using Mongoose](#using-mongoose)
  - [Using Prisma](#using-prisma)
- [Data Factories](#-data-factories)
  - [Basic Factory](#basic-factory)
  - [Factory with Dependencies](#factory-with-dependencies)
  - [Custom Generators](#custom-generators)
- [CLI Usage](#-cli-usage)
  - [Setup CLI](#setup-cli)
  - [CLI Commands](#cli-commands)
  - [Configuration File](#configuration-file)
- [Programmatic Usage](#-programmatic-usage)
- [Advanced Examples](#-advanced-examples)
- [API Reference](#-api-reference)
- [Publishing](#-publishing)

## ✨ Features

- 🎯 **Type-safe** - Full TypeScript support
- 🏭 **Factory Pattern** - Generate fake data easily with decorators
- 🎲 **Faker.js Integration** - Built-in support for realistic fake data
- 🔄 **Refresh Mode** - Drop existing data before seeding
- 🎯 **Selective Seeding** - Run specific seeders by name
- 📦 **Multiple ORMs** - Works with TypeORM, Mongoose, Prisma, and more
- 🖥️ **CLI Support** - Run seeders from command line
- ⚙️ **Flexible Configuration** - Sync and async configuration options
- 🔗 **Dependency Management** - Handle relationships between seeders

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

### 1. Create a Factory Class

Create a factory class with the `@Factory` decorator to define how to generate fake data:

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

  @Factory((faker) => faker.internet.password())
  password: string;

  @Factory((faker) => faker.datatype.boolean())
  isActive: boolean;
}
```

### 2. Create a Seeder

Create a seeder class that implements the `Seeder` interface:

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
    // Generate 10 fake users
    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(10);

    // Save to database
    await this.userRepository.save(users);
  }

  async drop(options: SeederServiceOptions): Promise<void> {
    // Clean up - delete all users
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
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'mydb',
      entities: [User],
      synchronize: true,
    }),
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

## ⚙️ Configuration

### Basic Setup

Register the `SeederModule` with your seeders:

```typescript
import { SeederModule } from '@ackplus/nest-seeder';

@Module({
  imports: [
    SeederModule.register({
      seeders: [UserSeeder, PostSeeder, CommentSeeder],
      imports: [TypeOrmModule.forFeature([User, Post, Comment])],
      providers: [/* additional providers */],
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

For dynamic configuration (e.g., loading from ConfigService):

#### Using Factory

```typescript
import { SeederModule } from '@ackplus/nest-seeder';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    SeederModule.forRootAsync({
      imports: [ConfigModule, TypeOrmModule.forFeature([User, Post])],
      inject: [UserSeeder, PostSeeder],
      useFactory: async (config: ConfigService) => ({
        seeders: [UserSeeder, PostSeeder],
        refresh: config.get('SEED_REFRESH', false),
        dummyData: config.get('SEED_DUMMY_DATA', false),
      }),
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

#### Using Class

```typescript
import { Injectable } from '@nestjs/common';
import { SeederOptionsFactory, SeederModuleOptions } from '@ackplus/nest-seeder';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SeederConfigService implements SeederOptionsFactory {
  constructor(private configService: ConfigService) {}

  createSeederOptions(): SeederModuleOptions {
    return {
      seeders: [UserSeeder, PostSeeder],
      refresh: this.configService.get('SEED_REFRESH', false),
    };
  }
}

@Module({
  imports: [
    SeederModule.forRootAsync({
      imports: [ConfigModule],
      useClass: SeederConfigService,
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

## 🌱 Creating Seeders

### Basic Seeder

Every seeder must implement the `Seeder` interface with `seed()` and `drop()` methods:

```typescript
import { Injectable } from '@nestjs/common';
import { Seeder, SeederServiceOptions } from '@ackplus/nest-seeder';

@Injectable()
export class BasicSeeder implements Seeder {
  async seed(options: SeederServiceOptions): Promise<void> {
    console.log('Seeding data...');
    // Your seeding logic here
  }

  async drop(options: SeederServiceOptions): Promise<void> {
    console.log('Dropping data...');
    // Your cleanup logic here
  }
}
```

### Using TypeORM

```typescript
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
    
    // Generate different amounts based on options
    const count = options.dummyData ? 100 : 10;
    const users = factory.generate(count);

    // Insert in batches for better performance
    const batchSize = 50;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await this.userRepository.save(batch);
    }

    console.log(`✅ Seeded ${users.length} users`);
  }

  async drop(options: SeederServiceOptions): Promise<void> {
    await this.userRepository.delete({});
    console.log('✅ Dropped all users');
  }
}
```

### Using Mongoose

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Seeder, SeederServiceOptions, DataFactory } from '@ackplus/nest-seeder';
import { User, UserDocument } from '../schemas/user.schema';
import { UserFactory } from '../factories/user.factory';

@Injectable()
export class UserSeeder implements Seeder {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async seed(options: SeederServiceOptions): Promise<void> {
    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(10);

    await this.userModel.insertMany(users);
    console.log('✅ Seeded 10 users');
  }

  async drop(options: SeederServiceOptions): Promise<void> {
    await this.userModel.deleteMany({});
    console.log('✅ Dropped all users');
  }
}
```

### Using Prisma

```typescript
import { Injectable } from '@nestjs/common';
import { Seeder, SeederServiceOptions, DataFactory } from '@ackplus/nest-seeder';
import { PrismaService } from '../prisma.service';
import { UserFactory } from '../factories/user.factory';

@Injectable()
export class UserSeeder implements Seeder {
  constructor(private readonly prisma: PrismaService) {}

  async seed(options: SeederServiceOptions): Promise<void> {
    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(10);

    // Use createMany for better performance
    await this.prisma.user.createMany({
      data: users,
      skipDuplicates: true,
    });

    console.log('✅ Seeded 10 users');
  }

  async drop(options: SeederServiceOptions): Promise<void> {
    await this.prisma.user.deleteMany({});
    console.log('✅ Dropped all users');
  }
}
```

### Seeder with Relationships

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seeder, SeederServiceOptions, DataFactory } from '@ackplus/nest-seeder';
import { Post } from '../entities/post.entity';
import { User } from '../entities/user.entity';
import { PostFactory } from '../factories/post.factory';

@Injectable()
export class PostSeeder implements Seeder {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed(options: SeederServiceOptions): Promise<void> {
    // Get existing users
    const users = await this.userRepository.find();
    
    if (users.length === 0) {
      console.warn('⚠️  No users found. Please run UserSeeder first.');
      return;
    }

    const factory = DataFactory.createForClass(PostFactory);
    
    // Generate 5 posts per user
    for (const user of users) {
      const posts = factory.generate(5, {
        authorId: user.id,
      });
      await this.postRepository.save(posts);
    }

    console.log(`✅ Seeded ${users.length * 5} posts`);
  }

  async drop(options: SeederServiceOptions): Promise<void> {
    await this.postRepository.delete({});
    console.log('✅ Dropped all posts');
  }
}
```

## 🏭 Data Factories

### Basic Factory

Use the `@Factory` decorator to define how each property should be generated:

```typescript
import { Factory } from '@ackplus/nest-seeder';

export class UserFactory {
  @Factory((faker) => faker.internet.email())
  email: string;

  @Factory((faker) => faker.person.firstName())
  firstName: string;

  @Factory((faker) => faker.person.lastName())
  lastName: string;

  @Factory((faker) => faker.internet.password({ length: 10 }))
  password: string;

  @Factory((faker) => faker.datatype.boolean())
  isActive: boolean;

  @Factory((faker) => faker.date.past())
  createdAt: Date;
}
```

### Static Values

You can also provide static values instead of generators:

```typescript
export class AdminFactory {
  @Factory('admin')
  role: string;

  @Factory(true)
  isActive: boolean;

  @Factory((faker) => faker.internet.email())
  email: string;
}
```

### Factory with Dependencies

Use the second parameter to specify dependencies between properties:

```typescript
export class UserFactory {
  @Factory((faker) => faker.person.firstName())
  firstName: string;

  @Factory((faker) => faker.person.lastName())
  lastName: string;

  // This field depends on firstName and lastName
  @Factory((faker, ctx) => {
    return `${ctx.firstName}.${ctx.lastName}@example.com`.toLowerCase();
  }, ['firstName', 'lastName'])
  email: string;

  // This field depends on firstName and lastName
  @Factory((faker, ctx) => {
    return `${ctx.firstName} ${ctx.lastName}`;
  }, ['firstName', 'lastName'])
  fullName: string;
}
```

### Custom Generators

Create complex data with custom generator functions:

```typescript
export class ProductFactory {
  @Factory((faker) => faker.commerce.productName())
  name: string;

  @Factory((faker) => faker.commerce.productDescription())
  description: string;

  @Factory((faker) => parseFloat(faker.commerce.price()))
  price: number;

  @Factory((faker) => faker.number.int({ min: 0, max: 1000 }))
  stock: number;

  @Factory((faker) => faker.helpers.arrayElement(['electronics', 'clothing', 'food', 'books']))
  category: string;

  @Factory((faker) => {
    return {
      weight: faker.number.float({ min: 0.1, max: 100, precision: 0.1 }),
      dimensions: {
        width: faker.number.int({ min: 1, max: 100 }),
        height: faker.number.int({ min: 1, max: 100 }),
        depth: faker.number.int({ min: 1, max: 100 }),
      },
    };
  })
  metadata: object;

  @Factory((faker) => faker.helpers.arrayElements(['red', 'blue', 'green', 'yellow'], { min: 1, max: 3 }))
  colors: string[];
}
```

### Using Factories

```typescript
import { DataFactory } from '@ackplus/nest-seeder';
import { UserFactory } from './user.factory';

// Create a factory
const factory = DataFactory.createForClass(UserFactory);

// Generate single object
const user = factory.generate(1)[0];

// Generate multiple objects
const users = factory.generate(10);

// Generate with custom values (override factory defaults)
const admins = factory.generate(5, {
  role: 'admin',
  isActive: true,
});

// Mix of factory-generated and custom values
const users = factory.generate(3, {
  isActive: true, // Override this field
  // Other fields will be generated by factory
});
```

## 🖥️ CLI Usage

### Setup CLI

#### 1. Install CLI dependencies

```bash
npm install -D ts-node typescript
```

#### 2. Add CLI script to package.json

```json
{
  "scripts": {
    "seed": "nest-seed -c ./src/database/seeder.config.ts",
    "seed:refresh": "nest-seed -c ./src/database/seeder.config.ts --refresh",
    "seed:user": "nest-seed -c ./src/database/seeder.config.ts --name UserSeeder"
  }
}
```

#### 3. Create a configuration file

```typescript
// src/database/seeder.config.ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Post } from './entities/post.entity';
import { UserSeeder } from './seeders/user.seeder';
import { PostSeeder } from './seeders/post.seeder';

export default {
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'mydb',
      entities: [User, Post],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User, Post]),
  ],
  seeders: [UserSeeder, PostSeeder],
};
```

### CLI Commands

#### Run all seeders

```bash
npm run seed
# or
nest-seed -c ./src/database/seeder.config.ts
```

#### Refresh mode (drop and reseed)

```bash
npm run seed:refresh
# or
nest-seed -c ./src/database/seeder.config.ts --refresh
# or short form
nest-seed -c ./src/database/seeder.config.ts -r
```

#### Run specific seeder(s)

```bash
# Single seeder
nest-seed -c ./src/database/seeder.config.ts --name UserSeeder
# or short form
nest-seed -c ./src/database/seeder.config.ts -n UserSeeder

# Multiple seeders
nest-seed -c ./src/database/seeder.config.ts -n UserSeeder -n PostSeeder
```

#### With dummy data flag

```bash
nest-seed -c ./src/database/seeder.config.ts --dummyData
# or short form
nest-seed -c ./src/database/seeder.config.ts -d
```

#### Combined options

```bash
# Refresh and run specific seeder with dummy data
nest-seed -c ./src/database/seeder.config.ts -r -n UserSeeder -d
```

### CLI Help

```bash
nest-seed --help
```

Output:
```
Options:
  --help                Show help                                      [boolean]
  --version             Show version number                            [boolean]
  --config, -c          Path to seeder configuration file            [required]
  --refresh, -r         Drop all data before seeding   [boolean] [default: false]
  --name, -n            Specific seeder names to run                     [array]
  --dummyData, -d       Include dummy data             [boolean] [default: false]

Examples:
  nest-seed -c ./seeder.config.ts                Run all seeders
  nest-seed -c ./seeder.config.ts --refresh      Drop and reseed all data
  nest-seed -c ./seeder.config.ts --name UserSeeder  Run specific seeder
```

### Configuration File

The configuration file should export a default object with the following structure:

```typescript
// seeder.config.ts
import { SeederModuleOptions } from '@ackplus/nest-seeder';

const config: SeederModuleOptions = {
  // Required: Array of seeder providers
  seeders: [UserSeeder, PostSeeder, CommentSeeder],
  
  // Optional: Modules to import (e.g., TypeORM, Mongoose)
  imports: [
    TypeOrmModule.forRoot({ /* ... */ }),
    TypeOrmModule.forFeature([User, Post, Comment]),
  ],
  
  // Optional: Additional providers
  providers: [PrismaService, CustomService],
};

export default config;
```

## 📝 Programmatic Usage

### Using Seeder Function

```typescript
// src/seed.ts
import { seeder } from '@ackplus/nest-seeder';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserSeeder } from './seeders/user.seeder';

seeder({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'mydb',
      entities: [User],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User]),
  ],
}).run({
  seeders: [UserSeeder],
});
```

Run with CLI arguments:
```bash
ts-node src/seed.ts --refresh
ts-node src/seed.ts --name UserSeeder
ts-node src/seed.ts -r -n UserSeeder -d
```

### Using SeederService Directly

```typescript
import { NestFactory } from '@nestjs/core';
import { SeederService } from '@ackplus/nest-seeder';
import { AppModule } from './app.module';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seeder = app.get(SeederService);
  
  // Run all seeders
  await seeder.run();
  
  // Or just seed (without drop)
  await seeder.seed();
  
  // Or just drop
  await seeder.drop();
  
  await app.close();
}

seed();
```

## 🔥 Advanced Examples

### Conditional Seeding

```typescript
@Injectable()
export class UserSeeder implements Seeder {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed(options: SeederServiceOptions): Promise<void> {
    // Check if data already exists
    const count = await this.userRepository.count();
    if (count > 0 && !options.refresh) {
      console.log('⏭️  Users already exist, skipping...');
      return;
    }

    const factory = DataFactory.createForClass(UserFactory);
    
    // Different amounts based on environment
    const count = process.env.NODE_ENV === 'production' ? 10 : 100;
    const users = factory.generate(count);

    await this.userRepository.save(users);
    console.log(`✅ Seeded ${users.length} users`);
  }

  async drop(options: SeederServiceOptions): Promise<void> {
    await this.userRepository.delete({});
  }
}
```

### Seeding with External Data

```typescript
@Injectable()
export class CountrySeeder implements Seeder {
  async seed(options: SeederServiceOptions): Promise<void> {
    const countries = [
      { code: 'US', name: 'United States' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'CA', name: 'Canada' },
      // ... more countries
    ];

    await this.countryRepository.save(countries);
    console.log(`✅ Seeded ${countries.length} countries`);
  }

  async drop(options: SeederServiceOptions): Promise<void> {
    await this.countryRepository.delete({});
  }
}
```

### Seeding from JSON File

```typescript
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProductSeeder implements Seeder {
  async seed(options: SeederServiceOptions): Promise<void> {
    const filePath = path.join(__dirname, '../data/products.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    await this.productRepository.save(data);
    console.log(`✅ Seeded ${data.length} products from file`);
  }

  async drop(options: SeederServiceOptions): Promise<void> {
    await this.productRepository.delete({});
  }
}
```

### Transaction Support

```typescript
@Injectable()
export class UserSeeder implements Seeder {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async seed(options: SeederServiceOptions): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const factory = DataFactory.createForClass(UserFactory);
      const users = factory.generate(10);

      await queryRunner.manager.save(users);
      await queryRunner.commitTransaction();
      
      console.log('✅ Seeded 10 users');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async drop(options: SeederServiceOptions): Promise<void> {
    await this.userRepository.delete({});
  }
}
```

### Multi-tenant Seeding

```typescript
@Injectable()
export class TenantSeeder implements Seeder {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed(options: SeederServiceOptions): Promise<void> {
    const tenantFactory = DataFactory.createForClass(TenantFactory);
    const tenants = tenantFactory.generate(5);
    const savedTenants = await this.tenantRepository.save(tenants);

    const userFactory = DataFactory.createForClass(UserFactory);
    
    // Create users for each tenant
    for (const tenant of savedTenants) {
      const users = userFactory.generate(10, {
        tenantId: tenant.id,
      });
      await this.userRepository.save(users);
    }

    console.log('✅ Seeded 5 tenants with 10 users each');
  }

  async drop(options: SeederServiceOptions): Promise<void> {
    await this.userRepository.delete({});
    await this.tenantRepository.delete({});
  }
}
```

## 📚 API Reference

### SeederModule

#### `SeederModule.register(options: SeederModuleOptions)`

Synchronously register the seeder module.

**Options:**
- `seeders`: Array of seeder providers
- `imports`: Modules to import
- `providers`: Additional providers

#### `SeederModule.forRootAsync(options: SeederModuleAsyncOptions)`

Asynchronously register the seeder module.

**Options:**
- `useFactory`: Factory function for async configuration
- `useClass`: Configuration class implementing `SeederOptionsFactory`
- `useExisting`: Existing provider for configuration
- `imports`: Modules to import
- `inject`: Dependencies to inject
- `isGlobal`: Make module global

### Seeder Interface

```typescript
interface Seeder {
  seed(options: SeederServiceOptions): Promise<any>;
  drop(options: SeederServiceOptions): Promise<any>;
}
```

### SeederServiceOptions

```typescript
interface SeederServiceOptions {
  name?: string | string[];  // Specific seeders to run
  refresh?: boolean;         // Drop before seeding
  dummyData?: boolean;       // Flag for conditional logic
}
```

### DataFactory

#### `DataFactory.createForClass<T>(target: Type<T>): Factory`

Create a factory for a class with `@Factory` decorators.

**Returns:** Factory object with `generate()` method

```typescript
interface Factory {
  generate(count: number, values?: Record<string, any>): Array<Record<string, any>>;
}
```

### @Factory Decorator

```typescript
@Factory(
  generator: FactoryValueGenerator | FactoryValue,
  dependsOn?: string[]
)
```

**Parameters:**
- `generator`: Function `(faker, ctx) => value` or static value
- `dependsOn`: Array of property names this field depends on

### SeederService

#### Methods

- `run()`: Execute seed or drop+seed based on options
- `seed()`: Run seed method on all seeders
- `drop()`: Run drop method on all seeders
- `getSeederToRun()`: Get list of seeders to run based on options

## 📦 Publishing

This package uses automated GitHub Actions for publishing.

### Using CLI Script

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
3. Ask to push to remote (triggers GitHub Action)
4. Commit version change

### Manual Publishing

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0

# GitHub Action will automatically publish to npm
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Powered by [Faker.js](https://fakerjs.dev/)
- Inspired by database seeding patterns from Laravel and other frameworks

## 📮 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Check existing documentation
- Review examples in the repository

---

Made with ❤️ for the NestJS community
