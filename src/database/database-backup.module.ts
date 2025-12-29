import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseBackupService } from './database-backup.service';
import { DatabaseBackupScheduler } from './database-backup.scheduler';

@Module({
  imports: [ScheduleModule],
  providers: [DatabaseBackupService, DatabaseBackupScheduler],
  exports: [DatabaseBackupService],
})
export class DatabaseBackupModule {}
