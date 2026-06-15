import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Entity, PrimaryGeneratedColumn, Column, Repository } from 'typeorm';
import { Factory, Seeder, SeederName, DataFactory } from '@ackplus/nest-seeder';

@Entity('widgets')
export class Widget {
  @PrimaryGeneratedColumn()
  id: number;

  // A string-literal-union column WITHOUT an explicit `type`. TypeORM infers the
  // column type from reflect-metadata's `design:type`. Under `strictNullChecks: false`
  // TypeScript emits `Object` here, so TypeORM throws DataTypeNotSupportedError.
  // This fixture guards that the CLI registers ts-node with strict mode so the
  // emitted type is `String`.
  @Column()
  visibility!: 'committee' | 'all-members';
}

export class WidgetFactory {
  @Factory((faker) =>
    faker.helpers.arrayElement(['committee', 'all-members']),
  )
  visibility!: 'committee' | 'all-members';
}

@Injectable()
@SeederName('widgets')
export class WidgetSeeder implements Seeder {
  constructor(
    @InjectRepository(Widget) private readonly repo: Repository<Widget>,
  ) {}

  async seed(): Promise<void> {
    // Reflect the metadata TypeScript emitted for the bare union column. With
    // the CLI's default strict ts-node registration this is `String`; with the
    // old `strict: false` default it was `Object` (which breaks Postgres/MySQL).
    // SQLite is too lenient to throw, so we assert the metadata explicitly.
    const designType = Reflect.getMetadata(
      'design:type',
      Widget.prototype,
      'visibility',
    );
    if (designType !== String) {
      throw new Error(
        `Regression: design:type for Widget.visibility is "${designType?.name}", expected "String". ` +
          'ts-node was registered without strict mode.',
      );
    }

    const widgets = DataFactory.createForClass(WidgetFactory).generate(3);
    await this.repo.save(widgets);
  }

  async drop(): Promise<void> {
    await this.repo.createQueryBuilder().delete().execute();
  }
}
