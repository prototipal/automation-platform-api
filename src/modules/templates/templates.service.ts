import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

import { Template } from './entities';
import { CreateTemplateDto, UpdateTemplateDto, QueryTemplateDto, TemplateResponseDto } from './dto';
import { TemplatesRepository, PaginatedResult } from './templates.repository';
import { CategoriesService } from '@/modules/categories';

export interface ImportResult {
  imported: number;
  errors: string[];
  skipped: number;
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    private readonly templatesRepository: TemplatesRepository,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(createTemplateDto: CreateTemplateDto): Promise<TemplateResponseDto> {
    try {
      const template = await this.templatesRepository.create(createTemplateDto);
      return plainToInstance(TemplateResponseDto, template);
    } catch (error) {
      this.logger.error(`Failed to create template: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to create template');
    }
  }

  async findAll(queryDto: QueryTemplateDto): Promise<PaginatedResult<TemplateResponseDto>> {
    const result = await this.templatesRepository.findAll(queryDto);
    
    return {
      ...result,
      data: result.data.map(template => plainToInstance(TemplateResponseDto, template)),
    };
  }

  async findOne(id: string): Promise<TemplateResponseDto> {
    const template = await this.templatesRepository.findById(id);
    
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    
    return plainToInstance(TemplateResponseDto, template);
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto): Promise<TemplateResponseDto> {
    const existingTemplate = await this.templatesRepository.findById(id);
    
    if (!existingTemplate) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    try {
      const updatedTemplate = await this.templatesRepository.update(id, updateTemplateDto);
      return plainToInstance(TemplateResponseDto, updatedTemplate);
    } catch (error) {
      this.logger.error(`Failed to update template ${id}: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to update template');
    }
  }

  async remove(id: string): Promise<void> {
    const template = await this.templatesRepository.findById(id);
    
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    const deleted = await this.templatesRepository.remove(id);
    
    if (!deleted) {
      throw new BadRequestException('Failed to delete template');
    }
  }

  async getStats(): Promise<{ total: number; byType: Record<string, number>; byCategory: Record<string, number> }> {
    const total = await this.templatesRepository.count();
    
    const allTemplates = await this.templatesRepository.findAll({ 
      page: 1, 
      limit: total || 1 
    });
    
    const byType = allTemplates.data.reduce((acc, template) => {
      acc[template.type] = (acc[template.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byCategory = allTemplates.data.reduce((acc, template) => {
      const categoryName = template.category?.name || 'Unknown';
      acc[categoryName] = (acc[categoryName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return { total, byType, byCategory };
  }

  async importFromCsv(filePath: string, forceType: 'photo' | 'video' = 'photo'): Promise<ImportResult> {
    this.logger.log(`Starting CSV import from: ${filePath}`);
    
    const result: ImportResult = {
      imported: 0,
      errors: [],
      skipped: 0,
    };

    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`CSV file not found: ${filePath}`);
      }

      // Read and parse CSV file
      const csvContent = fs.readFileSync(filePath, 'utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      this.logger.log(`Found ${records.length} records in CSV file`);

      const templatesToCreate: CreateTemplateDto[] = [];

      for (const [index, record] of records.entries()) {
        try {
          const csvRecord = record as Record<string, string>;
          
          const categoryName = csvRecord['Category Name']?.trim() || '';
          const categoryLink = csvRecord['Category Link']?.trim() || undefined;
          const imageUrl = csvRecord['Image URL']?.trim() || '';
          const prompt = csvRecord['Prompt']?.trim() || '';

          // Validate required fields
          if (!categoryName) {
            result.errors.push(`Row ${index + 1}: Missing category name`);
            result.skipped++;
            continue;
          }

          if (!imageUrl) {
            result.errors.push(`Row ${index + 1}: Missing image URL`);
            result.skipped++;
            continue;
          }

          if (!prompt) {
            result.errors.push(`Row ${index + 1}: Missing prompt`);
            result.skipped++;
            continue;
          }

          // Validate URL format (basic check)
          try {
            new URL(imageUrl);
          } catch {
            result.errors.push(`Row ${index + 1}: Invalid image URL format`);
            result.skipped++;
            continue;
          }

          // Find or create category
          const category = await this.categoriesService.findOrCreate(
            categoryName, 
            categoryLink, 
            forceType
          );

          // Create template DTO with category_id
          const templateDto: CreateTemplateDto = {
            category_id: category.id,
            image_url: imageUrl,
            prompt: prompt,
            type: forceType,
          };

          templatesToCreate.push(templateDto);
        } catch (error) {
          result.errors.push(`Row ${index + 1}: ${error.message}`);
          result.skipped++;
        }
      }

      // Bulk insert templates
      if (templatesToCreate.length > 0) {
        this.logger.log(`Inserting ${templatesToCreate.length} templates...`);
        
        // Insert in batches to avoid memory issues
        const batchSize = 100;
        for (let i = 0; i < templatesToCreate.length; i += batchSize) {
          const batch = templatesToCreate.slice(i, i + batchSize);
          await this.templatesRepository.createMany(batch);
          result.imported += batch.length;
        }
      }

      this.logger.log(`Import completed: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);
      return result;

    } catch (error) {
      this.logger.error(`CSV import failed: ${error.message}`, error.stack);
      result.errors.push(`Import failed: ${error.message}`);
      return result;
    }
  }

  async clearAllTemplates(): Promise<void> {
    this.logger.log('Clearing all templates...');
    await this.templatesRepository.deleteAll();
    this.logger.log('All templates cleared');
  }
}