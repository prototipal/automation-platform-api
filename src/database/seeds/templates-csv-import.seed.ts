import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

import { Template } from '@/modules/templates/entities';

const logger = new Logger('TemplatesCsvImportSeed');

export class TemplatesCsvImportSeed {
  public async run(dataSource: DataSource): Promise<void> {
    logger.log('Starting templates CSV import seed...');

    const csvFilePath = '/Users/mustafakendiguzel/Downloads/latest - Sheet1 (1).csv';
    
    try {
      // Check if file exists
      if (!fs.existsSync(csvFilePath)) {
        throw new Error(`CSV file not found: ${csvFilePath}`);
      }

      // Read and parse CSV file
      logger.log('Reading CSV file...');
      const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      logger.log(`Found ${records.length} records in CSV file`);

      const templateRepository = dataSource.getRepository(Template);
      
      // Clear existing templates
      logger.log('Clearing existing templates...');
      await templateRepository.query('TRUNCATE TABLE templates');

      const templatesToCreate: any[] = [];
      let skipped = 0;
      const errors: string[] = [];

      for (const [index, record] of records.entries()) {
        try {
          const csvRecord = record as Record<string, string>;
          
          // Map CSV columns to template data
          const templateData = {
            category_name: csvRecord['Category Name']?.trim() || '',
            category_link: csvRecord['Category Link']?.trim() || null,
            image_url: csvRecord['Image URL']?.trim() || '',
            prompt: csvRecord['Prompt']?.trim() || '',
            type: 'photo' as const, // Force all to photo type as requested
          };

          // Validate required fields
          if (!templateData.category_name) {
            errors.push(`Row ${index + 1}: Missing category name`);
            skipped++;
            continue;
          }

          if (!templateData.image_url) {
            errors.push(`Row ${index + 1}: Missing image URL`);
            skipped++;
            continue;
          }

          if (!templateData.prompt) {
            errors.push(`Row ${index + 1}: Missing prompt`);
            skipped++;
            continue;
          }

          // Validate URL format (basic check)
          try {
            new URL(templateData.image_url);
          } catch {
            errors.push(`Row ${index + 1}: Invalid image URL format`);
            skipped++;
            continue;
          }

          templatesToCreate.push(templateData);
        } catch (error) {
          errors.push(`Row ${index + 1}: ${error.message}`);
          skipped++;
        }
      }

      // Bulk insert templates
      if (templatesToCreate.length > 0) {
        logger.log(`Inserting ${templatesToCreate.length} templates...`);
        
        // Insert in batches to avoid memory issues
        const batchSize = 100;
        let imported = 0;
        
        for (let i = 0; i < templatesToCreate.length; i += batchSize) {
          const batch = templatesToCreate.slice(i, i + batchSize);
          const templates = templateRepository.create(batch);
          await templateRepository.save(templates);
          imported += batch.length;
          logger.log(`Imported batch ${Math.floor(i / batchSize) + 1}: ${batch.length} templates`);
        }

        logger.log(`Import completed successfully!`);
        logger.log(`- Total imported: ${imported}`);
        logger.log(`- Skipped: ${skipped}`);
        logger.log(`- Errors: ${errors.length}`);
        
        if (errors.length > 0) {
          logger.warn('Errors encountered:');
          errors.slice(0, 10).forEach(error => logger.warn(`  ${error}`));
          if (errors.length > 10) {
            logger.warn(`  ... and ${errors.length - 10} more errors`);
          }
        }
      } else {
        logger.warn('No valid templates to import');
      }

    } catch (error) {
      logger.error(`CSV import failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}