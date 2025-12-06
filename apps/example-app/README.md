# Example App - @ackplus/nest-seeder

Complete working example demonstrating all features of the nest-seeder package.

## 📋 Features Demonstrated

- ✅ TypeORM integration with SQLite
- ✅ Entity relationships (One-to-Many)
- ✅ Factory pattern for data generation
- ✅ Multiple seeders with dependencies
- ✅ Batch insertion for performance
- ✅ CLI options (refresh, dummyData)
- ✅ Watch mode for development
- ✅ Comprehensive test coverage

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# From the example-app directory
pnpm install

# Or from the root
pnpm install
```

### 2. Build the nest-seeder package

```bash
# From root directory
pnpm -C packages/nest-seeder build
```

### 3. Run the Application

```bash
# Start the dev server
pnpm start:dev

# Or from root
pnpm -C apps/example-app start:dev
```

## 🌱 Seeding

### Basic Seeding

```bash
# Seed the database
pnpm seed

# Output:
# 🚀 Starting database seeding...
# 🌱 Seeding users...
#   📦 Inserted 10/10 users
# ✅ Successfully seeded 10 users
# 🌱 Seeding posts...
# ✅ Successfully seeded 30 posts for 10 users
# ✅ Database seeding completed successfully!
```

### Refresh Mode (Drop & Reseed)

```bash
# Drop all data and reseed
pnpm seed:refresh
```

### With Dummy Data

```bash
# Seed more data (50 users, 5 posts per user)
pnpm seed -- --dummyData
```

### Watch Mode (Auto-reseed on changes)

```bash
# Automatically reseed when factory/seeder files change
pnpm seed:watch
```

This is perfect for development - edit your factories or seeders and see the changes immediately!

## 🧪 Testing

### Run All Tests

```bash
pnpm test
```

### Watch Mode

```bash
pnpm test:watch
```

### Coverage Report

```bash
pnpm test:cov
```

### Test Results

The test suite includes:
- ✅ Factory generation tests
- ✅ Seeder integration tests
- ✅ Relationship handling tests
- ✅ Edge case handling
- ✅ Error scenarios

Expected output:
```
 PASS  src/database/factories/factories.spec.ts
 PASS  src/database/seeders/seeders.spec.ts

Test Suites: 2 passed, 2 total
Tests:       40+ passed, 40+ total
```

## 📁 Project Structure

```
example-app/
├── src/
│   ├── database/
│   │   ├── entities/
│   │   │   ├── user.entity.ts      # User entity
│   │   │   └── post.entity.ts      # Post entity
│   │   ├── factories/
│   │   │   ├── user.factory.ts     # User data factory
│   │   │   ├── post.factory.ts     # Post data factory
│   │   │   └── factories.spec.ts   # Factory tests
│   │   └── seeders/
│   │       ├── user.seeder.ts      # User seeder
│   │       ├── post.seeder.ts      # Post seeder
│   │       └── seeders.spec.ts     # Seeder tests
│   ├── app.module.ts               # Main module with TypeORM & SeederModule
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── main.ts                     # Application entry point
│   └── seed.ts                     # Seeding script
├── test/
│   └── app.e2e-spec.ts
├── nodemon.json                     # Nodemon config for watch mode
├── package.json
└── tsconfig.json
```

## 🎓 Examples

### Entity Definition

```typescript
// user.entity.ts
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

### Factory Definition

```typescript
// user.factory.ts
export class UserFactory {
  @Factory((faker) => faker.internet.email())
  email: string;

  @Factory((faker) => faker.person.firstName())
  firstName: string;
}
```

### Seeder Implementation

```typescript
// user.seeder.ts
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

## 🔧 Configuration

### TypeORM Configuration

Located in `src/app.module.ts`:

```typescript
TypeOrmModule.forRoot({
  type: 'sqlite',
  database: 'database.sqlite',
  entities: [User, Post],
  synchronize: true,
  logging: false,
})
```

### Seeder Registration

```typescript
SeederModule.register({
  seeders: [UserSeeder, PostSeeder],
})
```

## 📊 Data Generated

### Users (10 default, 50 with dummyData)
- Email (unique)
- First name
- Last name
- Password (hashed)
- Role (user/admin/moderator)
- Active status

### Posts (3 per user default, 5 with dummyData)
- Title
- Content (3 paragraphs)
- Status (draft/published/archived)
- View count
- Published flag
- Author relationship

## 🎯 CLI Options

All standard seeding options are available:

```bash
# Run specific seeder
ts-node src/seed.ts --name UserSeeder

# Refresh mode
ts-node src/seed.ts --refresh

# With dummy data
ts-node src/seed.ts --dummyData

# Combined options
ts-node src/seed.ts --refresh --dummyData
```

## 🐛 Troubleshooting

### Database Locked Error

If you get a "database is locked" error:
```bash
# Close any open database connections
# Delete the database file
rm database.sqlite

# Run seed again
pnpm seed
```

### Build Errors

```bash
# Rebuild nest-seeder package
pnpm -C packages/nest-seeder build

# Clean and reinstall
rm -rf node_modules
pnpm install
```

### Import Errors

Make sure the nest-seeder package is built:
```bash
pnpm -C packages/nest-seeder build
```

## 📝 Development Workflow

### Typical Development Flow

1. **Start watch mode**
   ```bash
   pnpm seed:watch
   ```

2. **Edit factories or seeders**
   - Files in `src/database/` are watched
   - Changes trigger automatic reseeding

3. **Run tests**
   ```bash
   pnpm test:watch
   ```

4. **Check results**
   - View database.sqlite with SQLite browser
   - Or query via TypeORM in your app

### Adding New Entities

1. Create entity file in `src/database/entities/`
2. Create factory in `src/database/factories/`
3. Create seeder in `src/database/seeders/`
4. Add to `app.module.ts`:
   - TypeORM entities array
   - SeederModule seeders array
5. Run tests and seed

## 🎨 Customization

### Change Data Volume

Edit seeders to change counts:

```typescript
// user.seeder.ts
const count = options.dummyData ? 100 : 20; // Increased from 50/10
```

### Add New Fields

1. Add column to entity
2. Add factory decorator
3. Run seed

### Modify Relationships

Update entity relations and factory/seeder logic as needed.

## 📚 Learn More

- [Main README](../../packages/nest-seeder/README.md) - Full documentation
- [Quick Start](../../packages/nest-seeder/QUICKSTART.md) - 5-minute guide
- [Examples](../../packages/nest-seeder/examples/) - More examples
- [TypeORM Docs](https://typeorm.io/) - TypeORM documentation
- [Faker.js Docs](https://fakerjs.dev/) - Faker.js API reference

## ✅ What's Tested

### Factory Tests
- ✅ Factory creation
- ✅ Single/multiple object generation
- ✅ Field validation
- ✅ Data uniqueness
- ✅ Value overrides
- ✅ Type consistency
- ✅ Edge cases (zero items, large batches)

### Seeder Tests
- ✅ Seeder execution
- ✅ Data persistence
- ✅ Batch insertion
- ✅ Relationship handling
- ✅ Duplicate prevention
- ✅ Drop operations
- ✅ Refresh mode
- ✅ Warning messages
- ✅ Error handling

## 🎉 Success Criteria

After running the example:
- ✅ Database file created (database.sqlite)
- ✅ Users table populated
- ✅ Posts table populated
- ✅ Relationships established
- ✅ All tests passing
- ✅ No errors in console

---

**Need help?** Check the main [README](../../packages/nest-seeder/README.md) or open an issue!
