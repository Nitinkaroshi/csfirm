import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ServiceTemplateRepository } from './service-template.repository';
import { FormSchemaValidator } from './validators/form-schema.validator';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServiceTemplateService {
  constructor(
    private readonly serviceRepository: ServiceTemplateRepository,
    private readonly formSchemaValidator: FormSchemaValidator,
  ) {}

  async findById(id: string) {
    const service = await this.serviceRepository.findById(id);
    if (!service) throw new NotFoundException({ code: 'SERVICE_NOT_FOUND', message: 'Service template not found' });
    return service;
  }

  async findMany(firmId: string, query: { page?: number; limit?: number; search?: string; active?: boolean }) {
    const { page = 1, limit = 20, search, active } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ServiceTemplateWhereInput = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (active !== undefined) where.isActive = active;

    const result = await this.serviceRepository.findMany({ firmId, skip, take: limit, where });
    return {
      data: result.data,
      meta: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) },
    };
  }

  async findActiveByFirm(firmId: string) {
    return this.serviceRepository.findActiveByFirm(firmId);
  }

  async create(firmId: string, dto: CreateServiceDto) {
    if (dto.formSchema) {
      this.formSchemaValidator.validate(dto.formSchema);
    }

    const slug = dto.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    return this.serviceRepository.create({
      name: dto.name,
      slug,
      description: dto.description,
      category: dto.category,
      formSchema: (dto.formSchema as Prisma.InputJsonValue) || Prisma.JsonNull,
      documentRequirements: (dto.requiredDocuments as any) || [],
      slaConfig: (dto.slaConfig as Prisma.InputJsonValue) || Prisma.JsonNull,
      billingTemplate: dto.basePrice ? { basePrice: dto.basePrice } : undefined,
      version: 1,
      firm: { connect: { id: firmId } },
    });
  }

  async update(id: string, dto: UpdateServiceDto) {
    const existing = await this.findById(id);

    if (dto.formSchema) {
      this.formSchemaValidator.validate(dto.formSchema);
    }

    const shouldBumpVersion = dto.formSchema || dto.requiredDocuments;

    return this.serviceRepository.update(id, {
      ...(dto.name && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.category && { category: dto.category }),
      ...(dto.formSchema && { formSchema: dto.formSchema as Prisma.InputJsonValue }),
      ...(dto.requiredDocuments && { documentRequirements: dto.requiredDocuments }),
      ...(dto.slaConfig && { slaConfig: dto.slaConfig as Prisma.InputJsonValue }),
      ...(dto.basePrice !== undefined && { billingTemplate: { basePrice: dto.basePrice } }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(shouldBumpVersion && { version: existing.version + 1 }),
    });
  }

  async deactivate(id: string) {
    await this.findById(id);
    return this.serviceRepository.delete(id);
  }

  async duplicate(id: string, firmId: string) {
    const source = await this.findById(id);
    return this.serviceRepository.create({
      name: `${source.name} (Copy)`,
      slug: `${source.slug}-copy-${Date.now()}`,
      description: source.description,
      category: source.category,
      formSchema: (source.formSchema as Prisma.InputJsonValue) || Prisma.JsonNull,
      documentRequirements: source.documentRequirements as Prisma.InputJsonValue,
      slaConfig: (source.slaConfig as Prisma.InputJsonValue) || Prisma.JsonNull,
      billingTemplate: source.billingTemplate as Prisma.InputJsonValue,
      version: 1,
      firm: { connect: { id: firmId } },
    });
  }
}
