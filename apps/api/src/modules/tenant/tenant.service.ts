import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { Firm, FirmStatus } from '@prisma/client';
import { CreateFirmDto } from './dto/create-firm.dto';
import { UpdateFirmDto } from './dto/update-firm.dto';

@Injectable()
export class TenantService {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(dto: CreateFirmDto): Promise<Firm> {
    return this.prisma.firm.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        domain: dto.domain,
        subscriptionPlan: dto.subscriptionPlan || 'trial',
        maxUsers: dto.maxUsers || 10,
        maxStorageGb: dto.maxStorageGb || 5,
        settings: dto.settings || {},
      },
    });
  }

  async findById(id: string): Promise<Firm> {
    const cacheKey = `firm:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const firm = await this.prisma.firm.findUnique({ where: { id } });
    if (!firm) {
      throw new NotFoundException({ code: 'FIRM_NOT_FOUND', message: 'Firm not found' });
    }

    await this.redis.set(cacheKey, JSON.stringify(firm), this.CACHE_TTL);
    return firm;
  }

  async findBySlug(slug: string): Promise<Firm> {
    const cacheKey = `firm:slug:${slug}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const firm = await this.prisma.firm.findUnique({ where: { slug } });
    if (!firm) {
      throw new NotFoundException({ code: 'FIRM_NOT_FOUND', message: 'Firm not found' });
    }

    await this.redis.set(cacheKey, JSON.stringify(firm), this.CACHE_TTL);
    return firm;
  }

  async update(id: string, dto: UpdateFirmDto): Promise<Firm> {
    const firm = await this.prisma.firm.update({
      where: { id },
      data: dto,
    });

    // Invalidate cache
    await this.redis.del(`firm:${id}`);
    await this.redis.del(`firm:slug:${firm.slug}`);

    return firm;
  }

  async updateStatus(id: string, status: FirmStatus): Promise<Firm> {
    const firm = await this.prisma.firm.update({
      where: { id },
      data: { status },
    });

    await this.redis.del(`firm:${id}`);
    await this.redis.del(`firm:slug:${firm.slug}`);

    return firm;
  }

  async updateSettings(id: string, settings: Record<string, any>): Promise<Firm> {
    const existing = await this.findById(id);
    const mergedSettings = { ...(existing.settings as object), ...settings };

    return this.update(id, { settings: mergedSettings } as any);
  }
}
