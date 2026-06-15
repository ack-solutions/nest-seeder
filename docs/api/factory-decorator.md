# @Factory

The `@Factory` property decorator tells `DataFactory` how to generate a value for a
property on a factory class. Decorate each property you want generated, then pass the
class to [`DataFactory.createForClass`](/api/data-factory) to build instances.

```ts
import { Factory } from '@ackplus/nest-seeder';

export class UserFactory {
  @Factory((faker) => faker.person.firstName())
  firstName: string;
}
```

## Signature

```ts
@Factory(generatorOrStaticValue, dependsOn?: string[])
```

| Argument | Type | Description |
| --- | --- | --- |
| `generatorOrStaticValue` | `FactoryValueGenerator \| FactoryValue` | A generator function, or a plain static value. |
| `dependsOn` | `string[]` (optional) | Names of other factory fields that must be generated first. |

## Generator function

A generator receives the Faker instance and a context object, and returns the value for
the property:

```ts
(faker: Faker, ctx: Record<string, any>) => value
```

| Parameter | Description |
| --- | --- |
| `faker` | A [Faker](https://fakerjs.dev/) instance — use it for randomized data. |
| `ctx` | Override values passed to `generate`/`generateOne`, plus already-generated fields (see [dependsOn](#dependson-derived-fields)). |

```ts
import { Factory } from '@ackplus/nest-seeder';

export class UserFactory {
  @Factory((faker) => faker.person.firstName())
  firstName: string;

  @Factory((faker) => faker.helpers.arrayElement(['admin', 'user', 'guest']))
  role: string;

  @Factory((faker) => faker.number.int({ min: 18, max: 90 }))
  age: number;
}
```

::: warning Faker v9+
Use `faker.number.int({ min, max })` — the old `faker.datatype.number` was removed.
`faker.datatype.boolean()` is still available.
:::

## Static values

If you pass anything other than a function, it is used as-is for every generated
instance:

```ts
import { Factory } from '@ackplus/nest-seeder';

export class AccountFactory {
  @Factory('active')
  status: string;

  @Factory(true)
  isVerified: boolean;
}
```

::: tip
Static values are perfect for constants or defaults. Callers can still override them per
call via `generate(count, { status: 'pending' })`.
:::

## dependsOn — derived fields

When a property is computed from other generated properties, list those properties in
`dependsOn`. The decorator guarantees they are generated first and exposes their values
through `ctx`.

```ts
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

`dependsOn` is **transitive** and **order-independent**: a dependency can itself depend
on other fields, and you can declare properties in any order in the class. The resolver
sorts them out before generation.

```ts
import { Factory } from '@ackplus/nest-seeder';

export class ProfileFactory {
  // declared first, but depends on `slug`, which depends on `username`
  @Factory((faker, ctx) => `https://example.com/${ctx.slug}`, ['slug'])
  url: string;

  @Factory((faker, ctx) => ctx.username.toLowerCase(), ['username'])
  slug: string;

  @Factory((faker) => faker.internet.username())
  username: string;
}
```

::: info Overrides flow through `ctx` too
Values you pass as overrides (including keys not declared on the factory, such as a
foreign key) are available in `ctx` for dependent fields. See
[Relationships](/guide/seeders).
:::

## Inheritance

A factory class may `extends` a base factory. All inherited `@Factory` properties are
included in the generated instance. When a subclass redeclares a property, the
**subclass definition wins**.

```ts
import { Factory } from '@ackplus/nest-seeder';

export class PersonFactory {
  @Factory((faker) => faker.person.fullName())
  name: string;

  @Factory((faker) => faker.helpers.arrayElement(['user', 'guest']))
  role: string;
}

export class AdminFactory extends PersonFactory {
  // inherits `name`; overrides `role`
  @Factory('admin')
  role: string;
}
```

Generating with `AdminFactory` produces a `name` (inherited) and a `role` of `'admin'`
(overridden).

## Exported types

```ts
import type { FactoryValue, FactoryValueGenerator } from '@ackplus/nest-seeder';
```

| Type | Description |
| --- | --- |
| `FactoryValueGenerator` | The generator function shape: `(faker, ctx) => value`. |
| `FactoryValue` | A value produced by a factory property — a generator function or a static value. |

## See also

- [DataFactory](/api/data-factory) — turn a factory class into instances.
- [Factories guide](/guide/factories) — patterns and recipes.
- [Relationships](/guide/seeders) — foreign keys and overrides.
