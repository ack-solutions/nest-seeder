# ⚡ Quick Start

Get seeding with `@ackplus/nest-seeder` in a few minutes.
For the full guide, see **[ack-solutions.github.io/nest-seeder](https://ack-solutions.github.io/nest-seeder/guide/getting-started)**.

## Install

```bash
npm install @ackplus/nest-seeder @faker-js/faker
npm install -D ts-node typescript   # for .ts config files
```

## Scaffold (fastest)

```bash
npx nest-seed init
```

This creates `seeder.config.ts`, a factory, and a seeder. Point the config at your database, then:

```json
{ "scripts": { "seed": "nest-seed" } }
```

```bash
npm run seed
```

## Or wire it up by hand

**1. Factory** — `src/database/factories/user.factory.ts`

```ts
import { Factory } from '@ackplus/nest-seeder';

export class UserFactory {
  @Factory((faker) => faker.person.firstName())
  firstName: string;

  @Factory((faker) => faker.internet.email())
  email: string;

  @Factory((faker) => faker.helpers.arrayElement(['admin', 'user', 'guest']))
  role: string;
}
```

**2. Seeder** — `src/database/seeders/user.seeder.ts`

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
    const users = DataFactory.createForClass(UserFactory).generate(10);
    await this.userRepository.save(users);
  }

  async drop(): Promise<void> {
    await this.userRepository.createQueryBuilder().delete().execute();
  }
}
```

**3. Config** — `seeder.config.ts`

```ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { defineSeederConfig } from '@ackplus/nest-seeder';
import { User } from './src/database/entities/user.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';

export default defineSeederConfig({
  imports: [
    TypeOrmModule.forRoot({ type: 'sqlite', database: 'db.sqlite', entities: [User], synchronize: true }),
    TypeOrmModule.forFeature([User]),
  ],
  seeders: [UserSeeder],
});
```

**4. Run**

```bash
npm run seed              # seed
npm run seed -- --refresh # drop (reverse order) then reseed
nest-seed list            # see available seeders
```

## Next steps

- [Factories](https://ack-solutions.github.io/nest-seeder/guide/factories)
- [Seeders](https://ack-solutions.github.io/nest-seeder/guide/seeders)
- [CLI reference](https://ack-solutions.github.io/nest-seeder/guide/cli)
- [Migration v1 → v2](https://ack-solutions.github.io/nest-seeder/migration)
