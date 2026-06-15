import { Logger } from '@nestjs/common';

// Keep unit-test output focused on assertions, not seeder log lines.
Logger.overrideLogger(false);
