import { Injectable, OnModuleDestroy, BeforeApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService implements OnModuleDestroy, BeforeApplicationShutdown {
    constructor(private readonly dataSource: DataSource) { }

    async beforeApplicationShutdown(signal?: string) {
        console.log(`App is shutting down due to: ${signal}`);
        await this.dataSource.destroy();
    }

    async onModuleDestroy() {
        console.log('Closing database connection (onModuleDestroy)...');
        await this.dataSource.destroy();
    }
}
