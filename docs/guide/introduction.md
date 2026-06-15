# What is nest-seeder?

**`@ackplus/nest-seeder`** is a CLI-first database seeding library for [NestJS](https://nestjs.com). It lets you describe the shape of your fake data with **factories** (powered by [Faker](https://fakerjs.dev)), wire your seeders into a tiny config file, and run everything from a single command — `nest-seed`.

No bootstrap code in your app. No throwaway scripts. Just declarative factories, a config file, and a CLI.

## The problem it solves

Most teams seed their database in one of two awkward ways:

- **Ad-hoc scripts** — a `seed.ts` you run with `ts-node`, full of manual `repo.save(...)` calls, hard-coded values, and copy-pasted Faker snippets. Every project reinvents the wheel, and the script drifts out of sync with your entities.
- **App-coupled seeding** — seeding logic baked into your application bootstrap, so you have to spin up the whole app (and remember to turn it off in production) just to insert test data.

`nest-seeder` replaces both with a structured, repeatable approach:

| Ad-hoc scripts | nest-seeder (CLI-first) |
| --- | --- |
| Manual Faker calls scattered everywhere | Reusable, declarative **factories** |
| Bespoke runner per project | One standard command: `nest-seed` |
| No clean teardown / re-run story | `--refresh` drops in FK-safe order, then reseeds |
| Edit code to seed a subset | `--name` selects seeders at runtime |
| Risky to run against the wrong DB | `--dry-run` shows what would happen, writes nothing |
| Tied to your app bootstrap | Standalone — only loads the Nest modules your seeders need |

## Key features

- **Factories + Faker** — declare each field with `@Factory()` and a generator function that receives a `Faker` instance. Derived fields (like an email built from a name) are supported via `dependsOn`.
- **A real CLI** — `nest-seed` to run, `nest-seed init` to scaffold, `nest-seed list` to inspect registered seeders and their aliases.
- **Refresh in FK-safe order** — `--refresh` drops your seeders **in reverse order** before reseeding, so foreign-key constraints stay happy.
- **Dry-run** — `--dry-run` prints exactly what would run and writes nothing to the database.
- **Selective by name** — `--name` runs only the seeders you ask for (matched by class name or a stable `@SeederName`, case-insensitive).
- **Dual ESM + CJS** — ships both module formats with full TypeScript types. Node >= 18.
- **Type-safe config** — `defineSeederConfig()` gives you autocomplete and type-checking for your seeder config file.
- **Works with any ORM Nest can inject** — TypeORM, Mongoose, or anything else. If a Nest provider can be injected into your seeder, you can seed with it.

## A 30-second taste

**1. Describe your data with a factory:**

```ts
// src/database/factories/user.factory.ts
import { Factory } from '@ackplus/nest-seeder';

export class UserFactory {
  @Factory((faker) => faker.person.firstName())
  firstName: string;

  @Factory((faker) => faker.person.lastName())
  lastName: string;

  @Factory(
    (faker, ctx) =>
      faker.internet
        .email({ firstName: ctx.firstName, lastName: ctx.lastName })
        .toLowerCase(),
    ['firstName', 'lastName'],
  )
  email: string;
}
```

**2. Write a seeder that uses it:**

```ts
// src/database/seeders/user.seeder.ts
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

**3. Run it:**

```bash
nest-seed
```

That's it — ten realistic users in your database. Need a clean slate? `nest-seed --refresh`. Want to see what would happen first? `nest-seed --dry-run`.

::: tip
Add `"seed": "nest-seed"` to your `package.json` scripts, then use `npm run seed`, `npm run seed -- --refresh`, and friends.
:::

## v2 highlights

Version 2 is the CLI-first generation of nest-seeder:

- **First-class CLI** — `nest-seed run` (default), `init`, and `list`, with config auto-discovery so `--config` is usually optional.
- **`@SeederName` + `getSeederName`** — stable, minification-safe seeder names that power `--name` selection.
- **Type-safe config** via `defineSeederConfig()`.
- **Dual ESM + CJS** output with bundled TypeScript types.
- **Smarter factories** — `dependsOn` resolves transitively and order-independently, factory classes can `extends` a base factory, and overrides (including foreign keys not declared on the factory) flow through to generators.

::: info Coming from v1?
The API and workflow changed in v2. See the [Migration guide](/migration) for a field-by-field walkthrough of what moved.
:::

---

**Next: [Getting Started](/guide/getting-started)** — install the package, scaffold your first factory and seeder with `nest-seed init`, and run your first seed.
