import { DataSource } from 'typeorm';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

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

async function createDatabase() {
  const dbName = process.env.DB_NAME;
  const dbHost = process.env.DB_HOST;
  const dbPort = parseInt(process.env.DB_PORT || '5432');
  const dbUsername = process.env.DB_USERNAME;
  const dbPassword = process.env.DB_PASSWORD;

  if (!dbName) {
    console.error('DB_NAME is not set in .env file');
    process.exit(1);
  }

  console.log(`Creating database "${dbName}" on ${dbHost}...`);

  // Connect to default 'postgres' database
  const adminDataSource = new DataSource({
    type: 'postgres',
    host: dbHost,
    port: dbPort,
    username: dbUsername,
    password: dbPassword,
    database: 'postgres', // Connect to default database
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await adminDataSource.initialize();
    console.log('Connected to postgres database');

    // Check if database already exists
    const result = await adminDataSource.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName],
    );

    if (result.length === 0) {
      // Create the database
      await adminDataSource.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created successfully`);
    } else {
      console.log(`ℹ️  Database "${dbName}" already exists`);
    }

    await adminDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error(`❌ Failed to create database: ${error.message}`);
    await adminDataSource.destroy().catch(() => {});
    process.exit(1);
  }
}

createDatabase();

