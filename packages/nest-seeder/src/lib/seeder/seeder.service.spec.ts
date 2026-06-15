import { SeederName } from '../decorators/seeder.decorator';
import { SeederService } from './seeder.service';
import type { Seeder } from './seeder.interface';


function makeSeeder(name: string, calls: string[]): Seeder {
    @SeederName(name)
    class TestSeeder implements Seeder {
        async seed(): Promise<void> {
            calls.push(`seed:${name}`);
        }
        async drop(): Promise<void> {
            calls.push(`drop:${name}`);
        }
    }
    return new TestSeeder();
}


describe('SeederService', () => {
    it('runs seeders in declaration order', async () => {
        const calls: string[] = [];
        const service = new SeederService(
            [makeSeeder('a', calls), makeSeeder('b', calls)],
            {},
        );
        await service.run();
        expect(calls).toEqual(['seed:a', 'seed:b']);
    });

    it('drops in reverse order before seeding when refresh is set', async () => {
        const calls: string[] = [];
        const service = new SeederService(
            [makeSeeder('a', calls), makeSeeder('b', calls)],
            { refresh: true },
        );
        await service.run();
        expect(calls).toEqual(['drop:b', 'drop:a', 'seed:a', 'seed:b']);
    });

    it('does not execute seeders on a dry run', async () => {
        const calls: string[] = [];
        const service = new SeederService([makeSeeder('a', calls)], {
            dryRun: true,
        });
        await service.run();
        expect(calls).toEqual([]);
    });

    it('runs only the named seeder', async () => {
        const calls: string[] = [];
        const service = new SeederService(
            [makeSeeder('users', calls), makeSeeder('posts', calls)],
            { name: 'users' },
        );
        await service.run();
        expect(calls).toEqual(['seed:users']);
    });

    it('matches names case-insensitively', async () => {
        const calls: string[] = [];
        const service = new SeederService([makeSeeder('users', calls)], {
            name: ['USERS'],
        });
        await service.run();
        expect(calls).toEqual(['seed:users']);
    });

    it('aborts on the first error by default', async () => {
        const calls: string[] = [];
        const boom: Seeder = {
            async seed() {
                throw new Error('boom');
            },
        };
        const service = new SeederService([boom, makeSeeder('b', calls)], {});
        await expect(service.run()).rejects.toThrow('boom');
        expect(calls).toEqual([]);
    });

    it('keeps going with continueOnError', async () => {
        const calls: string[] = [];
        const boom: Seeder = {
            async seed() {
                throw new Error('boom');
            },
        };
        const service = new SeederService([boom, makeSeeder('b', calls)], {
            continueOnError: true,
        });
        await service.run();
        expect(calls).toEqual(['seed:b']);
    });

    it('skips drop when a seeder has no drop()', async () => {
        const seedOnly: Seeder = { async seed() {} };
        const service = new SeederService([seedOnly], { refresh: true });
        await expect(service.run()).resolves.not.toThrow();
    });
});
