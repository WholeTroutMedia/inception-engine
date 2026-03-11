import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ThemeSchema } from './schema.js';

export function generateSchema() {
    const schemaDir = join(__dirname, '../schemas');

    if (!existsSync(schemaDir)) {
        mkdirSync(schemaDir, { recursive: true });
    }

    const jsonSchema = zodToJsonSchema(ThemeSchema as any, 'InceptionTheme');

    writeFileSync(
        join(schemaDir, 'Theme.json'),
        JSON.stringify(jsonSchema, null, 2),
        'utf-8'
    );

    console.log('✅ Generated Theme.json schema at packages/theme-engine/schemas/Theme.json');
}

// Execute if run directly
if (require.main === module) {
    generateSchema();
}
