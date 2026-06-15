import { SeederName, getSeederName } from './seeder.decorator';


describe('SeederName / getSeederName', () => {
    it('returns the decorator value', () => {
        @SeederName('custom')
        class FooSeeder {}
        expect(getSeederName(FooSeeder)).toBe('custom');
        expect(getSeederName(new FooSeeder())).toBe('custom');
    });

    it('falls back to a static seederName property', () => {
        class BarSeeder {
            static seederName = 'bar';
        }
        expect(getSeederName(BarSeeder)).toBe('bar');
    });

    it('falls back to the class name', () => {
        class BazSeeder {}
        expect(getSeederName(BazSeeder)).toBe('BazSeeder');
        expect(getSeederName(new BazSeeder())).toBe('BazSeeder');
    });
});
