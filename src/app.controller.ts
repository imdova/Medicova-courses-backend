import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getStatus(): { message: string } {
    const PORT = process.env.PORT || 3000;
    return {
      message: `🚀 Medicova API running on port ${PORT}`,
    };
  }
}
