// seeder.config.ts — configuration for the `nest-seed` CLI
import { TypeOrmModule } from '@nestjs/typeorm';
import { defineSeederConfig } from '@ackplus/nest-seeder';

import { User } from './src/database/entities/user.entity';
import { Post } from './src/database/entities/post.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';
import { PostSeeder } from './src/database/seeders/post.seeder';

export default defineSeederConfig({
  imports: [
    // Database connection
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'database.sqlite',
      entities: [User, Post],
      synchronize: true,
      logging: false,
    }),

    // Entity repositories made available to seeders
    TypeOrmModule.forFeature([User, Post]),
  ],

  // Seeders run top-to-bottom; drops run in reverse for FK safety.
  seeders: [
    UserSeeder, // runs first
    PostSeeder, // runs second (depends on users)
  ],
});
