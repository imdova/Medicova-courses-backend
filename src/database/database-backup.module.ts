import { Module } from '@nestjs/common';
import { DatabaseBackupService } from './database-backup.service';
import { DatabaseBackupScheduler } from './database-backup.scheduler';

@Module({
  providers: [DatabaseBackupService, DatabaseBackupScheduler],
  exports: [DatabaseBackupService],
})
export class DatabaseBackupModule {}
