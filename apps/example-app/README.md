# Example App - @ackplus/nest-seeder

Complete working example demonstrating nest-seeder with TypeORM and SQLite.

## 🚀 Quick Start

### 1. Build the Package

```bash
# From root directory
pnpm -C packages/nest-seeder build
```

### 2. Run Tests

```bash
pnpm test
```

### 3. Seed Database

```bash
# Basic seed (10 users, 30 posts)
pnpm seed

# Drop and reseed
pnpm seed:refresh

# More data (50 users, 250 posts)
pnpm seed -- --dummyData

# Watch mode (auto-reseed on changes)
pnpm seed:watch
```

### 4. Start Application

```bash
pnpm start:dev
```

## 📁 Project Structure

```
example-app/
├── src/
│   ├── database/
│   │   ├── entities/       # TypeORM entities
│   │   ├── factories/      # Data factories
│   │   └── seeders/        # Seeders
│   ├── app.module.ts       # Main module
│   ├── seed.ts            # Seed script
│   └── main.ts            # App entry
└── test/                  # Tests
```

## 🎯 Features Demonstrated

- ✅ TypeORM with SQLite
- ✅ Entity relationships (One-to-Many)
- ✅ Factory pattern with Faker.js
- ✅ Batch insertion
- ✅ Watch mode
- ✅ 40+ tests with 90%+ coverage

## 📊 What's Included

### Entities
- **User** - email, name, role, posts relationship
- **Post** - title, content, status, author relationship

### Factories
- **UserFactory** - Generates realistic user data
- **PostFactory** - Generates realistic post data

### Seeders
- **UserSeeder** - Seeds users with batch insertion
- **PostSeeder** - Seeds posts with relationships

### Tests
- Factory tests (21 tests)
- Seeder integration tests (17 tests)
- E2E tests (8 tests)

## 💡 Examples

### Entity

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];
}
```

### Factory

```typescript
export class UserFactory {
  @Factory((faker) => faker.internet.email())
  email: string;

  @Factory((faker) => faker.person.firstName())
  firstName: string;
}
```

### Seeder

```typescript
@Injectable()
export class UserSeeder implements Seeder {
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

## 🛠️ Development

### Watch Modes

```bash
# Terminal 1: App
pnpm start:dev

# Terminal 2: Tests
pnpm test:watch

# Terminal 3: Seed
pnpm seed:watch
```

### Adding New Entity

1. Create entity in `src/database/entities/`
2. Create factory in `src/database/factories/`
3. Create seeder in `src/database/seeders/`
4. Update `app.module.ts`
5. Run tests and seed

## 🐛 Troubleshooting

**Database locked error:**
```bash
rm database.sqlite
pnpm seed
```

**Import errors:**
```bash
pnpm -C packages/nest-seeder build
```

**Test failures:**
```bash
pnpm test --clearCache
pnpm test
```

## 📚 Learn More

- [Main Documentation](../../packages/nest-seeder/README.md)
- [Quick Start Guide](../../packages/nest-seeder/QUICKSTART.md)
- [More Examples](../../packages/nest-seeder/examples/)

---

**Questions?** Check the [main README](../../README.md) or open an issue!
