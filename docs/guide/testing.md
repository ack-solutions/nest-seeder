# Testing

Factories and seeders are just plain classes, so they slot naturally into your test suite. This page shows three levels of testing, from fastest to most end-to-end:

1. **[Build fixtures with `DataFactory`](#build-fixtures-with-datafactory)** — no database, no Nest, just objects.
2. **[Test seeders against an in-memory database](#test-seeders-against-an-in-memory-database)** — a real Nest `TestingModule` with SQLite, calling `seed()` / `drop()` directly.
3. **[Run the whole pipeline programmatically](#run-the-whole-pipeline-programmatically)** — drive `SeederService` end-to-end.

::: tip
The examples below mirror the patterns used in this repo's `example-app` test suite, so they're confirmed to work as-is.
:::

## Build fixtures with DataFactory

The simplest way to use this library in tests is to call [`DataFactory.createForClass`](/api/data-factory) directly. It needs no database and no Nest context, which makes it perfect for unit tests that need realistic, throwaway objects.

```ts
import { DataFactory } from '@ackplus/nest-seeder';
import { UserFactory } from '../factories/user.factory';

describe('UserFactory', () => {
  const factory = DataFactory.createForClass(UserFactory);

  it('generates a single user with the expected shape', () => {
    const [user] = factory.generate(1);

    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('firstName');
    expect(user).toHaveProperty('lastName');
    expect(user).toHaveProperty('role');
  });

  it('generates the requested count', () => {
    const users = factory.generate(10);
    expect(users).toHaveLength(10);
  });

  it('honors overrides', () => {
    const users = factory.generate(3, { role: 'admin' });

    users.forEach((user) => {
      expect(user.role).toBe('admin');
      // Non-overridden fields are still generated.
      expect(user.email).toBeDefined();
    });
  });
});
```

For a single object, use [`generateOne`](/api/data-factory):

```ts
const user = DataFactory.createForClass(UserFactory).generateOne({
  email: 'alice@example.com',
});
```

### Foreign keys via overrides

Overrides may include keys that aren't `@Factory` fields — this is how you attach a foreign key to generated fixtures. See [Relationships](/guide/seeders#relationships) for the full pattern.

```ts
const factory = DataFactory.createForClass(PostFactory);
const posts = factory.generate(3, { authorId: 42 }); // authorId is an override

posts.forEach((post) => {
  expect(post.authorId).toBe(42);
});
```

## Test seeders against an in-memory database

To test a seeder for real, build a Nest [`TestingModule`](https://docs.nestjs.com/fundamentals/testing) with an **in-memory SQLite** TypeORM connection and register your seeder as a provider. You can then call `seed()` and `drop()` directly and assert against the repository.

SQLite's `:memory:` database spins up instantly and disappears when the connection closes, so each test run starts from a clean slate with no external services to manage.

::: info Install the test dependencies
You'll need a SQLite driver and the Nest testing utilities:

```bash
npm install -D better-sqlite3 @nestjs/testing
```

`better-sqlite3` is the recommended driver for the `sqlite` TypeORM type.
:::

Here's a complete Jest example. It mirrors the `example-app` setup: in-memory SQLite, `forFeature`, and `getRepositoryToken` to pull the repository out of the module.

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserSeeder } from './user.seeder';

describe('UserSeeder', () => {
  let module: TestingModule;
  let userRepository: Repository<User>;
  let userSeeder: UserSeeder;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [UserSeeder],
    }).compile();

    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    userSeeder = module.get<UserSeeder>(UserSeeder);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Start every test from a clean table.
    await userRepository.createQueryBuilder().delete().execute();
  });

  it('seeds users', async () => {
    await userSeeder.seed();

    const count = await userRepository.count();
    expect(count).toBe(10);
  });

  it('creates users with all required fields', async () => {
    await userSeeder.seed();

    const [user] = await userRepository.find();
    expect(user.email).toBeDefined();
    expect(user.firstName).toBeDefined();
    expect(user.lastName).toBeDefined();
    expect(user.role).toBeDefined();
  });

  it('drops users', async () => {
    await userSeeder.seed();
    expect(await userRepository.count()).toBeGreaterThan(0);

    await userSeeder.drop();
    expect(await userRepository.count()).toBe(0);
  });
});
```

::: warning Always delete via the query builder
In `drop()` and in test cleanup, use `createQueryBuilder().delete().execute()` to clear a table. Modern TypeORM **throws** on `repo.delete({})` with _"Empty criteria(s) are not allowed for the delete method"_.

```ts
// ✅ correct
await userRepository.createQueryBuilder().delete().execute();

// ❌ throws on modern TypeORM
await userRepository.delete({});
```
:::

### Testing related seeders together

For seeders that depend on each other (e.g. posts need users), register both providers, seed the parent first, and clean up children before parents. The order matters because of foreign keys.

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Post } from '../entities/post.entity';
import { UserSeeder } from './user.seeder';
import { PostSeeder } from './post.seeder';

describe('Seeders integration', () => {
  let module: TestingModule;
  let userRepository: Repository<User>;
  let postRepository: Repository<Post>;
  let userSeeder: UserSeeder;
  let postSeeder: PostSeeder;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User, Post],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([User, Post]),
      ],
      providers: [UserSeeder, PostSeeder],
    }).compile();

    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    postRepository = module.get<Repository<Post>>(getRepositoryToken(Post));
    userSeeder = module.get<UserSeeder>(UserSeeder);
    postSeeder = module.get<PostSeeder>(PostSeeder);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Delete children before parents.
    await postRepository.createQueryBuilder().delete().execute();
    await userRepository.createQueryBuilder().delete().execute();
  });

  it('links posts to existing users', async () => {
    await userSeeder.seed(); // parent first
    await postSeeder.seed();

    const posts = await postRepository.find({ relations: ['author'] });
    expect(posts.length).toBeGreaterThan(0);

    posts.forEach((post) => {
      expect(post.author.id).toBe(post.authorId);
    });
  });
});
```

### Passing options and context

Both `seed()` and `drop()` accept [`SeederServiceOptions`](/api/), so you can drive their behavior from a test:

```ts
await userSeeder.seed({ refresh: true });
await userSeeder.seed({ context: { tenantId: 'acme' } });
```

::: tip Mongoose works the same way
For a Mongoose seeder, swap the SQLite `TypeOrmModule` for `MongooseModule` (an in-memory MongoDB such as `mongodb-memory-server` works well) and clear collections with `model.deleteMany({})`. See the [Mongoose guide](/guide/orms/mongoose).
:::

## Run the whole pipeline programmatically

The two approaches above call seeders by hand. If you want to exercise the **entire run** — ordering, `--refresh` drop-in-reverse, the lot — you can drive [`SeederService`](/api/seeder-service) yourself.

### With SeederModule.register

Build the module with [`SeederModule.register`](/api/seeder-service), grab the [`SeederService`](/api/seeder-service), and call `run()`:

```ts
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederModule, SeederService } from '@ackplus/nest-seeder';
import { User } from '../entities/user.entity';
import { Post } from '../entities/post.entity';
import { UserSeeder } from './user.seeder';
import { PostSeeder } from './post.seeder';

describe('Full seed run', () => {
  it('runs all seeders in order', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        SeederModule.register({
          imports: [
            TypeOrmModule.forRoot({
              type: 'sqlite',
              database: ':memory:',
              entities: [User, Post],
              synchronize: true,
              logging: false,
            }),
            TypeOrmModule.forFeature([User, Post]),
          ],
          seeders: [UserSeeder, PostSeeder],
        }),
      ],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const seederService = app.get(SeederService);
    await seederService.run();

    await app.close();
  });
});
```

`SeederService` also exposes `seed()`, `drop()`, and `getSeedersToRun()` if you want finer control over what runs. See the [`SeederService` API](/api/seeder-service) for details.

### With the seeder() helper

For a one-shot run in a script-like test, the [`seeder()`](/api/seeder) helper wraps the module setup and the service call into a single `run()`:

```ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { seeder } from '@ackplus/nest-seeder';
import { User } from '../entities/user.entity';
import { UserSeeder } from './user.seeder';

it('seeds via the programmatic helper', async () => {
  await seeder({
    imports: [
      TypeOrmModule.forRoot({
        type: 'sqlite',
        database: ':memory:',
        entities: [User],
        synchronize: true,
        logging: false,
      }),
      TypeOrmModule.forFeature([User]),
    ],
    seeders: [UserSeeder],
  }).run({ refresh: true });
});
```

::: tip Prefer the direct approach for assertions
`seeder().run()` creates and closes its own application context internally, so you don't get a handle on the repository to assert against. For most tests, the [in-memory database approach](#test-seeders-against-an-in-memory-database) is easier to assert on. Reach for `seeder()` (and the [`nest-seed` CLI](/guide/cli)) when you just want the data populated.
:::

## See also

- [Factories](/guide/factories) — building data with `@Factory` and `DataFactory`
- [Seeders](/guide/seeders) — the `Seeder` interface and `drop()`
- [CLI](/guide/cli) — running seeders from the command line
- [`SeederService` API](/api/seeder-service) — `run()`, `seed()`, `drop()`, `getSeedersToRun()`
