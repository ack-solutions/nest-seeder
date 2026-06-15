import { TypeOrmModule } from '@nestjs/typeorm';
import { defineSeederConfig } from '@ackplus/nest-seeder';

import { Widget, WidgetSeeder } from './widget';

export default defineSeederConfig({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.E2E_DB || 'union-e2e.sqlite',
      entities: [Widget],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([Widget]),
  ],
  seeders: [WidgetSeeder],
});
