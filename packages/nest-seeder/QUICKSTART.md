# ⚡ Quick Start - 5 Minutes to Seeding!

Get started with `@ackplus/nest-seeder` in just 5 simple steps.

## 📦 Installation

```bash
npm install @ackplus/nest-seeder @faker-js/faker
npm install -D ts-node typescript
```

## Step 1: Create an Entity

```typescript
// src/entities/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: 'user' })
  role: string;
}
```

## Step 2: Create a Factory

```typescript
// src/factories/user.factory.ts
import { Factory } from '@ackplus/nest-seeder';

export class UserFactory {
  @Factory((faker) => faker.person.fullName())
  name: string;

  @Factory((faker) => faker.internet.email())
  email: string;

  @Factory((faker) => faker.helpers.arrayElement(['admin', 'user', 'guest']))
  role: string;
}
```

## Step 3: Create a Seeder

```typescript
// src/seeders/user.seeder.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seeder, DataFactory } from '@ackplus/nest-seeder';
import { User } from '../entities/user.entity';
import { UserFactory } from '../factories/user.factory';

@Injectable()
export class UserSeeder implements Seeder {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed(): Promise<void> {
    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(10);
    await this.userRepository.save(users);
    console.log('✅ Seeded 10 users');
  }

  async drop(): Promise<void> {
    await this.userRepository.delete({});
  }
}
```

## Step 4: Create Seeder Configuration

Create `seeder.config.ts` in your **project root**:

> **Note:** The seeder configuration is independent and does not require importing your main `AppModule`.

```typescript
// seeder.config.ts (in project root)
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from './src/entities/user.entity';
import { UserSeeder } from './src/seeders/user.seeder';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        entities: [User],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([User]),
  ],
  seeders: [UserSeeder],
};
```

## Step 5: Add Script & Run

Add to `package.json`:

```json
{
  "scripts": {
    "seed": "node -r ts-node/register -r tsconfig-paths/register ./node_modules/@ackplus/nest-seeder/dist/cli.js -c ./seeder.config.ts",
    "seed:refresh": "npm run seed -- --refresh"
  }
}
```

Run it:

```bash
npm run seed
```

**Output:**
```
🌱 Starting NestJS Seeder...
📁 Loading configuration from: seeder.config.ts
[Nest] Starting Nest application...
[Nest] TypeOrmModule dependencies initialized
✅ Seeded 10 users
```

## 🎉 Success!

You've successfully seeded your database! 

## 📚 Next Steps

### Run with options:

```bash
# Drop and reseed
npm run seed:refresh

# Run specific seeder
npm run seed -- --name UserSeeder

# With dummy data flag
npm run seed -- --dummyData
```

### Add More Seeders

1. Create more factories and seeders
2. Add them to `seeder.config.ts`:

```typescript
export default {
  imports: [/* ... */],
  seeders: [
    UserSeeder,
    PostSeeder,
    CommentSeeder,
  ],
};
```

### Watch Mode for Development

Add to `package.json`:

```json
{
  "scripts": {
    "seed:watch": "nodemon --watch src/seeders --watch src/factories --ext ts --exec \"npm run seed\""
  }
}
```

Run:

```bash
npm run seed:watch
```

Now your database will auto-reseed when you modify seeders or factories!

## 💡 Tips

- **Start small**: Begin with one entity, then add more
- **Use factories**: They make generating data super easy
- **Order matters**: List seeders in dependency order
- **Drop method**: Always implement drop() to clear data
- **Environment variables**: Use them for database config

## 🔗 Resources

- [Full Documentation](./README.md)
- [Examples Directory](./examples/)
- [GitHub Repository](https://github.com/ackplus/nest-seeder)

---

Ready to seed! 🌱
