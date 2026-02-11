import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ClsServiceManager } from 'nestjs-cls';
import { registerTenantMiddleware } from './tenant.middleware';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to database');

    // Register tenant isolation middleware
    registerTenantMiddleware(this);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
