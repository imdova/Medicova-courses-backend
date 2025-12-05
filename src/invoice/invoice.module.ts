import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { AdditionalCharge } from './entities/additional-charge.entity';
import { User } from 'src/user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, InvoiceItem, AdditionalCharge, User])],
  controllers: [InvoiceController],
  providers: [InvoiceService],
})
export class InvoiceModule { }
