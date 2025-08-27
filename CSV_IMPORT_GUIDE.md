# CSV Import Endpoint Documentation

## Overview

The CSV import endpoint allows you to bulk import templates by uploading a CSV file. The endpoint automatically creates categories as needed and associates all templates with a specified main category.

## Endpoint Details

- **URL**: `POST /templates/import-csv-upload`
- **Authentication**: Static Token Auth required
- **Content-Type**: `multipart/form-data`

## Request Format

### Form Data Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `file` | File | Yes | - | CSV file to upload |
| `type` | String | No | 'photo' | Type for all imported templates ('photo' or 'video') |
| `mainCategoryName` | String | No | 'Prototipal Halo' | Main category name to associate all categories with |

### CSV File Format

The CSV file must contain the following columns:

| Column | Description | Example |
|--------|-------------|---------|
| `name` | Category name for the template | "Abstract Art" |
| `prompt` | Template prompt text | "Create an abstract composition with vibrant colors" |
| `new_image` | Image URL for the template | "https://example.com/images/abstract1.jpg" |

### Sample CSV Content

```csv
name,prompt,new_image
Abstract Art,Create an abstract composition with vibrant colors and flowing forms,https://example.com/images/abstract1.jpg
Portrait Photography,Professional headshot with soft lighting and neutral background,https://example.com/images/portrait1.jpg
Landscape Nature,Serene mountain landscape during golden hour with lake reflection,https://example.com/images/landscape1.jpg
Modern Architecture,Contemporary building with clean lines and glass facades,https://example.com/images/architecture1.jpg
Food Photography,Artisanal dish with elegant plating and warm lighting,https://example.com/images/food1.jpg
```

## Process Flow

The import process follows these steps:

1. **Validation**: Validates the uploaded file is a CSV
2. **Main Category Lookup**: Finds the specified main category (default: "Prototipal Halo")
3. **CSV Parsing**: Parses and validates all rows in the CSV file
4. **Category Creation**: Creates categories for unique names (avoids duplicates)
5. **Template Creation**: Creates templates and associates them with their categories
6. **Response**: Returns detailed results including success count and errors

## Response Format

```json
{
  "imported": 5,
  "categoriesCreated": 3,
  "skipped": 0,
  "errors": [],
  "message": "Successfully imported 5 templates into 3 categories"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `imported` | Number | Number of templates successfully created |
| `categoriesCreated` | Number | Number of new categories created |
| `skipped` | Number | Number of rows skipped due to errors |
| `errors` | String[] | Array of error messages for failed rows |
| `message` | String | Summary message of the import operation |

## Error Handling

The endpoint provides comprehensive error handling:

### File Validation Errors
- Missing file: "No file uploaded"
- Invalid file type: "Invalid file type. Please upload a CSV file."

### CSV Data Validation Errors
- Missing category name: "Row X: Missing category name"
- Missing prompt: "Row X: Missing prompt"  
- Missing image URL: "Row X: Missing image URL"
- Invalid image URL: "Row X: Invalid image URL format"

### Database Errors
- Main category not found: "Main category 'Name' not found. Please create it first."
- Category creation failed: "Failed to create category 'Name': error message"
- Template creation failed: "Failed to create templates: error message"

## Usage Examples

### cURL Example

```bash
curl -X POST \
  http://localhost:3000/templates/import-csv-upload \
  -H 'Authorization: Bearer YOUR_STATIC_TOKEN' \
  -F 'file=@sample-import.csv' \
  -F 'type=photo' \
  -F 'mainCategoryName=Prototipal Halo'
```

### JavaScript Fetch Example

```javascript
const formData = new FormData();
formData.append('file', csvFile);
formData.append('type', 'photo');
formData.append('mainCategoryName', 'Prototipal Halo');

const response = await fetch('/templates/import-csv-upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_STATIC_TOKEN'
  },
  body: formData
});

const result = await response.json();
console.log(result);
```

## Prerequisites

Before using the CSV import endpoint:

1. **Main Category Must Exist**: The specified main category (default: "Prototipal Halo") must exist in the database
2. **Authentication**: Valid static token must be provided
3. **Valid CSV Format**: CSV file must have the required columns with proper headers

## Performance Considerations

- Templates are created in batches of 100 to optimize performance
- Large CSV files are processed efficiently with streaming
- Duplicate category names are handled without creating duplicates
- Failed rows are skipped and reported in the response

## Best Practices

1. **Validate CSV Data**: Ensure all required fields are present and URLs are valid
2. **Check Main Category**: Verify the main category exists before importing
3. **Handle Partial Failures**: Review the `errors` array for any failed rows
4. **Monitor Performance**: For very large imports, consider breaking into smaller batches

## Related Endpoints

- `GET /categories` - List all categories
- `GET /templates` - List all templates
- `POST /templates` - Create individual template
- `DELETE /templates/clear` - Clear all templates (admin only)