# Seeder & @SeederName

This page is the reference for writing seeders: the `Seeder` interface every seeder
implements, the `@SeederName()` decorator that gives a seeder a stable, minification-safe
name, the `getSeederName()` resolver, and the `SeederServiceOptions` your seeders receive
at runtime.

## The `Seeder` interface

A seeder is any class that implements `Seeder`. It needs a `seed()` method; `drop()` is
optional. Both methods receive the resolved [`SeederServiceOptions`](#seederserviceoptions)
and may be sync or async.

```ts
interface Seeder {
  seed(options?: SeederServiceOptions): Promise<any> | any;
  drop?(options?: SeederServiceOptions): Promise<any> | any;
}
```

- **`seed(options?)`** — required. Inserts data. Called on a normal run and on `--refresh`
  (after `drop()`).
- **`drop(options?)`** — optional. Deletes the data this seeder owns. Called on `--refresh`
  and on a `drop`-only run. If you omit it, the seeder is simply skipped during drops.

::: tip Seeders are regular Nest providers
Seeders are constructed by the Nest DI container, so you can inject repositories, models,
config, or any other provider straight into the constructor.
:::

### Minimal example (TypeORM)

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seeder, SeederName, DataFactory } from '@ackplus/nest-seeder';
import { User } from '../entities/user.entity';
import { UserFactory } from '../factories/user.factory';

@Injectable()
@SeederName('users')
export class UserSeeder implements Seeder {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async seed(): Promise<void> {
    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(10);
    await this.userRepository.save(users);
  }

  async drop(): Promise<void> {
    await this.userRepository.createQueryBuilder().delete().execute();
  }
}
```

::: warning Deleting all rows in TypeORM
Use `repo.createQueryBuilder().delete().execute()` to clear a table. Do **not** use
`repo.delete({})` — modern TypeORM throws *"Empty criteria(s) are not allowed for the
delete method"*.
:::

### Minimal example (Mongoose)

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Seeder, SeederName, DataFactory } from '@ackplus/nest-seeder';
import { User } from '../schemas/user.schema';
import { UserFactory } from '../factories/user.factory';

@Injectable()
@SeederName('users')
export class UserSeeder implements Seeder {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async seed(): Promise<void> {
    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(10);
    await this.userModel.insertMany(users);
  }

  async drop(): Promise<void> {
    await this.userModel.deleteMany({});
  }
}
```

## `@SeederName(name)`

`@SeederName('stable-name')` is a **class decorator** that attaches a stable, human-friendly
name to a seeder. This name is what `--name` matches against and what `nest-seed list`
displays.

```ts
import { SeederName } from '@ackplus/nest-seeder';

@SeederName('users')
export class UserSeeder implements Seeder {
  /* ... */
}
```

::: tip Always add `@SeederName`
Production builds are usually minified, which mangles class names (`UserSeeder` → `e`).
A `@SeederName` is immune to minification, so targeting a seeder with `--name` keeps
working in built code. It is the recommended pattern for every seeder.
:::

With the name in place you can target the seeder from the CLI. Matching is
**case-insensitive** and the `Seeder` suffix is optional:

```bash
# All of these run UserSeeder above
npm run seed -- --name users
npm run seed -- --name Users
npm run seed -- --name user
```

## `getSeederName(seeder)`

`getSeederName()` resolves the effective name of a seeder, given either the **class** or an
**instance**. Use it when you need to log, group, or compare seeders by name.

```ts
function getSeederName(seederClassOrInstance: any): string;
```

```ts
import { getSeederName } from '@ackplus/nest-seeder';

getSeederName(UserSeeder);          // 'users'
getSeederName(new UserSeeder(repo)); // 'users'
```

### Resolution order

`getSeederName()` checks the following sources, in order, and returns the first one it finds:

1. **`@SeederName('...')`** — the decorator value, if present.
2. **`static seederName`** — a static `seederName` property on the class, if present.
3. **Class name** — the constructor name as a fallback (subject to minification).

```ts
// 1. Decorator wins
@SeederName('users')
export class UserSeeder {} // → 'users'

// 2. Static property used when there is no decorator
export class PostSeeder {
  static seederName = 'posts';
} // → 'posts'

// 3. Falls back to the class name
export class TagSeeder {} // → 'TagSeeder'
```

::: warning Prefer `@SeederName` over the class-name fallback
The class-name fallback only survives in un-minified code. Add `@SeederName` (or at least a
static `seederName`) so `--name` targeting is reliable everywhere.
:::

## `SeederServiceOptions`

Every `seed()` and `drop()` call receives the resolved run options. The CLI builds this
object from your flags; the programmatic helpers accept it directly.

```ts
interface SeederServiceOptions {
  name?: string | string[];
  refresh?: boolean;
  dryRun?: boolean;
  continueOnError?: boolean;
  context?: Record<string, any>;
  /** @deprecated */
  dummyData?: boolean;
}
```

| Field | Type | CLI flag | Description |
| --- | --- | --- | --- |
| `name` | `string \| string[]` | `-n, --name` | Run only the named seeders. Matches class name or `@SeederName`, case-insensitive, `Seeder` suffix optional. |
| `refresh` | `boolean` | `-r, --refresh` | Drop seeders (in reverse order) and then reseed. |
| `dryRun` | `boolean` | `--dry-run` | Print what would run without writing anything. |
| `continueOnError` | `boolean` | `--continue-on-error` | Keep going if a seeder throws instead of aborting the run. |
| `context` | `Record<string, any>` | `--context <json>` | Arbitrary JSON forwarded to every seeder. Read it inside `seed()`/`drop()`. |
| `dummyData` | `boolean` | `-d, --dummy-data` | **Deprecated.** Forwarded as `options.dummyData` for backward compatibility. |

### Reading `context` inside a seeder

`--context` lets you parameterize a run from the command line. The JSON is parsed once and
handed to every seeder as `options.context`.

```ts
@Injectable()
@SeederName('users')
export class UserSeeder implements Seeder {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async seed(options?: SeederServiceOptions): Promise<void> {
    const count = options?.context?.userCount ?? 10;

    const factory = DataFactory.createForClass(UserFactory);
    await this.userRepository.save(factory.generate(count));
  }

  async drop(): Promise<void> {
    await this.userRepository.createQueryBuilder().delete().execute();
  }
}
```

```bash
npm run seed -- --context '{"userCount":50}'
```

::: info Import the type
`SeederServiceOptions` is exported from the package, so you can type your method
signatures: `import type { SeederServiceOptions } from '@ackplus/nest-seeder';`
:::

## See also

- [Writing seeders](/guide/seeders) — patterns, ordering, and relationships.
- [DataFactory](/api/data-factory) — generating model data for `seed()`.
- [CLI reference](/guide/cli) — every `nest-seed` flag in detail.
- [SeederModule & SeederService](/api/seeder-service) — running seeders programmatically.
