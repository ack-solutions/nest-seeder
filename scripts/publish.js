#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PACKAGE_PATH = path.join(__dirname, '../packages/nest-seeder/package.json');

// Helper function to ask questions
function question(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// Get version type from command line argument
const versionType = process.argv[2];

if (!versionType || !['patch', 'minor', 'major'].includes(versionType)) {
  console.error('❌ Error: Please provide a valid version type (patch, minor, or major)');
  console.log('\nUsage: npm run publish:patch | npm run publish:minor | npm run publish:major');
  console.log('   or: node scripts/publish.js <patch|minor|major>');
  process.exit(1);
}

(async () => {
  try {
    // Read current package.json
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
    const currentVersion = packageJson.version;
    
    console.log(`📦 Current version: ${currentVersion}`);
    console.log(`🔄 Updating ${versionType} version...\n`);

    // Update version using npm version command
    const newVersion = execSync(
      `cd ${path.dirname(PACKAGE_PATH)} && npm version ${versionType} --no-git-tag-version`,
      { encoding: 'utf8' }
    ).trim();

    // Extract just the version number (npm version outputs "v1.0.0")
    const versionNumber = newVersion.replace(/^v/, '');
    
    console.log(`✅ Version updated to: ${versionNumber}`);

    // Check if git repo is clean
    try {
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
      if (gitStatus.trim()) {
        console.log('\n⚠️  Warning: You have uncommitted changes.');
        console.log('   Consider committing them before publishing.\n');
      }
    } catch (error) {
      console.error('❌ Error: Not a git repository or git not available');
      process.exit(1);
    }

    // Check if we're on main/master branch
    try {
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      if (!['main', 'master'].includes(currentBranch)) {
        console.log(`⚠️  Warning: You're on branch "${currentBranch}", not main/master.`);
        const answer = await question('Continue anyway? (y/N): ');
        
        if (answer.toLowerCase() !== 'y') {
          console.log('❌ Aborted.');
          process.exit(0);
        }
      }
    } catch (error) {
      // If git branch check fails, continue anyway
    }

    // Create git tag
    const tagName = `v${versionNumber}`;
    console.log(`\n🏷️  Creating git tag: ${tagName}`);
    
    execSync(`git tag ${tagName}`, { stdio: 'inherit' });
    console.log(`✅ Tag created: ${tagName}`);

    // Ask if user wants to push
    const pushAnswer = await question('\n🚀 Push tag to remote? This will trigger the publish workflow. (Y/n): ');

    if (pushAnswer.toLowerCase() !== 'n') {
      console.log(`\n📤 Pushing tag ${tagName} to remote...`);
      execSync(`git push origin ${tagName}`, { stdio: 'inherit' });
      console.log(`\n✅ Tag pushed successfully!`);
      console.log(`\n🎉 The GitHub Action will now publish version ${versionNumber} to npm.`);
    } else {
      console.log(`\n📝 Tag ${tagName} created locally. Push it manually when ready:`);
      console.log(`   git push origin ${tagName}`);
    }

    // Commit the version change
    console.log(`\n💾 Committing version change...`);
    execSync(`git add ${PACKAGE_PATH}`, { stdio: 'inherit' });
    execSync(`git commit -m "chore: bump version to ${versionNumber}"`, { stdio: 'inherit' });
    console.log(`✅ Version change committed.`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
