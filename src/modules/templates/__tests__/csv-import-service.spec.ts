import { TemplatesService } from '../templates.service';
import { CategoriesService } from '../../categories/categories.service';
import { TemplatesRepository } from '../templates.repository';
import { Test, TestingModule } from '@nestjs/testing';
import { CsvImportResponseDto } from '../dto';

describe('TemplatesService - CSV Import', () => {
  let service: TemplatesService;
  let categoriesService: CategoriesService;
  let templatesRepository: TemplatesRepository;

  const mockMainCategory = {
    id: 'main-category-uuid',
    name: 'Prototipal Halo',
    type: 'photo' as const,
    created_at: new Date(),
    updated_at: new Date(),
    categories: [],
  };

  const mockCategory = {
    id: 'category-uuid',
    name: 'Abstract Art',
    type: 'photo' as const,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockCategoriesService = {
    findMainCategoryByName: jest.fn(),
    findOrCreateWithMainCategory: jest.fn(),
    findAll: jest.fn(),
  };

  const mockTemplatesRepository = {
    createMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
        {
          provide: TemplatesRepository,
          useValue: mockTemplatesRepository,
        },
      ],
    }).compile();

    service = module.get<TemplatesService>(TemplatesService);
    categoriesService = module.get<CategoriesService>(CategoriesService);
    templatesRepository = module.get<TemplatesRepository>(TemplatesRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('importFromCsvFile', () => {
    const validCsvContent = `name,prompt,new_image
Abstract Art,Create an abstract composition with vibrant colors,https://example.com/image1.jpg
Portrait Photo,Professional headshot with soft lighting,https://example.com/image2.jpg`;

    it('should successfully import valid CSV content', async () => {
      mockCategoriesService.findMainCategoryByName.mockResolvedValue(mockMainCategory);
      mockCategoriesService.findOrCreateWithMainCategory.mockResolvedValue(mockCategory);
      mockCategoriesService.findAll.mockResolvedValue({ data: [mockCategory] });
      mockTemplatesRepository.createMany.mockResolvedValue([]);

      const result: CsvImportResponseDto = await service.importFromCsvFile(validCsvContent, {
        type: 'photo',
        mainCategoryName: 'Prototipal Halo',
      });

      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.message).toContain('Successfully imported 2 templates');
      expect(mockCategoriesService.findMainCategoryByName).toHaveBeenCalledWith('Prototipal Halo');
      expect(mockTemplatesRepository.createMany).toHaveBeenCalled();
    });

    it('should handle missing main category', async () => {
      mockCategoriesService.findMainCategoryByName.mockResolvedValue(null);

      const result: CsvImportResponseDto = await service.importFromCsvFile(validCsvContent, {
        type: 'photo',
        mainCategoryName: 'Non-existent Category',
      });

      expect(result.imported).toBe(0);
      expect(result.errors).toContain("Main category 'Non-existent Category' not found. Please create it first.");
      expect(result.message).toBe('Import failed: Main category not found');
    });

    it('should handle empty CSV content', async () => {
      mockCategoriesService.findMainCategoryByName.mockResolvedValue(mockMainCategory);

      const result: CsvImportResponseDto = await service.importFromCsvFile('', {
        type: 'photo',
        mainCategoryName: 'Prototipal Halo',
      });

      expect(result.imported).toBe(0);
      expect(result.message).toBe('CSV file is empty or has no valid data');
    });

    it('should validate required fields', async () => {
      mockCategoriesService.findMainCategoryByName.mockResolvedValue(mockMainCategory);

      const invalidCsvContent = `name,prompt,new_image
,Missing category name,https://example.com/image1.jpg
Abstract Art,,https://example.com/image2.jpg
Portrait Photo,Valid prompt,`;

      const result: CsvImportResponseDto = await service.importFromCsvFile(invalidCsvContent, {
        type: 'photo',
        mainCategoryName: 'Prototipal Halo',
      });

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(3);
      expect(result.errors).toContain('Row 1: Missing category name');
      expect(result.errors).toContain('Row 2: Missing prompt');
      expect(result.errors).toContain('Row 3: Missing image URL');
    });

    it('should validate URL format', async () => {
      mockCategoriesService.findMainCategoryByName.mockResolvedValue(mockMainCategory);

      const invalidUrlCsvContent = `name,prompt,new_image
Abstract Art,Create abstract art,invalid-url
Portrait Photo,Take a photo,not-a-url-either`;

      const result: CsvImportResponseDto = await service.importFromCsvFile(invalidUrlCsvContent, {
        type: 'photo',
        mainCategoryName: 'Prototipal Halo',
      });

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(2);
      expect(result.errors).toContain('Row 1: Invalid image URL format');
      expect(result.errors).toContain('Row 2: Invalid image URL format');
    });

    it('should handle category creation errors gracefully', async () => {
      mockCategoriesService.findMainCategoryByName.mockResolvedValue(mockMainCategory);
      mockCategoriesService.findOrCreateWithMainCategory.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result: CsvImportResponseDto = await service.importFromCsvFile(validCsvContent, {
        type: 'photo',
        mainCategoryName: 'Prototipal Halo',
      });

      expect(result.imported).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Failed to create category');
    });

    it('should use default options when not provided', async () => {
      mockCategoriesService.findMainCategoryByName.mockResolvedValue(mockMainCategory);
      mockCategoriesService.findOrCreateWithMainCategory.mockResolvedValue(mockCategory);
      mockCategoriesService.findAll.mockResolvedValue({ data: [mockCategory] });
      mockTemplatesRepository.createMany.mockResolvedValue([]);

      const result: CsvImportResponseDto = await service.importFromCsvFile(validCsvContent);

      expect(mockCategoriesService.findMainCategoryByName).toHaveBeenCalledWith('Prototipal Halo');
      expect(mockCategoriesService.findOrCreateWithMainCategory).toHaveBeenCalledWith(
        expect.any(String),
        mockMainCategory.id,
        undefined,
        'photo'
      );
    });
  });
});