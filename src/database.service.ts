import { Injectable, OnModuleInit, OnModuleDestroy, BeforeApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy, BeforeApplicationShutdown {
    constructor(private readonly dataSource: DataSource) { }

    async onModuleInit() {
        if (this.dataSource.isInitialized) {
            console.log('✅ Connected to database');
        }
    }

    async beforeApplicationShutdown(signal?: string) {
        console.log(`App is shutting down due to: ${signal}`);
        await this.dataSource.destroy();
    }

    async onModuleDestroy() {
        console.log('Closing database connection (onModuleDestroy)...');
        await this.dataSource.destroy();
    }
}
