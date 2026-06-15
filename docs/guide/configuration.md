# Configuration

`@ackplus/nest-seeder` is driven by a single config file at your project root: **`seeder.config.ts`**. It tells the CLI which NestJS modules to bootstrap, which providers to register, and which seeders to run.

The config is a NestJS module in disguise. Whatever you put in `imports` becomes the dependency-injection context your seeders run inside — so factories, repositories, and services are all available exactly as they would be in your app.

## The config shape

Default-export an object with three keys:

```ts
import { defineSeederConfig } from '@ackplus/nest-seeder';

export default defineSeederConfig({
  imports: [
    /* NestJS modules your seeders need (TypeORM, Mongoose, Config, ...) */
  ],
  providers: [
    /* optional: custom services to inject into seeders */
  ],
  seeders: [
    /* SeederClasses — run top-to-bottom */
  ],
});
```

| Key | Required | Description |
| --- | --- | --- |
| `imports` | yes | NestJS modules to bootstrap. Anything your seeders inject must be importable from here. |
| `providers` | no | Extra providers (custom services, helpers) made available to seeders. |
| `seeders` | yes | The seeder classes to register. They run **top-to-bottom**; on `--refresh` they are **dropped in reverse order**. |

::: tip Why `defineSeederConfig`?
It's an identity helper — it returns the config unchanged but gives you full TypeScript autocompletion and type-checking on the shape. It's optional, but recommended.
:::

::: info Order matters
Seeders run in the order you list them, and are dropped in reverse on `--refresh`. List **parents first** (e.g. `UserSeeder` before `PostSeeder`) so foreign keys are created in the right order and torn down safely.
:::

## Independent from your AppModule

The seeder config is **not** your application's `AppModule`. You don't import controllers, guards, interceptors, or the HTTP layer here — only what your seeders actually need to write data.

This keeps seeding fast and side-effect-free. In practice that usually means a database connection module plus the `forFeature` entities/models your seeders touch.

## TypeORM: `forRoot`

The simplest setup — a synchronous connection plus the entities your seeders write to:

```ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { defineSeederConfig } from '@ackplus/nest-seeder';
import { User } from './src/database/entities/user.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';

export default defineSeederConfig({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_DATABASE ?? 'app',
      entities: [User],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User]),
  ],
  seeders: [UserSeeder],
});
```

::: warning Register your entities with `forFeature`
A seeder that injects `@InjectRepository(User)` needs `TypeOrmModule.forFeature([User])` in `imports`. Forgetting it is the most common "no provider for ...Repository" error.
:::

## TypeORM: `forRootAsync` with ConfigService + dotenv

For environment-driven configuration, load your `.env` file and read it through `ConfigService`:

```ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { defineSeederConfig } from '@ackplus/nest-seeder';
import { User } from './src/database/entities/user.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';

export default defineSeederConfig({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: Number(config.get('DB_PORT') ?? 5432),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_DATABASE'),
        entities: [User],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([User]),
  ],
  seeders: [UserSeeder],
});
```

`ConfigModule.forRoot()` reads your `.env` automatically. Set `isGlobal: true` so every module — including the async TypeORM factory — can inject `ConfigService` without re-importing `ConfigModule` everywhere.

## TypeORM: SQLite

SQLite is great for local development and CI — zero external services, just a file (or an in-memory database):

```ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { defineSeederConfig } from '@ackplus/nest-seeder';
import { User } from './src/database/entities/user.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';

export default defineSeederConfig({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'dev.sqlite', // or ':memory:' for an ephemeral DB
      entities: [User],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User]),
  ],
  seeders: [UserSeeder],
});
```

::: tip
`database: ':memory:'` gives you a throwaway database that's perfect for tests — combine it with `synchronize: true` so the schema is created on connect.
:::

## Providers: injecting a custom service

Need a shared helper, a slug generator, or an external client inside your seeders? Register it under `providers` and it becomes injectable just like any Nest provider:

```ts
// src/database/services/password.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class PasswordService {
  hash(plain: string): string {
    // your real hashing here
    return `hashed:${plain}`;
  }
}
```

Register it in the config:

```ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { defineSeederConfig } from '@ackplus/nest-seeder';
import { User } from './src/database/entities/user.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';
import { PasswordService } from './src/database/services/password.service';

export default defineSeederConfig({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'dev.sqlite',
      entities: [User],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [PasswordService],
  seeders: [UserSeeder],
});
```

Then inject it into your seeder's constructor:

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seeder, SeederName, DataFactory } from '@ackplus/nest-seeder';
import { User } from '../entities/user.entity';
import { UserFactory } from '../factories/user.factory';
import { PasswordService } from '../services/password.service';

@Injectable()
@SeederName('users')
export class UserSeeder implements Seeder {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly passwordService: PasswordService,
  ) {}

  async seed(): Promise<void> {
    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(10).map((user) => ({
      ...user,
      password: this.passwordService.hash('changeme'),
    }));
    await this.userRepository.save(users);
  }

  async drop(): Promise<void> {
    await this.userRepository.createQueryBuilder().delete().execute();
  }
}
```

## Config auto-discovery

You usually don't pass a config path at all — the CLI looks for these file names, in order, starting from your current working directory:

1. `seeder.config.ts`
2. `seeder.config.js`
3. `seeder.config.cjs`
4. `seeder.config.mjs`

The first match wins. Place the file at your project root and the `nest-seed` command finds it automatically.

### Overriding with `-c, --config`

To point at a different file — for example a CI-specific config — use the `-c` / `--config` flag:

```bash
nest-seed --config ./config/seeder.ci.ts
```

```bash
# short form
nest-seed -c ./config/seeder.ci.ts
```

This works with any of the supported extensions and overrides auto-discovery entirely.

## `.js`, `.cjs`, `.mjs` configs and when `ts-node` is required

You can author the config in plain JavaScript if you prefer. Pick the extension that matches your project's module system:

::: code-group

```js [seeder.config.js]
// Honors your package.json "type" ("commonjs" or "module")
const { defineSeederConfig } = require('@ackplus/nest-seeder');
// ...
module.exports = defineSeederConfig({ /* ... */ });
```

```js [seeder.config.cjs]
// Always CommonJS, regardless of package.json "type"
const { defineSeederConfig } = require('@ackplus/nest-seeder');
module.exports = defineSeederConfig({ /* ... */ });
```

```js [seeder.config.mjs]
// Always ESM
import { defineSeederConfig } from '@ackplus/nest-seeder';
export default defineSeederConfig({ /* ... */ });
```

:::

::: warning TypeScript config needs `ts-node`
A `seeder.config.ts` file is compiled on the fly, so you need `ts-node` and `typescript` installed as dev dependencies:

```bash
npm install -D ts-node typescript
```

JavaScript configs (`.js`, `.cjs`, `.mjs`) run directly and don't require `ts-node`.
:::

## Next steps

- [Factories](/guide/factories) — generate realistic data with `@Factory`.
- [Seeders](/guide/seeders) — write `seed()` and `drop()` and wire up relationships.
- [CLI](/guide/cli) — every `nest-seed` flag, including `--refresh`, `--name`, and `--dry-run`.
- [TypeORM guide](/guide/orms/typeorm) — entity, factory, and seeder patterns for TypeORM.
- [Mongoose guide](/guide/orms/mongoose) — the same patterns for Mongoose schemas.
- [`defineSeederConfig` API](/api/data-factory) — the full config type reference.
