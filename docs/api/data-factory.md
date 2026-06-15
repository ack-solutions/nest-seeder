# DataFactory

`DataFactory` turns a plain factory class — one whose properties are annotated with [`@Factory`](/api/factory-decorator) — into a generator you can call to produce fully-populated objects. It is the bridge between your factory definitions and the rows you persist inside a [seeder](/guide/seeders).

```ts
import { DataFactory } from '@ackplus/nest-seeder';
```

## `DataFactory.createForClass`

Creates a reusable generator for a factory class.

```ts
DataFactory.createForClass<T>(FactoryClass): FactoryInstance<T>
```

| Parameter      | Type       | Description                                                     |
| -------------- | ---------- | -------------------------------------------------------------- |
| `FactoryClass` | `Class<T>` | A class with `@Factory`-decorated properties.                  |

Returns a `FactoryInstance<T>` exposing [`generate`](#generate) and [`generateOne`](#generateone).

```ts
import { DataFactory } from '@ackplus/nest-seeder';
import { UserFactory } from '../factories/user.factory';

const factory = DataFactory.createForClass(UserFactory);
```

::: tip Create once, reuse
The returned instance is stateless and cheap to reuse. Create it once (e.g. at the top of your `seed()` method) and call it as many times as you need.
:::

::: warning
Passing something that is not a class throws. Make sure you pass the factory **class itself**, not an instance of it.
:::

## `generate`

Produces an array of `count` objects.

```ts
FactoryInstance<T>.generate(count: number, overrides?): T[]
```

| Parameter   | Type                          | Description                                                          |
| ----------- | ----------------------------- | ------------------------------------------------------------------- |
| `count`     | `number`                      | How many objects to generate. Must be `>= 0`.                       |
| `overrides` | `Partial<T> & Record<string, any>` | Optional values applied to every generated object (see [Overrides](#overrides)). |

```ts
const users = factory.generate(10);
// → [{ firstName, lastName, email, role }, ... ] (10 items)
```

Each generated object is independent, so factory generators run fresh for every item:

```ts
const users = factory.generate(3);
// users[0].email !== users[1].email
```

::: warning
A negative `count` throws. Use `0` if you intentionally want an empty array.
:::

## `generateOne`

Produces a single object. Equivalent to `generate(1)[0]`, but returns the object directly instead of an array.

```ts
FactoryInstance<T>.generateOne(overrides?): T
```

| Parameter   | Type                               | Description                                              |
| ----------- | ---------------------------------- | ------------------------------------------------------- |
| `overrides` | `Partial<T> & Record<string, any>` | Optional values applied to the object (see [Overrides](#overrides)). |

```ts
const user = factory.generateOne();
// → { firstName, lastName, email, role }

const admin = factory.generateOne({ role: 'admin' });
// → { firstName, lastName, email, role: 'admin' }
```

## Overrides

Both methods accept an optional `overrides` object. Its type is `Partial<T>` extended with any extra keys, so you can both override declared fields and inject keys that aren't part of the factory at all.

### Overrides win

A value you pass in `overrides` replaces whatever the matching `@Factory` generator would have produced.

```ts
const users = factory.generate(5, { role: 'admin' });
// every user has role: 'admin'; firstName/lastName/email are still generated
```

### Extra keys are included

Keys that don't correspond to a `@Factory` property are passed straight through onto every generated object. This is the idiomatic way to attach a foreign key when seeding relationships.

```ts
const factory = DataFactory.createForClass(PostFactory);

for (const user of users) {
  // authorId is NOT a @Factory field — it's an extra override key
  const posts = factory.generate(3, { authorId: user.id });
  await this.postRepository.save(posts);
}
```

See [Relationships](/guide/seeders) for the full pattern.

### Overrides feed dependent fields

Override values are merged into the generation context (`ctx`) before generators run, so any `@Factory` field that `dependsOn` an overridden field sees the new value. In the canonical `UserFactory`, `email` is derived from `firstName` and `lastName`:

```ts
const user = factory.generateOne({ firstName: 'Ada', lastName: 'Lovelace' });
// → email: 'ada.lovelace@example.com' (derived from the overrides)
```

See [`@Factory`](/api/factory-decorator) for how `dependsOn` and `ctx` work.

## Behavior and guarantees

- **Declaration order is preserved.** Keys in each generated object follow the order the `@Factory` properties are declared on the class (inherited base-class properties included).
- **Overrides always win** over generator output for matching keys.
- **Extra override keys are kept** on the output, even when they aren't declared on the factory.
- **`generate` throws on a negative `count`.**
- **`createForClass` throws when given something that isn't a class.**

## Full example

```ts
import { Factory, DataFactory } from '@ackplus/nest-seeder';

class UserFactory {
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

  @Factory((faker) => faker.helpers.arrayElement(['admin', 'user', 'guest']))
  role: string;
}

const factory = DataFactory.createForClass(UserFactory);

// 10 random users
const users = factory.generate(10);

// 10 admins (role overridden, everything else generated)
const admins = factory.generate(10, { role: 'admin' });

// one user with a fixed name — email is derived from the overrides
const ada = factory.generateOne({ firstName: 'Ada', lastName: 'Lovelace' });

// attach a foreign key that the factory doesn't declare
const posts = factory.generate(3, { authorId: ada.id });
```

## See also

- [`@Factory`](/api/factory-decorator) — defining factory properties, `ctx`, and `dependsOn`
- [Factories guide](/guide/factories) — patterns and recipes
- [Relationships guide](/guide/seeders) — seeding foreign keys
