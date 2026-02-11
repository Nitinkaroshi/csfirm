import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

interface CandidateScore {
  employeeProfileId: string;
  userId: string;
  name: string;
  score: number;
  breakdown: {
    specialization: number;
    workload: number;
    recency: number;
    clientHistory: number;
  };
}

const WEIGHTS = {
  SPECIALIZATION: 0.4,
  WORKLOAD: 0.3,
  RECENCY: 0.15,
  CLIENT_HISTORY: 0.15,
} as const;

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async autoAssign(caseId: string, firmId: string): Promise<string | null> {
    // Distributed lock to prevent race conditions
    const lockKey = `assignment:lock:${caseId}`;
    const acquired = await this.redis.setNx(lockKey, '1');
    if (!acquired) {
      this.logger.warn(`Assignment lock already held for case ${caseId}`);
      return null;
    }
    await this.redis.expire(lockKey, 30);

    try {
      const caseData = await this.prisma.case.findFirst({
        where: { id: caseId },
        include: { service: true },
      });
      if (!caseData) return null;

      const candidates = await this.getEligibleCandidates(firmId, caseData.service.category);
      if (candidates.length === 0) {
        this.logger.warn(`No eligible candidates for case ${caseId}`);
        return null;
      }

      const scored = await this.scoreCandidates(candidates, caseData);

      // Sort by score descending, pick top
      scored.sort((a, b) => b.score - a.score);
      const winner = scored[0];

      await this.prisma.case.update({
        where: { id: caseId },
        data: { assignedToId: winner.employeeProfileId },
      });

      this.logger.log(`Case ${caseId} assigned to ${winner.name} (score: ${winner.score.toFixed(2)})`);
      return winner.employeeProfileId;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  private async getEligibleCandidates(firmId: string, category: string) {
    return this.prisma.employeeProfile.findMany({
      where: {
        firmId,
        isAvailable: true,
        specializations: { has: category },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  private async scoreCandidates(
    candidates: Array<{
      id: string;
      userId: string;
      maxCases: number;
      activeCases: number;
      specializations: string[];
      user: { id: string; firstName: string; lastName: string };
    }>,
    caseData: { service: { category: string }; orgId: string },
  ): Promise<CandidateScore[]> {
    const scored: CandidateScore[] = [];

    for (const candidate of candidates) {
      // 1. Specialization score (40%) — binary: has specialization or not
      const specScore = candidate.specializations.includes(caseData.service.category) ? 1 : 0;

      // 2. Workload score (30%) — inverse of load ratio
      const loadRatio = candidate.activeCases / candidate.maxCases;
      const workloadScore = Math.max(0, 1 - loadRatio);

      // 3. Recency score (15%) — time since last case assignment
      const lastCase = await this.prisma.case.findFirst({
        where: { assignedToId: candidate.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      const hoursSinceLastAssignment = lastCase
        ? (Date.now() - lastCase.createdAt.getTime()) / (1000 * 60 * 60)
        : 999;
      const recencyScore = Math.min(1, hoursSinceLastAssignment / 48); // Normalize to 48 hours

      // 4. Client history score (15%) — has worked with this org before
      let clientHistoryScore = 0;
      if (caseData.orgId) {
        const priorCases = await this.prisma.case.count({
          where: {
            assignedToId: candidate.id,
            orgId: caseData.orgId,
            status: 'COMPLETED',
          },
        });
        clientHistoryScore = Math.min(1, priorCases / 3); // Cap at 3 prior cases
      }

      const totalScore =
        specScore * WEIGHTS.SPECIALIZATION +
        workloadScore * WEIGHTS.WORKLOAD +
        recencyScore * WEIGHTS.RECENCY +
        clientHistoryScore * WEIGHTS.CLIENT_HISTORY;

      scored.push({
        employeeProfileId: candidate.id,
        userId: candidate.user.id,
        name: `${candidate.user.firstName} ${candidate.user.lastName}`,
        score: totalScore,
        breakdown: {
          specialization: specScore,
          workload: workloadScore,
          recency: recencyScore,
          clientHistory: clientHistoryScore,
        },
      });
    }

    return scored;
  }

  async manualAssign(caseId: string, employeeProfileId: string): Promise<void> {
    await this.prisma.case.update({
      where: { id: caseId },
      data: { assignedToId: employeeProfileId },
    });
  }
}
