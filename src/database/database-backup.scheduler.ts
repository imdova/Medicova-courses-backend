import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseBackupService } from './database-backup.service';

@Injectable()
export class DatabaseBackupScheduler {
  private readonly logger = new Logger(DatabaseBackupScheduler.name);

  constructor(private readonly backupService: DatabaseBackupService) {}

  // Run backup every Sunday at 2:00 AM
  // Cron format: second minute hour day month dayOfWeek
  // 0 0 2 * * 0 means: at 2:00 AM every Sunday
  @Cron('0 0 2 * * 0', {
    name: 'weekly-database-backup',
    timeZone: 'UTC',
  })
  async handleWeeklyBackup() {
    this.logger.log('🔄 Starting scheduled weekly database backup...');
    
    try {
      const backupPath = await this.backupService.createBackup();
      this.logger.log(`✅ Scheduled backup completed: ${backupPath}`);
    } catch (error) {
      this.logger.error(`❌ Scheduled backup failed: ${error.message}`, error.stack);
    }
  }

  // Optional: Manual trigger method for testing
  async triggerManualBackup(): Promise<string> {
    this.logger.log('🔄 Triggering manual database backup...');
    return await this.backupService.createBackup();
  }
}

