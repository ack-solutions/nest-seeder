/**
 * True end-to-end tests for the `nest-seed` CLI.
 *
 * These run the *built* CLI binary as a child process against an isolated SQLite
 * database — exercising config loading (ts-node), the Nest bootstrap, TypeORM,
 * and the seeders exactly as a real user would. Run after building the library:
 *
 *   pnpm -C packages/nest-seeder build
 *   pnpm -C apps/example-app test:e2e
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { DataSource } from 'typeorm';

import { User } from '../src/database/entities/user.entity';
import { Post } from '../src/database/entities/post.entity';

const APP_DIR = path.resolve(__dirname, '..');
const CLI = path.resolve(APP_DIR, '../../packages/nest-seeder/dist/cli.js');
const CONFIG = path.resolve(__dirname, 'fixtures/e2e-seeder.config.ts');

const DB = path.join(
  os.tmpdir(),
  `nest-seeder-e2e-${process.pid}-${Math.floor(Math.random() * 1e6)}.sqlite`,
);

function runCli(args: string[]): string {
  return execFileSync('node', [CLI, '-c', CONFIG, ...args], {
    cwd: APP_DIR,
    encoding: 'utf8',
    env: { ...process.env, E2E_DB: DB },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function resetDb(): void {
  for (const f of [DB, `${DB}-journal`, `${DB}-wal`, `${DB}-shm`]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
}

async function withDb<T>(fn: (ds: DataSource) => Promise<T>): Promise<T> {
  const ds = new DataSource({
    type: 'sqlite',
    database: DB,
    entities: [User, Post],
  });
  await ds.initialize();
  try {
    return await fn(ds);
  } finally {
    await ds.destroy();
  }
}

const counts = () =>
  withDb(async (ds) => ({
    users: await ds.getRepository(User).count(),
    posts: await ds.getRepository(Post).count(),
  }));

describe('nest-seed CLI (e2e)', () => {
  beforeAll(() => {
    if (!fs.existsSync(CLI)) {
      throw new Error(
        `CLI not built at ${CLI}. Run "pnpm -C packages/nest-seeder build" first.`,
      );
    }
  });

  beforeEach(() => resetDb());
  afterAll(() => resetDb());

  jest.setTimeout(120_000);

  it('seeds users and posts, with every post linked to a user (regression)', async () => {
    runCli([]);

    const { users, posts } = await counts();
    expect(users).toBe(10);
    expect(posts).toBe(30);

    // The v1 bug: foreign-key overrides were dropped, leaving authorId null.
    await withDb(async (ds) => {
      const allPosts = await ds.getRepository(Post).find();
      const userIds = new Set(
        (await ds.getRepository(User).find()).map((u) => u.id),
      );
      for (const post of allPosts) {
        expect(post.authorId).toBeDefined();
        expect(userIds.has(post.authorId)).toBe(true);
      }
    });
  });

  it('--refresh is idempotent (drop in reverse, then reseed)', async () => {
    runCli(['--refresh']);
    runCli(['--refresh']);

    const { users, posts } = await counts();
    expect(users).toBe(10);
    expect(posts).toBe(30);
  });

  it('--dry-run writes nothing', async () => {
    const out = runCli(['--dry-run']);
    expect(out).toMatch(/dry run/i);

    const { users, posts } = await counts();
    expect(users).toBe(0);
    expect(posts).toBe(0);
  });

  it('--name runs only the selected seeder', async () => {
    runCli(['--name', 'users']);

    const { users, posts } = await counts();
    expect(users).toBe(10);
    expect(posts).toBe(0);
  });

  it('list reports the registered seeders', () => {
    const out = runCli(['list']).toLowerCase();
    expect(out).toContain('users');
    expect(out).toContain('posts');
  });

  it('exits non-zero on a missing config', () => {
    expect(() =>
      execFileSync('node', [CLI, '-c', 'does-not-exist.ts'], {
        cwd: APP_DIR,
        stdio: 'ignore',
      }),
    ).toThrow();
  });
});

describe('nest-seed init (e2e)', () => {
  const tmp = path.join(
    os.tmpdir(),
    `nest-seeder-init-${process.pid}-${Math.floor(Math.random() * 1e6)}`,
  );

  beforeAll(() => fs.mkdirSync(tmp, { recursive: true }));
  afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

  jest.setTimeout(60_000);

  it('scaffolds a config, factory and seeder', () => {
    execFileSync('node', [CLI, 'init'], { cwd: tmp, stdio: 'ignore' });

    expect(fs.existsSync(path.join(tmp, 'seeder.config.ts'))).toBe(true);
    expect(
      fs.existsSync(path.join(tmp, 'src/database/factories/user.factory.ts')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(tmp, 'src/database/seeders/user.seeder.ts')),
    ).toBe(true);
  });
});
