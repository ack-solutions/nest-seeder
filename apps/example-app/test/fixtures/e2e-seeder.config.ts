// Config used by the end-to-end CLI tests. The database path is taken from the
// E2E_DB env var so each test run gets an isolated SQLite file.
import { TypeOrmModule } from '@nestjs/typeorm';
import { defineSeederConfig } from '@ackplus/nest-seeder';

import { User } from '../../src/database/entities/user.entity';
import { Post } from '../../src/database/entities/post.entity';
import { UserSeeder } from '../../src/database/seeders/user.seeder';
import { PostSeeder } from '../../src/database/seeders/post.seeder';

export default defineSeederConfig({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.E2E_DB || 'e2e-test.sqlite',
      entities: [User, Post],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([User, Post]),
  ],
  seeders: [UserSeeder, PostSeeder],
});
