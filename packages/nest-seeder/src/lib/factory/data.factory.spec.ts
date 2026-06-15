import { Factory } from '../decorators/factory.decorator';
import { DataFactory } from './data.factory';


class UserFactory {
    @Factory((faker) => faker.person.firstName())
    firstName!: string;

    @Factory((faker) => faker.person.lastName())
    lastName!: string;

    @Factory((faker, ctx) => `${ctx.firstName}.${ctx.lastName}`.toLowerCase(), [
        'firstName',
        'lastName',
    ])
    username!: string;

    @Factory('user')
    role!: string;
}

// Transitive dependency chain: c -> b -> a
class ChainFactory {
    @Factory((_faker, ctx) => `${ctx.b}-c`, ['b'])
    c!: string;

    @Factory((_faker, ctx) => `${ctx.a}-b`, ['a'])
    b!: string;

    @Factory(() => 'a')
    a!: string;
}

class BaseFactory {
    @Factory(() => 'base')
    kind!: string;

    @Factory((faker) => faker.number.int({ min: 1, max: 10 }))
    level!: number;
}

class ExtendedFactory extends BaseFactory {
    @Factory(() => 'extended')
    kind = ''; // override the base value (initializer keeps tsc happy)

    @Factory(() => 'extra')
    extra!: string;
}


describe('DataFactory', () => {
    it('generates the requested number of records', () => {
        const factory = DataFactory.createForClass(UserFactory);
        expect(factory.generate(5)).toHaveLength(5);
    });

    it('generateOne returns a single record', () => {
        const factory = DataFactory.createForClass(UserFactory);
        const user = factory.generateOne();
        expect(user.role).toBe('user');
        expect(typeof user.firstName).toBe('string');
    });

    it('includes override values even for non-decorated keys (authorId regression)', () => {
        const factory = DataFactory.createForClass(UserFactory);
        const [record] = factory.generate(1, { authorId: 42 } as any);
        expect((record as any).authorId).toBe(42);
    });

    it('lets overrides win over generated values', () => {
        const factory = DataFactory.createForClass(UserFactory);
        const user = factory.generateOne({ role: 'admin' });
        expect(user.role).toBe('admin');
    });

    it('resolves dependsOn transitively regardless of declaration order', () => {
        const factory = DataFactory.createForClass(ChainFactory);
        const record = factory.generateOne();
        expect(record.a).toBe('a');
        expect(record.b).toBe('a-b');
        expect(record.c).toBe('a-b-c');
    });

    it('derives values from already-generated context', () => {
        const factory = DataFactory.createForClass(UserFactory);
        const user = factory.generateOne({ firstName: 'Ada', lastName: 'Lovelace' });
        expect(user.username).toBe('ada.lovelace');
    });

    it('inherits @Factory properties from a base class and applies overrides', () => {
        const factory = DataFactory.createForClass(ExtendedFactory);
        const record = factory.generateOne();
        expect(record.kind).toBe('extended'); // subclass overrides base
        expect(record.extra).toBe('extra');
        expect(typeof record.level).toBe('number'); // inherited from base
    });

    it('throws on a negative count', () => {
        const factory = DataFactory.createForClass(UserFactory);
        expect(() => factory.generate(-1)).toThrow();
    });

    it('throws when no class is provided', () => {
        expect(() => DataFactory.createForClass(undefined as any)).toThrow();
    });
});
