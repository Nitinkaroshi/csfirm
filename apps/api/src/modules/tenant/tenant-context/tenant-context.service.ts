import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class TenantContextService {
  constructor(private readonly cls: ClsService) {}

  setFirmId(firmId: string): void {
    this.cls.set('firmId', firmId);
  }

  getFirmId(): string | undefined {
    return this.cls.get('firmId');
  }

  getRequestId(): string | undefined {
    return this.cls.get('requestId');
  }

  setRequestId(requestId: string): void {
    this.cls.set('requestId', requestId);
  }
}
