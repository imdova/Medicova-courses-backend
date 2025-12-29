import { DataSource } from 'typeorm';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync as fsExistsSync, mkdirSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

// Load environment variables from .env file
const envPath = resolve(__dirname, '..', '.env');
if (existsSync(envPath)) {
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        let value = trimmedLine.substring(equalIndex + 1).trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

async function backupDatabase() {
  const dbName = process.env.DB_NAME;
  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT || '5432';
  const dbUsername = process.env.DB_USERNAME;
  const dbPassword = process.env.DB_PASSWORD;

  if (!dbName || !dbHost || !dbUsername) {
    console.error('❌ Database configuration is missing. Please check DB_NAME, DB_HOST, and DB_USERNAME environment variables.');
    process.exit(1);
  }

  // Create backups directory
  const backupDir = join(process.cwd(), 'backups');
  if (!fsExistsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
    console.log(`Created backup directory: ${backupDir}`);
  }

  // Generate backup filename with timestamp
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, '');
  const backupFileName = `backup_${dbName}_${timestamp}.sql`;
  const backupFilePath = join(backupDir, backupFileName);

  try {
    console.log(`🔄 Starting database backup for: ${dbName}...`);

    // Set environment variables for pg_dump
    const useSSL = process.env.DB_SSL === 'true' || process.env.DB_SSL === undefined;
    const env = {
      ...process.env,
      PGPASSWORD: dbPassword,
      ...(useSSL ? { PGSSLMODE: 'require' } : {}),
    };

    // Build pg_dump command
    const pgDumpCommand = [
      'pg_dump',
      `-h ${dbHost}`,
      `-p ${dbPort}`,
      `-U ${dbUsername}`,
      `-d ${dbName}`,
      `-f ${backupFilePath}`,
      '--no-owner',
      '--no-acl',
    ].join(' ');

    // Execute pg_dump
    const { stdout, stderr } = await execAsync(pgDumpCommand, {
      env,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    if (stderr && !stderr.includes('NOTICE')) {
      console.warn(`⚠️  Backup warnings: ${stderr}`);
    }

    // Check if backup file was created
    if (!fsExistsSync(backupFilePath)) {
      throw new Error(`Backup file was not created at: ${backupFilePath}`);
    }

    // Get file size
    const { statSync } = await import('fs');
    const stats = statSync(backupFilePath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`✅ Database backup completed successfully!`);
    console.log(`   File: ${backupFileName}`);
    console.log(`   Size: ${fileSizeMB} MB`);
    console.log(`   Path: ${backupFilePath}`);

    process.exit(0);
  } catch (error) {
    console.error(`❌ Database backup failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

backupDatabase();

