#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PACKAGE_PATH = path.join(__dirname, '../packages/nest-seeder/package.json');
const PACKAGE_DIR = path.dirname(PACKAGE_PATH);

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

(async () => {
  try {
    console.log('🚀 Starting publish process...\n');

    // Read current package.json
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
    const currentVersion = packageJson.version;
    
    console.log(`📦 Current version: ${currentVersion}\n`);

    // Calculate preview versions for each type
    const versionParts = currentVersion.split('.').map(Number);
    const patchVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`;
    const minorVersion = `${versionParts[0]}.${versionParts[1] + 1}.0`;
    const majorVersion = `${versionParts[0] + 1}.0.0`;

    // Show version options
    console.log('📝 Select version bump type:\n');
    console.log(`   1) Patch  ${currentVersion} → ${patchVersion}  (Bug fixes, small changes)`);
    console.log(`   2) Minor  ${currentVersion} → ${minorVersion}  (New features, backward compatible)`);
    console.log(`   3) Major  ${currentVersion} → ${majorVersion}  (Breaking changes)\n`);

    // Get user selection
    const selection = await question('❓ Enter your choice (1-3): ');
    
    let versionType;
    let newVersion;
    
    switch(selection.trim()) {
      case '1':
        versionType = 'patch';
        newVersion = patchVersion;
        break;
      case '2':
        versionType = 'minor';
        newVersion = minorVersion;
        break;
      case '3':
        versionType = 'major';
        newVersion = majorVersion;
        break;
      default:
        console.error('❌ Invalid selection. Please choose 1, 2, or 3.');
        process.exit(1);
    }

    console.log(`\n✅ Selected: ${versionType.toUpperCase()}`);
    console.log(`🔄 New version will be: ${newVersion}\n`);

    // Check git status
    try {
      const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
      if (gitStatus.trim()) {
        console.log('⚠️  You have uncommitted changes:');
        console.log(gitStatus);
        const continueAnyway = await question('\n❓ Commit these changes before publishing? (Y/n): ');
        
        if (continueAnyway.toLowerCase() === 'n') {
          console.log('❌ Aborted. Please handle your changes first.');
          process.exit(0);
        }
        
        // Ask for commit message
        const commitMsg = await question('📝 Enter commit message (or press Enter for default): ');
        const message = commitMsg.trim() || 'chore: prepare for release';
        
        console.log('\n💾 Committing existing changes...');
        execSync('git add .', { stdio: 'inherit' });
        execSync(`git commit -m "${message}"`, { stdio: 'inherit' });
        console.log('✅ Changes committed\n');
      }
    } catch (error) {
      console.error('❌ Error: Not a git repository or git not available');
      process.exit(1);
    }

    // Check branch
    try {
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      if (!['main', 'master'].includes(currentBranch)) {
        console.log(`⚠️  Warning: You're on branch "${currentBranch}", not main/master.`);
        const answer = await question('❓ Continue anyway? (y/N): ');
        
        if (answer.toLowerCase() !== 'y') {
          console.log('❌ Aborted.');
          process.exit(0);
        }
      } else {
        console.log(`✅ On branch: ${currentBranch}`);
      }
    } catch (error) {
      console.log('⚠️  Could not determine current branch');
    }

    // Show summary
    console.log('\n📋 Summary:');
    console.log(`   Current version: ${currentVersion}`);
    console.log(`   New version:     ${newVersion}`);
    console.log(`   Tag:             v${newVersion}`);
    console.log(`   Update type:     ${versionType.toUpperCase()}`);
    console.log('\n🔄 Steps that will be performed:');
    console.log('   1. Build the package');
    console.log('   2. Update package.json version');
    console.log('   3. Commit the version change');
    console.log('   4. Create git tag');
    console.log('   5. Push to remote (triggers CI/CD)');
    console.log('   6. GitHub Action will publish to npm\n');

    const confirm = await question('❓ Continue with publish? (Y/n): ');
    
    if (confirm.toLowerCase() === 'n') {
      console.log('❌ Publish cancelled.');
      process.exit(0);
    }

    // Step 1: Build the package
    console.log('\n🔨 Building package...');
    try {
      execSync(`cd ${PACKAGE_DIR} && pnpm build`, { stdio: 'inherit' });
      console.log('✅ Package built successfully');
    } catch (error) {
      console.error('❌ Build failed!');
      console.error('💡 Fix build errors and try again');
      process.exit(1);
    }

    // Step 2: Update version in package.json
    console.log(`\n🔄 Updating version in package.json...`);
    
    // Update version using npm version command
    const updatedVersion = execSync(
      `cd ${PACKAGE_DIR} && npm version ${versionType} --no-git-tag-version`,
      { encoding: 'utf8' }
    ).trim();

    const versionNumber = updatedVersion.replace(/^v/, '');
    
    // Verify the version was updated correctly
    const updatedPackageJson = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
    if (updatedPackageJson.version !== versionNumber) {
      console.error('❌ Version mismatch in package.json!');
      process.exit(1);
    }
    
    console.log(`✅ Version updated to: ${versionNumber} in package.json`);

    // Step 3: Commit the version change
    console.log(`\n💾 Committing version change...`);
    
    const commitConfirm = await question(`❓ Commit version change to ${versionNumber}? (Y/n): `);
    
    if (commitConfirm.toLowerCase() === 'n') {
      console.log('❌ Aborted. Version updated but not committed.');
      console.log('💡 To revert: git checkout packages/nest-seeder/package.json');
      process.exit(0);
    }
    
    try {
      execSync(`git add ${PACKAGE_PATH}`, { stdio: 'inherit' });
      execSync(`git commit -m "chore: bump version to ${versionNumber}"`, { stdio: 'inherit' });
      console.log(`✅ Version change committed`);
    } catch (error) {
      console.error('❌ Error committing changes');
      process.exit(1);
    }

    // Step 4: Create git tag
    const tagName = `v${versionNumber}`;
    console.log(`\n🏷️  Creating git tag: ${tagName}`);
    
    const tagConfirm = await question(`❓ Create tag ${tagName}? (Y/n): `);
    
    if (tagConfirm.toLowerCase() === 'n') {
      console.log('❌ Aborted. Commit created but no tag.');
      process.exit(0);
    }
    
    try {
      execSync(`git tag ${tagName}`, { stdio: 'inherit' });
      console.log(`✅ Tag created: ${tagName}`);
    } catch (error) {
      console.error('❌ Error creating tag');
      console.log('💡 Tag may already exist. Delete it first:');
      console.log(`   git tag -d ${tagName}`);
      process.exit(1);
    }

    // Step 5: Push to remote
    const pushAnswer = await question('\n🚀 Push commit and tag to remote? This will trigger publish. (Y/n): ');

    if (pushAnswer.toLowerCase() === 'n') {
      console.log(`\n📝 Changes committed and tag created locally.`);
      console.log(`\n💡 To publish later, run:`);
      console.log(`   git push`);
      console.log(`   git push origin ${tagName}`);
      process.exit(0);
    }

    console.log(`\n📤 Pushing to remote...`);
    
    try {
      // Push commit
      execSync(`git push`, { stdio: 'inherit' });
      console.log(`✅ Commit pushed`);
      
      // Push tag
      execSync(`git push origin ${tagName}`, { stdio: 'inherit' });
      console.log(`✅ Tag pushed`);
      
      console.log(`\n🎉 Success! Version ${versionNumber} is being published.`);
      console.log(`\n📦 The GitHub Action will now:`);
      console.log(`   1. Checkout the code`);
      console.log(`   2. Build the package`);
      console.log(`   3. Run tests`);
      console.log(`   4. Publish to npm`);
      console.log(`\n👀 Watch the progress at:`);
      console.log(`   https://github.com/ackplus/nest-seeder/actions`);
      console.log(`\n📦 Package will be available at:`);
      console.log(`   https://www.npmjs.com/package/@ackplus/nest-seeder/v/${versionNumber}`);
      
    } catch (error) {
      console.error('❌ Error pushing to remote');
      console.log('\n💡 You can push manually:');
      console.log(`   git push`);
      console.log(`   git push origin ${tagName}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\n💡 Make sure you have:');
    console.error('   - No build errors');
    console.error('   - Git repository initialized');
    console.error('   - Proper permissions to commit and push');
    process.exit(1);
  }
})();
