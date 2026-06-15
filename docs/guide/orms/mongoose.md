# Mongoose

This guide walks you through seeding a MongoDB database end-to-end with Mongoose and `@ackplus/nest-seeder`: a schema, a factory, a seeder, and the config that wires it all together.

## Install

```bash
npm install @ackplus/nest-seeder @faker-js/faker
npm install @nestjs/mongoose mongoose
```

::: tip
If you write your `seeder.config.ts` in TypeScript, also install the dev dependencies:

```bash
npm install -D ts-node typescript
```
:::

## Define a schema

Use the standard NestJS `@Schema()` / `@Prop()` decorators and export the generated schema.

```ts
// src/database/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ default: 'user' })
  role: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
```

## Create a factory

A factory is a plain class whose properties are decorated with `@Factory`. Each generator receives a Faker instance, and a context object (`ctx`) carrying override values plus any already-generated fields it depends on.

```ts
// src/database/factories/user.factory.ts
import { Factory } from '@ackplus/nest-seeder';

export class UserFactory {
  @Factory((faker) => faker.person.firstName())
  firstName: string;

  @Factory((faker) => faker.person.lastName())
  lastName: string;

  @Factory(
    (faker, ctx) => faker.internet.email({ firstName: ctx.firstName, lastName: ctx.lastName }).toLowerCase(),
    ['firstName', 'lastName'],
  )
  email: string;

  @Factory((faker) => faker.helpers.arrayElement(['admin', 'user', 'guest']))
  role: string;
}
```

::: tip Faker v9
Use `faker.number.int({ min, max })` for numbers — `faker.datatype.number` was removed in Faker v9. `faker.datatype.boolean()` is still valid.
:::

## Write a seeder

Inject the Mongoose model with `@InjectModel`, generate documents with `DataFactory`, and persist them with `insertMany()`. The optional `drop()` method clears the collection with `deleteMany({})`.

```ts
// src/database/seeders/user.seeder.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Seeder, SeederName, DataFactory } from '@ackplus/nest-seeder';
import { User, UserDocument } from '../schemas/user.schema';
import { UserFactory } from '../factories/user.factory';

@Injectable()
@SeederName('users')
export class UserSeeder implements Seeder {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
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

::: info
`drop()` is optional. When present, it runs before `seed()` on `--refresh`, making your seed runs idempotent.
:::

## Configure

Create a `seeder.config.ts` at your project root. Register the Mongoose connection with `MongooseModule.forRoot(...)` and the model with `MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])`.

```ts
// seeder.config.ts
import { MongooseModule } from '@nestjs/mongoose';
import { defineSeederConfig } from '@ackplus/nest-seeder';
import { User, UserSchema } from './src/database/schemas/user.schema';
import { UserSeeder } from './src/database/seeders/user.seeder';

export default defineSeederConfig({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI ?? 'mongodb://localhost:27017/app'),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  seeders: [UserSeeder],
});
```

::: tip
`defineSeederConfig` is an identity helper — it only exists to give you full type-safety and autocompletion. It is optional but recommended.
:::

### Async config with ConfigService

If your connection string lives in environment variables managed by `@nestjs/config`, use `MongooseModule.forRootAsync` to inject the `ConfigService`.

```ts
// seeder.config.ts
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { defineSeederConfig } from '@ackplus/nest-seeder';
import { User, UserSchema } from './src/database/schemas/user.schema';
import { UserSeeder } from './src/database/seeders/user.seeder';

export default defineSeederConfig({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  seeders: [UserSeeder],
});
```

## Run it

Add a script to `package.json`:

```json
{
  "scripts": {
    "seed": "nest-seed"
  }
}
```

Then run the seeders:

::: code-group

```bash [seed]
npm run seed
```

```bash [refresh]
npm run seed -- --refresh
```

```bash [single seeder]
npm run seed -- --name users
```

:::

::: warning Refresh order
On `--refresh`, seeders are dropped in **reverse order** so foreign-key-style references unwind safely. List parents first in the `seeders` array.
:::

## Seeding relationships

To link documents across collections, pass the referenced id as an **override**. Override keys do not need to be `@Factory` fields on the factory — they are merged into every generated object.

```ts
const factory = DataFactory.createForClass(PostFactory);
for (const user of users) {
  const posts = factory.generate(3, { author: user._id }); // author is an override, not a @Factory field
  await this.postModel.insertMany(posts);
}
```

## Next steps

- [Factories](/guide/factories) — full `@Factory` and `DataFactory` reference
- [Seeders](/guide/seeders) — the `Seeder` interface and lifecycle
- [CLI](/guide/cli) — every `nest-seed` flag explained
- [DataFactory API](/api/data-factory)
