import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TemplatesService } from '../templates.service';
import { TemplatesController } from '../templates.controller';
import { CsvImportResponseDto } from '../dto';

describe('CSV Import', () => {
  let controller: TemplatesController;
  let service: TemplatesService;

  const mockTemplatesService = {
    importFromCsvFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplatesController],
      providers: [
        {
          provide: TemplatesService,
          useValue: mockTemplatesService,
        },
      ],
    }).compile();

    controller = module.get<TemplatesController>(TemplatesController);
    service = module.get<TemplatesService>(TemplatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('importFromCsvUpload', () => {
    const mockFile = {
      originalname: 'test.csv',
      mimetype: 'text/csv',
      buffer: Buffer.from('name,prompt,new_image\nCategory1,Test prompt,https://example.com/image.jpg'),
    } as Express.Multer.File;

    const mockBody = {
      type: 'photo' as const,
      mainCategoryName: 'Prototipal Halo',
    };

    it('should successfully import CSV file', async () => {
      const mockResult: CsvImportResponseDto = {
        imported: 1,
        categoriesCreated: 1,
        skipped: 0,
        errors: [],
        message: 'Successfully imported 1 templates into 1 categories',
      };

      mockTemplatesService.importFromCsvFile.mockResolvedValue(mockResult);

      const result = await controller.importFromCsvUpload(mockFile, mockBody);

      expect(result).toEqual(mockResult);
      expect(mockTemplatesService.importFromCsvFile).toHaveBeenCalledWith(
        mockFile.buffer.toString('utf-8'),
        {
          type: 'photo',
          mainCategoryName: 'Prototipal Halo',
        },
      );
    });

    it('should throw BadRequestException when no file is uploaded', async () => {
      await expect(controller.importFromCsvUpload(undefined as any, mockBody))
        .rejects.toThrow(new BadRequestException('No file uploaded'));
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const invalidFile = {
        ...mockFile,
        originalname: 'test.txt',
        mimetype: 'text/plain',
      } as Express.Multer.File;

      await expect(controller.importFromCsvUpload(invalidFile, mockBody))
        .rejects.toThrow(new BadRequestException('Invalid file type. Please upload a CSV file.'));
    });

    it('should handle service errors gracefully', async () => {
      mockTemplatesService.importFromCsvFile.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.importFromCsvUpload(mockFile, mockBody))
        .rejects.toThrow(new BadRequestException('Import failed: Database connection failed'));
    });
  });

  describe('CSV file validation', () => {
    it('should accept files with .csv extension', async () => {
      const csvFile = {
        originalname: 'data.csv',
        mimetype: 'application/vnd.ms-excel',
        buffer: Buffer.from('name,prompt,new_image\n'),
      } as Express.Multer.File;

      mockTemplatesService.importFromCsvFile.mockResolvedValue({
        imported: 0,
        categoriesCreated: 0,
        skipped: 0,
        errors: [],
        message: 'No valid rows found',
      });

      await expect(controller.importFromCsvUpload(csvFile, {
        type: 'photo',
        mainCategoryName: 'Test Category',
      })).resolves.toBeDefined();
    });

    it('should accept files with csv mimetype', async () => {
      const csvFile = {
        originalname: 'data.txt',
        mimetype: 'text/csv',
        buffer: Buffer.from('name,prompt,new_image\n'),
      } as Express.Multer.File;

      mockTemplatesService.importFromCsvFile.mockResolvedValue({
        imported: 0,
        categoriesCreated: 0,
        skipped: 0,
        errors: [],
        message: 'No valid rows found',
      });

      await expect(controller.importFromCsvUpload(csvFile, {
        type: 'photo',
        mainCategoryName: 'Test Category',
      })).resolves.toBeDefined();
    });
  });
});