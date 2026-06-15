# Factories

Factories describe **how to generate a single record**. You declare each field with the `@Factory` decorator, then ask `DataFactory` to build as many records as you need. Under the hood, every generator receives a [Faker](https://fakerjs.dev/) instance, so you get realistic, randomized data with almost no boilerplate.

```ts
import { Factory } from '@ackplus/nest-seeder';

export class UserFactory {
  @Factory((faker) => faker.person.firstName())
  firstName: string;

  @Factory((faker) => faker.person.lastName())
  lastName: string;
}
```

```ts
import { DataFactory } from '@ackplus/nest-seeder';

const factory = DataFactory.createForClass(UserFactory);
const users = factory.generate(10); // → 10 UserFactory-shaped objects
```

## The `@Factory` decorator

`@Factory` is a **property decorator**. Its first argument is either a **generator function** or a **static value**. The optional second argument, `dependsOn`, lists other fields this one needs (covered [below](#dependent-fields-with-dependson)).

```ts
@Factory(generatorOrStaticValue, dependsOn?: string[])
```

A generator has the signature:

```ts
(faker: Faker, ctx: Record<string, any>) => value
```

- `faker` — a Faker instance for generating values.
- `ctx` — a context object containing any **override values** plus **already-generated fields** (only those declared in `dependsOn` are guaranteed to be present).

## Static values

Pass a plain value instead of a function when a field should be the same on every record.

```ts
import { Factory } from '@ackplus/nest-seeder';

export class UserFactory {
  @Factory((faker) => faker.person.fullName())
  name: string;

  @Factory('user') // every record gets role: 'user'
  role: string;

  @Factory(true)
  isActive: boolean;
}
```

::: tip
Static values are great for sensible defaults. You can still override them per record with `generate(count, overrides)` — see [Per-record overrides](#per-record-overrides).
:::

## Faker generators

Pass a function to compute a fresh value for each record. This library targets **Faker v9+**, so use the modern namespaced API.

```ts
import { Factory } from '@ackplus/nest-seeder';

export class ProductFactory {
  @Factory((faker) => faker.commerce.productName())
  name: string;

  @Factory((faker) => faker.number.int({ min: 1, max: 100 }))
  quantity: number;

  @Factory((faker) => faker.datatype.boolean())
  inStock: boolean;

  @Factory((faker) => faker.helpers.arrayElement(['draft', 'published', 'archived']))
  status: string;

  @Factory((faker) => faker.lorem.sentence())
  summary: string;

  @Factory((faker) => faker.date.past({ years: 2 }))
  createdAt: Date;
}
```

::: warning Faker v9 API
Use `faker.number.int({ min, max })` — the old `faker.datatype.number` was **removed** in Faker v9. `faker.datatype.boolean()` is still fine.
:::

A quick reference of commonly used generators:

```ts
faker.person.firstName();
faker.person.lastName();
faker.person.fullName();
faker.internet.email();
faker.internet.password({ length: 12 });
faker.number.int({ min: 1, max: 100 });
faker.datatype.boolean();
faker.helpers.arrayElement(['a', 'b', 'c']);
faker.helpers.arrayElements(['a', 'b', 'c', 'd'], { min: 1, max: 3 });
faker.lorem.sentence();
faker.lorem.paragraphs(2);
faker.date.past({ years: 1 });
faker.location.streetAddress();
faker.location.city();
```

## Dependent fields with `dependsOn`

Sometimes a field's value should be **derived from another field**. Declare the dependency in the second argument to `@Factory`, and the values you depend on will be available on `ctx`.

The classic example: an email built from the generated first and last name.

```ts
import { Factory } from '@ackplus/nest-seeder';

export class UserFactory {
  @Factory((faker) => faker.person.firstName())
  firstName: string;

  @Factory((faker) => faker.person.lastName())
  lastName: string;

  @Factory(
    (faker, ctx) =>
      faker.internet.email({ firstName: ctx.firstName, lastName: ctx.lastName }).toLowerCase(),
    ['firstName', 'lastName'],
  )
  email: string;
}
```

```ts
const factory = DataFactory.createForClass(UserFactory);
factory.generateOne();
// { firstName: 'Ada', lastName: 'Lovelace', email: 'ada.lovelace@example.com' }
```

### Order-independent and transitive

Dependencies are resolved by the **dependency graph**, not by the order in which you declare fields. You can depend on a field that appears *later* in the class, and chains of dependencies are resolved **transitively** — each field sees the already-computed values it asked for.

```ts
import { Factory } from '@ackplus/nest-seeder';

export class AccountFactory {
  // 3-level chain: username → email → displayName
  // displayName depends on email, which depends on username.
  @Factory((faker, ctx) => `@${ctx.username}`, ['username'])
  displayName: string;

  @Factory((faker, ctx) => `${ctx.username}@example.com`, ['username'])
  email: string;

  @Factory((faker) => faker.internet.username().toLowerCase())
  username: string;
}
```

```ts
const factory = DataFactory.createForClass(AccountFactory);
factory.generateOne();
// {
//   username: 'ada_l',
//   email: 'ada_l@example.com',
//   displayName: '@ada_l',
// }
```

Even though `displayName` and `email` are declared **before** `username`, they receive the correct value because `dependsOn` drives resolution.

::: tip
List only the fields you actually read from `ctx` in `dependsOn`. The library guarantees those are generated first; undeclared fields may not be present yet.
:::

## Per-record overrides

Both `generate` and `generateOne` accept an `overrides` object. Override values:

1. **Replace generated values** for any field you specify, and
2. Are **merged into the final object** even if the key is *not* a `@Factory` field — perfect for foreign keys.

Overrides also flow into `ctx`, so dependent generators can read them.

```ts
const factory = DataFactory.createForClass(UserFactory);

// Override a generated field
const admins = factory.generate(5, { role: 'admin' });

// Override + add an extra key that isn't on the factory
const one = factory.generateOne({ role: 'admin', tenantId: 42 });
// → { firstName, lastName, email, role: 'admin', tenantId: 42 }
```

### Foreign keys and relationships

Because extra keys pass straight through, you can attach relationships by overriding a foreign-key column the factory never declared.

```ts
const factory = DataFactory.createForClass(PostFactory);

for (const user of users) {
  // authorId is an override, not a @Factory field
  const posts = factory.generate(3, { authorId: user.id });
  await this.postRepository.save(posts);
}
```

::: info
Overrides are applied **before** dependent fields are resolved, so a generator can read an overridden value from `ctx`. For example, overriding `firstName` will change the derived `email` in the `UserFactory` above.
:::

## Factory inheritance with `extends`

Factories are plain classes, so a factory can `extend` another one. All inherited `@Factory` properties are included, and a subclass that redeclares a property **wins**.

```ts
import { Factory } from '@ackplus/nest-seeder';

export class UserFactory {
  @Factory((faker) => faker.person.fullName())
  name: string;

  @Factory((faker) => faker.internet.email())
  email: string;

  @Factory('user')
  role: string;
}

// Inherits name + email, overrides role, adds permissions.
export class AdminFactory extends UserFactory {
  @Factory('admin') // subclass override wins
  role: string;

  @Factory((faker) => faker.helpers.arrayElements(['read', 'write', 'delete'], { min: 1, max: 3 }))
  permissions: string[];
}
```

```ts
const factory = DataFactory.createForClass(AdminFactory);
factory.generateOne();
// { name, email, role: 'admin', permissions: ['read', 'write'] }
```

## Nested objects and arrays

A generator can return **any value**, including nested objects and arrays. Build them inline with Faker.

```ts
import { Factory } from '@ackplus/nest-seeder';

export class CompanyFactory {
  @Factory((faker) => faker.company.name())
  name: string;

  // Nested object
  @Factory((faker) => ({
    street: faker.location.streetAddress(),
    city: faker.location.city(),
  }))
  address: { street: string; city: string };

  // Array of strings
  @Factory((faker) => faker.helpers.arrayElements(['tech', 'finance', 'retail', 'health'], { min: 1, max: 3 }))
  tags: string[];

  // Array of generated objects
  @Factory((faker) =>
    Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => ({
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
    })),
  )
  contacts: Array<{ name: string; email: string }>;
}
```

## `DataFactory.createForClass` typing

`DataFactory.createForClass<T>` returns a strongly-typed `FactoryInstance<T>`. The element type is inferred from the factory class, so `generate` and `generateOne` are fully typed.

```ts
import { DataFactory, FactoryInstance } from '@ackplus/nest-seeder';
import { UserFactory } from './user.factory';

const factory: FactoryInstance<UserFactory> = DataFactory.createForClass(UserFactory);

const many: UserFactory[] = factory.generate(10);
const one: UserFactory = factory.generateOne();
```

| Method | Signature | Returns |
| --- | --- | --- |
| `generate` | `generate(count: number, overrides?)` | `T[]` |
| `generateOne` | `generateOne(overrides?)` | `T` |

## Deterministic output

Faker is random by default. If you need **reproducible** data (e.g. stable fixtures or snapshot tests), seed Faker yourself before generating. This library does not wrap or hide Faker — call `faker.seed()` from `@faker-js/faker` directly.

```ts
import { faker } from '@faker-js/faker';
import { DataFactory } from '@ackplus/nest-seeder';
import { UserFactory } from './user.factory';

faker.seed(123); // same seed → same sequence of values

const factory = DataFactory.createForClass(UserFactory);
const users = factory.generate(10); // deterministic for seed 123
```

::: tip
`faker.seed()` is part of `@faker-js/faker`, not this library. Set it once before generating, and reset or re-seed whenever you want a fresh sequence.
:::

## Next steps

- [Writing seeders](/guide/seeders) — persist generated data with TypeORM or Mongoose.
- [DataFactory API](/api/data-factory) — full reference for the factory runtime.
- [CLI reference](/guide/cli) — run your seeders with `nest-seed`.
