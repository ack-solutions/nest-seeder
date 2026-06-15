export interface SeederServiceOptions {
    /** Run only the named seeder(s). Matches the class name or `@SeederName`. */
    name?: string | string[];

    /** Drop data (via each seeder's `drop()`) before seeding. */
    refresh?: boolean;

    /** Print the seeders that would run without executing them. */
    dryRun?: boolean;

    /** Keep going when a seeder throws instead of aborting the run. */
    continueOnError?: boolean;

    /**
     * Arbitrary values forwarded to every seeder via its options argument.
     * Use this to pass flags or data from the CLI/programmatic caller.
     */
    context?: Record<string, any>;

    /**
     * @deprecated Use {@link SeederServiceOptions.context} instead. Kept for
     * backwards compatibility with v1; still populated by the `--dummy-data` flag.
     */
    dummyData?: boolean;
}

export interface Seeder {
    /** Insert data into the database. */
    seed(options?: SeederServiceOptions): Promise<any> | any;

    /** Remove data from the database. Optional. */
    drop?(options?: SeederServiceOptions): Promise<any> | any;
}
