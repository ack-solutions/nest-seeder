# Contributing to @ackplus/nest-seeder

Thank you for your interest in contributing to nest-seeder! We welcome contributions from the community.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Coding Guidelines](#coding-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

This project follows a standard code of conduct. Please be respectful and constructive in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/nest-seeder.git`
3. Add upstream remote: `git remote add upstream https://github.com/ackplus/nest-seeder.git`

## Development Setup

### Prerequisites

- Node.js 18+ or 20+
- pnpm 10.21.0+
- TypeScript 5.7+

### Installation

```bash
# Install pnpm if you haven't already
npm install -g pnpm@10.21.0

# Install dependencies
pnpm install

# Build the package
pnpm -C packages/nest-seeder build
```

## Making Changes

### Creating a Branch

Always create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or changes

### Development Workflow

1. Make your changes in the appropriate files
2. Build the package: `pnpm -C packages/nest-seeder build`
3. Test your changes
4. Lint your code: `pnpm -C packages/nest-seeder lint`
5. Format your code: `pnpm -C packages/nest-seeder format`

## Submitting Changes

### Before Submitting

- [ ] Code builds without errors
- [ ] All tests pass
- [ ] Linter passes
- [ ] Code is formatted
- [ ] Documentation is updated (if needed)
- [ ] Examples are updated (if needed)
- [ ] CHANGELOG.md is updated

### Creating a Pull Request

1. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Go to the original repository and create a Pull Request

3. Fill in the PR template with:
   - Description of changes
   - Related issue numbers
   - Type of change (feature, fix, etc.)
   - Testing performed
   - Screenshots (if applicable)

### Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Write clear, descriptive commit messages
- Update documentation for any changed functionality
- Add tests for new features
- Ensure all CI checks pass

## Coding Guidelines

### TypeScript Style

- Use TypeScript for all code
- Enable strict mode
- Use explicit types (avoid `any`)
- Use interfaces for public APIs
- Use type aliases for complex types

### Code Style

```typescript
// Good
export class DataFactory {
  static createForClass<T>(target: Type<T>): Factory {
    // Implementation
  }
}

// Use descriptive names
const userFactory = DataFactory.createForClass(UserFactory);
const users = userFactory.generate(10);

// Use async/await instead of promises
async seed(): Promise<void> {
  await this.repository.save(users);
}
```

### NestJS Conventions

- Use dependency injection
- Use decorators appropriately
- Follow NestJS module structure
- Use providers for services

### Comments

- Write comments for complex logic
- Use JSDoc for public APIs
- Keep comments up-to-date with code changes

```typescript
/**
 * Creates a factory for generating test data
 * @param target - The class to create a factory for
 * @returns Factory instance with generate method
 */
static createForClass<T>(target: Type<T>): Factory {
  // ...
}
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm -C packages/nest-seeder test

# Run tests in watch mode
pnpm -C packages/nest-seeder test:watch

# Run tests with coverage
pnpm -C packages/nest-seeder test:cov
```

### Writing Tests

- Write unit tests for new features
- Use descriptive test names
- Test edge cases
- Mock external dependencies

```typescript
describe('DataFactory', () => {
  describe('createForClass', () => {
    it('should create a factory for a class', () => {
      const factory = DataFactory.createForClass(UserFactory);
      expect(factory).toBeDefined();
    });

    it('should generate specified number of objects', () => {
      const factory = DataFactory.createForClass(UserFactory);
      const users = factory.generate(5);
      expect(users).toHaveLength(5);
    });
  });
});
```

## Documentation

### Updating Documentation

When making changes, update:

- **README.md** - Main documentation
- **QUICKSTART.md** - Quick start guide (if setup changes)
- **CHANGELOG.md** - Add entry for your changes
- **Examples** - Add or update examples if needed
- **API Comments** - Update JSDoc comments

### Documentation Style

- Use clear, concise language
- Include code examples
- Add emojis for better readability (sparingly)
- Use proper markdown formatting
- Test all code examples

### Example Structure

```markdown
## Feature Name

Brief description of the feature.

### Usage

\`\`\`typescript
// Example code
\`\`\`

### Options

- `option1` - Description
- `option2` - Description

### Example Output

\`\`\`
Output example
\`\`\`
```

## Commit Messages

Follow conventional commits format:

```
type(scope): subject

body

footer
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting)
- `refactor` - Code refactoring
- `test` - Test additions or changes
- `chore` - Build process or auxiliary tool changes

### Examples

```
feat(factory): add support for async generators

Added support for asynchronous data generation in factories.
This allows factories to fetch data from external sources.

Closes #123
```

```
fix(cli): resolve config file loading issue

Fixed an issue where TypeScript config files weren't being
loaded properly in the CLI tool.

Fixes #456
```

## Release Process

Releases are handled by maintainers:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag
4. Push tag to trigger GitHub Action
5. GitHub Action publishes to npm

## Questions?

If you have questions:
- Open an issue for discussion
- Check existing issues and PRs
- Review the documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to @ackplus/nest-seeder! 🙏

