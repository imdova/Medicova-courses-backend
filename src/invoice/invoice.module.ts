import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { User } from 'src/user/entities/user.entity';
import { Course } from 'src/course/entities/course.entity';
import { Bundle } from 'src/bundle/entities/bundle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, InvoiceItem, User, Course, Bundle])],
  controllers: [InvoiceController],
  providers: [InvoiceService],
})
export class InvoiceModule { }
