export type OrmType = 'typeorm' | 'mongoose';

export interface ScaffoldFile {
    /** Path relative to the cwd. */
    path: string;
    contents: string;
}

const FACTORY = `import { Factory } from '@ackplus/nest-seeder';

export class UserFactory {
  @Factory((faker) => faker.person.firstName())
  firstName: string;

  @Factory((faker) => faker.person.lastName())
  lastName: string;

  @Factory((faker, ctx) => faker.internet.email({ firstName: ctx.firstName, lastName: ctx.lastName }).toLowerCase(), ['firstName', 'lastName'])
  email: string;

  @Factory((faker) => faker.helpers.arrayElement(['admin', 'user', 'guest']))
  role: string;
}
`;

const SEEDER_TYPEORM = `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seeder, SeederName, DataFactory } from '@ackplus/nest-seeder';

import { User } from '../entities/user.entity';
import { UserFactory } from '../factories/user.factory';

@Injectable()
@SeederName('users')
export class UserSeeder implements Seeder {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed(): Promise<void> {
    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(10);
    await this.userRepository.save(users);
  }

  async drop(): Promise<void> {
    await this.userRepository.delete({});
  }
}
`;

const SEEDER_MONGOOSE = `import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Seeder, SeederName, DataFactory } from '@ackplus/nest-seeder';

import { User } from '../schemas/user.schema';
import { UserFactory } from '../factories/user.factory';

@Injectable()
@SeederName('users')
export class UserSeeder implements Seeder {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async seed(): Promise<void> {
    const factory = DataFactory.createForClass(UserFactory);
    const users = factory.generate(10);
    await this.userModel.insertMany(users);
  }

  async drop(): Promise<void> {
    await this.userModel.deleteMany({});
  }
}
`;

const CONFIG_TYPEORM = `import { TypeOrmModule } from '@nestjs/typeorm';
import { defineSeederConfig } from '@ackplus/nest-seeder';

import { User } from './src/database/entities/user.entity';
import { UserSeeder } from './src/database/seeders/user.seeder';

export default defineSeederConfig({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_DATABASE ?? 'app',
      entities: [User],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([User]),
  ],
  seeders: [UserSeeder],
});
`;

const CONFIG_MONGOOSE = `import { MongooseModule } from '@nestjs/mongoose';
import { defineSeederConfig } from '@ackplus/nest-seeder';

import { User, UserSchema } from './src/database/schemas/user.schema';
import { UserSeeder } from './src/database/seeders/user.seeder';

export default defineSeederConfig({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI ?? 'mongodb://localhost/app'),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  seeders: [UserSeeder],
});
`;

/** Returns the files scaffolded by `nest-seed init` for the given ORM. */
export function scaffoldFiles(orm: OrmType): ScaffoldFile[] {
    return [
        { path: 'seeder.config.ts', contents: orm === 'mongoose' ? CONFIG_MONGOOSE : CONFIG_TYPEORM },
        { path: 'src/database/factories/user.factory.ts', contents: FACTORY },
        {
            path: 'src/database/seeders/user.seeder.ts',
            contents: orm === 'mongoose' ? SEEDER_MONGOOSE : SEEDER_TYPEORM,
        },
    ];
}
