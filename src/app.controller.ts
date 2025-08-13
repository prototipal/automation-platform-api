import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): object {
    return {
      message: 'Automation Platform API',
      version: '1.0.0',
      docs: '/api/docs',
      health: '/api/health'
    };
  }
}
