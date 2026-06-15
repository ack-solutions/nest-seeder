/**
 * Guards the v2.0.0 gotcha where the CLI registered ts-node with `strict: false`
 * and `skipProject: true`, so:
 *   1. string-literal-union columns (`'a' | 'b'`) could emit `design:type = Object`
 *      on some TypeScript versions, breaking TypeORM on Postgres/MySQL; and
 *   2. there was no way to point ts-node at your own tsconfig.
 *
 * The CLI now defaults to `strict: true` and honors `--project` / `TS_NODE_PROJECT`.
 *
 * The fixture seeder asserts the reflected `design:type` for its union column is
 * `String` (SQLite itself is too lenient to throw on `Object`). Note that whether
 * `strict` flips the emitted type is TypeScript-version dependent — this test is an
 * invariant guard for the union-column path and a check that `--project` is honored.
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const APP_DIR = path.resolve(__dirname, '..');
const CLI = path.resolve(APP_DIR, '../../packages/nest-seeder/dist/cli.js');
const FIXTURE = path.resolve(__dirname, 'fixtures/union-column');
const CONFIG = path.join(FIXTURE, 'seeder.config.ts');
const TSCONFIG = path.join(FIXTURE, 'tsconfig.seed.json');

const DB = path.join(
  os.tmpdir(),
  `nest-seeder-union-${process.pid}-${Math.floor(Math.random() * 1e6)}.sqlite`,
);

function run(args: string[]): string {
  return execFileSync('node', [CLI, '-c', CONFIG, ...args], {
    cwd: APP_DIR,
    encoding: 'utf8',
    env: { ...process.env, E2E_DB: DB },
  });
}

function cleanup(): void {
  for (const f of [DB, `${DB}-journal`, `${DB}-wal`, `${DB}-shm`]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}

describe('nest-seed — union @Column & --project (e2e)', () => {
  beforeAll(() => {
    if (!fs.existsSync(CLI)) {
      throw new Error(
        `CLI not built at ${CLI}. Run "pnpm -C packages/nest-seeder build" first.`,
      );
    }
  });

  beforeEach(cleanup);
  afterAll(cleanup);

  jest.setTimeout(120_000);

  it('seeds a bare string-literal-union column (design:type stays String)', () => {
    const out = run([]);
    expect(out).toMatch(/Seeding completed successfully/i);
  });

  it('honors --project pointing at a tsconfig', () => {
    const out = run(['--project', TSCONFIG]);
    expect(out).toMatch(/Seeding completed successfully/i);
  });

  it('fails clearly when --project points at a missing file', () => {
    expect(() => run(['--project', './does-not-exist.json'])).toThrow();
  });
});
