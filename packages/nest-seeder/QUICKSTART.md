# Quick Start Guide - @ackplus/nest-seeder

Get started with nest-seeder in 5 minutes!

## 📦 Step 1: Installation

```bash
npm install @ackplus/nest-seeder @faker-js/faker
npm install -D ts-node typescript
```

## 🏭 Step 2: Create a Factory

Create a file `src/database/factories/user.factory.ts`:

```typescript
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
}
```

## 🌱 Step 3: Create a Seeder

Create a file `src/database/seeders/user.seeder.ts`:

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
    const users = factory.generate(10);
    await this.userRepository.save(users);
    console.log('✅ Seeded 10 users');
  }

  async drop(options: SeederServiceOptions): Promise<void> {
    await this.userRepository.delete({});
  }
}
```

## ⚙️ Step 4: Register in Module

Update your `app.module.ts`:

```typescript
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

## 🖥️ Step 5A: Option 1 - Using CLI (Recommended)

### Create config file `src/database/seeder.config.ts`:

```typescript
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserSeeder } from './seeders/user.seeder';

export default {
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
  seeders: [UserSeeder],
};
```

### Add script to `package.json`:

```json
{
  "scripts": {
    "seed": "nest-seed -c ./src/database/seeder.config.ts",
    "seed:refresh": "nest-seed -c ./src/database/seeder.config.ts --refresh"
  }
}
```

### Run it:

```bash
npm run seed
```

## 🖥️ Step 5B: Option 2 - Using Script

### Create `src/seed.ts`:

```typescript
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

### Add script to `package.json`:

```json
{
  "scripts": {
    "seed": "ts-node src/seed.ts",
    "seed:refresh": "ts-node src/seed.ts --refresh"
  }
}
```

### Run it:

```bash
npm run seed
```

## 🎉 That's it!

You've successfully set up nest-seeder!

## 📚 Next Steps

### Run specific seeders:
```bash
npm run seed -- --name UserSeeder
```

### Refresh data (drop and reseed):
```bash
npm run seed:refresh
```

### Add more seeders:
1. Create more factory classes
2. Create more seeder classes
3. Add them to your config/module
4. Run!

### Advanced features:
- Check out the full README.md for advanced examples
- Learn about factory dependencies
- Explore relationship handling
- See transaction examples

## 🆘 Need Help?

- Read the full [README.md](./README.md)
- Check the [examples](./examples) folder
- Open an issue on GitHub

Happy Seeding! 🌱

