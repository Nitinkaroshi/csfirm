import { Injectable, BadRequestException } from '@nestjs/common';

interface FormField {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'file' | 'textarea' | 'checkbox';
  label: string;
  required?: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    maxLength?: number;
  };
}

interface FormSchema {
  sections: {
    title: string;
    fields: FormField[];
  }[];
}

@Injectable()
export class FormSchemaValidator {
  validate(schema: unknown): FormSchema {
    if (!schema || typeof schema !== 'object') {
      throw new BadRequestException({ code: 'INVALID_FORM_SCHEMA', message: 'Form schema must be an object' });
    }

    const s = schema as Record<string, unknown>;
    if (!Array.isArray(s.sections)) {
      throw new BadRequestException({ code: 'INVALID_FORM_SCHEMA', message: 'Form schema must have sections array' });
    }

    for (const section of s.sections) {
      if (!section.title || typeof section.title !== 'string') {
        throw new BadRequestException({ code: 'INVALID_FORM_SCHEMA', message: 'Each section must have a title' });
      }
      if (!Array.isArray(section.fields)) {
        throw new BadRequestException({ code: 'INVALID_FORM_SCHEMA', message: 'Each section must have fields array' });
      }
      for (const field of section.fields) {
        this.validateField(field);
      }
    }

    return schema as FormSchema;
  }

  private validateField(field: unknown) {
    const f = field as Record<string, unknown>;
    if (!f.name || typeof f.name !== 'string') {
      throw new BadRequestException({ code: 'INVALID_FORM_FIELD', message: 'Each field must have a name' });
    }
    if (!f.type || typeof f.type !== 'string') {
      throw new BadRequestException({ code: 'INVALID_FORM_FIELD', message: `Field "${f.name}" must have a type` });
    }
    const validTypes = ['text', 'number', 'date', 'select', 'multiselect', 'file', 'textarea', 'checkbox'];
    if (!validTypes.includes(f.type as string)) {
      throw new BadRequestException({
        code: 'INVALID_FORM_FIELD',
        message: `Field "${f.name}" has invalid type "${f.type}". Valid: ${validTypes.join(', ')}`,
      });
    }
    if ((f.type === 'select' || f.type === 'multiselect') && !Array.isArray(f.options)) {
      throw new BadRequestException({
        code: 'INVALID_FORM_FIELD',
        message: `Field "${f.name}" of type "${f.type}" must have options array`,
      });
    }
  }

  validateFormData(data: Record<string, unknown>, schema: FormSchema): void {
    for (const section of schema.sections) {
      for (const field of section.fields) {
        const value = data[field.name];
        if (field.required && (value === undefined || value === null || value === '')) {
          throw new BadRequestException({
            code: 'FORM_VALIDATION_ERROR',
            message: `Field "${field.label}" is required`,
          });
        }
      }
    }
  }
}
