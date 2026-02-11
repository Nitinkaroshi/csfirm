import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { ClsModule } from 'nestjs-cls';
import { configurations } from './config';
import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './redis/redis.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { TenantModule } from './modules/tenant/tenant.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { ServiceTemplateModule } from './modules/service-template/service-template.module';
import { CaseModule } from './modules/case/case.module';
import { DocumentModule } from './modules/document/document.module';
import { ChatModule } from './modules/chat/chat.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AuditModule } from './modules/audit/audit.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: configurations,
      envFilePath: '../../.env',
    }),

    // AsyncLocalStorage for tenant context
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),

    // Event emitter for domain events
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),

    // BullMQ for async job processing
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
          password: config.get<string>('redis.password') || undefined,
          db: config.get<number>('redis.db'),
        },
      }),
    }),

    // Infrastructure modules
    PrismaModule,
    RedisModule,

    // Feature modules
    TenantModule,
    AuthModule,
    UserModule,
    OrganizationModule,
    ServiceTemplateModule,
    CaseModule,
    DocumentModule,
    ChatModule,
    InvoiceModule,
    NotificationModule,
    AuditModule,
    AnalyticsModule,
    ComplianceModule,
    PaymentModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, RequestLoggerMiddleware).forRoutes('*');
  }
}
