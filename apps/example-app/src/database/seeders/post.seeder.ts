import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seeder, SeederName, SeederServiceOptions, DataFactory } from '@ackplus/nest-seeder';
import { Post } from '../entities/post.entity';
import { User } from '../entities/user.entity';
import { PostFactory } from '../factories/post.factory';

@Injectable()
@SeederName('posts')
export class PostSeeder implements Seeder {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seed(options: SeederServiceOptions): Promise<void> {
    console.log('🌱 Seeding posts...');

    // Get existing users
    const users = await this.userRepository.find();
    
    if (users.length === 0) {
      console.warn('⚠️  No users found. Please run UserSeeder first.');
      console.log('💡 Run: npm run seed -- --name UserSeeder');
      return;
    }

    // Check if posts already exist
    const existingCount = await this.postRepository.count();
    if (existingCount > 0 && !options.refresh) {
      console.log(`⏭️  ${existingCount} posts already exist, skipping...`);
      return;
    }

    const factory = DataFactory.createForClass(PostFactory);
    const postsPerUser = options.dummyData ? 5 : 3;
    let totalPosts = 0;

    // Generate posts for each user
    for (const user of users) {
      const posts = factory.generate(postsPerUser, {
        authorId: user.id,
      });

      await this.postRepository.save(posts);
      totalPosts += posts.length;
    }

    console.log(`✅ Successfully seeded ${totalPosts} posts for ${users.length} users`);
  }

  async drop(options: SeederServiceOptions): Promise<void> {
    console.log('🗑️  Dropping posts...');
    
    const count = await this.postRepository.count();
    if (count === 0) {
      console.log('  ℹ️  No posts to drop');
      return;
    }
    
    await this.postRepository.createQueryBuilder().delete().execute();
    console.log(`✅ Dropped ${count} posts`);
  }
}

