import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

@Injectable()
export class DatabaseBackupService {
  private readonly logger = new Logger(DatabaseBackupService.name);
  private readonly backupDir: string;

  constructor() {
    // Create backups directory in the project root
    this.backupDir = join(process.cwd(), 'backups');
    if (!existsSync(this.backupDir)) {
      mkdirSync(this.backupDir, { recursive: true });
      this.logger.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  async createBackup(): Promise<string> {
    const dbName = process.env.DB_NAME;
    const dbHost = process.env.DB_HOST;
    const dbPort = process.env.DB_PORT || '5432';
    const dbUsername = process.env.DB_USERNAME;
    const dbPassword = process.env.DB_PASSWORD;

    if (!dbName || !dbHost || !dbUsername) {
      throw new Error('Database configuration is missing. Please check DB_NAME, DB_HOST, and DB_USERNAME environment variables.');
    }

    // Generate backup filename with timestamp
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/T/, '_')
      .replace(/:/g, '-')
      .replace(/\..+/, '');
    const backupFileName = `backup_${dbName}_${timestamp}.sql`;
    const backupFilePath = join(this.backupDir, backupFileName);

    try {
      this.logger.log(`Starting database backup for: ${dbName}`);

      // Set environment variables for pg_dump
      const useSSL = process.env.DB_SSL === 'true' || process.env.DB_SSL === undefined;
      const env = {
        ...process.env,
        PGPASSWORD: dbPassword,
        // Set SSL mode to require (allows self-signed certificates)
        ...(useSSL ? { PGSSLMODE: 'require' } : {}),
      };

      // Build pg_dump command
      // Using plain SQL format for maximum compatibility
      const pgDumpCommand = [
        'pg_dump',
        `-h ${dbHost}`,
        `-p ${dbPort}`,
        `-U ${dbUsername}`,
        `-d ${dbName}`,
        `-f ${backupFilePath}`,
        '--no-owner',
        '--no-acl',
        // Don't disable SSL if it's enabled
      ]
        .filter(Boolean)
        .join(' ');

      this.logger.debug(`Executing: ${pgDumpCommand.replace(/PGPASSWORD=[^;]+;?\s*/g, '')}`);

      // Execute pg_dump
      const { stdout, stderr } = await execAsync(pgDumpCommand, {
        env,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      if (stderr && !stderr.includes('NOTICE')) {
        // pg_dump writes notices to stderr, but they're usually not errors
        this.logger.warn(`Backup warnings: ${stderr}`);
      }

      if (stdout) {
        this.logger.debug(`Backup output: ${stdout}`);
      }

      // Check if backup file was created
      if (!existsSync(backupFilePath)) {
        throw new Error(`Backup file was not created at: ${backupFilePath}`);
      }

      // Get file size
      const { statSync } = await import('fs');
      const stats = statSync(backupFilePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      this.logger.log(
        `✅ Database backup completed successfully: ${backupFileName} (${fileSizeMB} MB)`,
      );

      // Optional: Clean up old backups (keep last 4 weeks = 4 backups)
      await this.cleanupOldBackups();

      return backupFilePath;
    } catch (error) {
      const errorMessage = error.message || '';
      
      // Check for version mismatch error
      if (errorMessage.includes('server version mismatch') || errorMessage.includes('pg_dump version')) {
        this.logger.error(
          `❌ Database backup failed: PostgreSQL version mismatch. ` +
          `Server version is newer than pg_dump client. ` +
          `Please install PostgreSQL 17 client tools or use Docker.`,
        );
        throw new Error(
          `PostgreSQL version mismatch: Server requires pg_dump 17.x or newer. ` +
          `Current pg_dump version is too old. Please install postgresql-client-17.`,
        );
      }
      
      this.logger.error(`❌ Database backup failed: ${errorMessage}`, error.stack);
      throw error;
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const { readdir, stat, unlink } = await import('fs/promises');
      const files = await readdir(this.backupDir);
      const backupFiles = files
        .filter((file) => file.startsWith('backup_') && file.endsWith('.sql'))
        .map((file) => ({
          name: file,
          path: join(this.backupDir, file),
        }));

      // Get file stats and sort by modification time (newest first)
      const filesWithStats = await Promise.all(
        backupFiles.map(async (file) => ({
          ...file,
          stats: await stat(file.path),
        })),
      );

      filesWithStats.sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Keep only the last 4 backups (4 weeks)
      const backupsToKeep = 4;
      if (filesWithStats.length > backupsToKeep) {
        const filesToDelete = filesWithStats.slice(backupsToKeep);
        for (const file of filesToDelete) {
          await unlink(file.path);
          this.logger.log(`🗑️  Deleted old backup: ${file.name}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup old backups: ${error.message}`);
    }
  }
}

