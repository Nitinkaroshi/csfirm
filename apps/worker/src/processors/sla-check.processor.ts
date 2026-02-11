import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CaseStatus } from '@prisma/client';

@Processor('sla-check')
export class SlaCheckProcessor extends WorkerHost {
  private readonly logger = new Logger(SlaCheckProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job) {
    this.logger.log('Running SLA breach check...');

    const now = new Date();

    // Find cases that have exceeded their SLA deadline
    const breachedCases = await this.prisma.case.findMany({
      where: {
        status: { notIn: [CaseStatus.COMPLETED, CaseStatus.REJECTED, CaseStatus.DRAFT] },
        slaDeadline: { lt: now },
        internalFlags: { has: 'SLA_BREACHED' },
      },
      select: { id: true, caseNumber: true, firmId: true, slaDeadline: true },
    });

    // Find cases approaching SLA (within 24 hours)
    const warningThreshold = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const warningCases = await this.prisma.case.findMany({
      where: {
        status: { notIn: [CaseStatus.COMPLETED, CaseStatus.REJECTED, CaseStatus.DRAFT] },
        slaDeadline: { gt: now, lt: warningThreshold },
        NOT: { internalFlags: { has: 'SLA_WARNING' } },
      },
      select: { id: true, caseNumber: true, firmId: true, slaDeadline: true },
    });

    // Flag warning cases
    for (const c of warningCases) {
      await this.prisma.case.update({
        where: { id: c.id },
        data: { internalFlags: { push: 'SLA_WARNING' } },
      });
      this.logger.warn(`SLA warning: Case ${c.caseNumber} deadline approaching (${c.slaDeadline?.toISOString()})`);
    }

    this.logger.log(`SLA check complete. Breached: ${breachedCases.length}, Warnings: ${warningCases.length}`);
  }
}
