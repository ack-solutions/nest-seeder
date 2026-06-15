import { Injectable, Logger } from '@nestjs/common';

import { getSeederName } from '../decorators/seeder.decorator';
import type { Seeder, SeederServiceOptions } from './seeder.interface';


@Injectable()
export class SeederService {

    private readonly logger = new Logger('Seeder');

    constructor(
        private readonly seeders: Seeder[] = [],
        private readonly options: SeederServiceOptions = {},
    ) {}

    /**
     * Runs the configured seeders. In `refresh` mode every selected seeder is
     * dropped first (in reverse order to respect foreign-key dependencies),
     * then all are seeded.
     */
    async run(): Promise<void> {
        const seeders = this.getSeedersToRun();

        if (seeders.length === 0) {
            this.logger.warn('No seeders to run.');
            return;
        }

        if (this.options.dryRun) {
            this.logger.log('Dry run — the following seeders would execute:');
            seeders.forEach((seeder, index) => {
                this.logger.log(`  ${index + 1}. ${getSeederName(seeder)}`);
            });
            return;
        }

        if (this.options.refresh) {
            await this.drop(seeders);
        }

        await this.seed(seeders);
    }

    /** Seeds the given seeders (defaults to the configured selection). */
    async seed(seeders: Seeder[] = this.getSeedersToRun()): Promise<void> {
        for (const seeder of seeders) {
            const name = getSeederName(seeder);
            try {
                this.logger.log(`Seeding: ${name}`);
                await seeder.seed(this.options);
                this.logger.log(`Completed: ${name}`);
            } catch (error) {
                this.handleError(name, 'seed', error);
            }
        }
    }

    /** Drops the given seeders in reverse order (defaults to the selection). */
    async drop(seeders: Seeder[] = this.getSeedersToRun()): Promise<void> {
        for (const seeder of [...seeders].reverse()) {
            const name = getSeederName(seeder);
            if (typeof seeder.drop !== 'function') {
                this.logger.debug(`Skipping drop for ${name} (no drop() defined)`);
                continue;
            }
            try {
                this.logger.log(`Dropping: ${name}`);
                await seeder.drop(this.options);
                this.logger.log(`Dropped: ${name}`);
            } catch (error) {
                this.handleError(name, 'drop', error);
            }
        }
    }

    /** Resolves the seeders to run based on the `name` option. */
    getSeedersToRun(): Seeder[] {
        const names = this.normalizeNames(this.options.name);

        if (!names) {
            if (this.seeders.length === 0) {
                this.logger.warn(
                    'No seeders registered. Did you add them to the "seeders" array in your config?',
                );
            }
            return this.seeders;
        }

        const wanted = new Set(names.map((name) => name.toLowerCase()));
        const matched = this.seeders.filter((seeder) => {
            const name = getSeederName(seeder).toLowerCase();
            return wanted.has(name) || wanted.has(name.replace(/seeder$/, ''));
        });

        if (matched.length === 0) {
            const available = this.seeders.map((seeder) => getSeederName(seeder));
            this.logger.warn(
                `No seeders matched [${names.join(', ')}]. Available seeders: ${
                    available.length ? available.join(', ') : '(none)'
                }`,
            );
        }

        return matched;
    }

    private handleError(name: string, phase: 'seed' | 'drop', error: any): void {
        const message = error?.message ?? error;
        if (this.options.continueOnError) {
            this.logger.error(`Seeder "${name}" failed during ${phase}: ${message}`);
            return;
        }
        throw error;
    }

    private normalizeNames(
        name?: string | string[],
    ): string[] | undefined {
        if (!name) {
            return undefined;
        }
        const list = (Array.isArray(name) ? name : [name]).filter(Boolean);
        return list.length ? list : undefined;
    }

}
