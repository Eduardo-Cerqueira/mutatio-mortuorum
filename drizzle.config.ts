import type { Config } from 'drizzle-kit'

export default {
  dialect: 'sqlite',
  schema: './src/main/utils/schema.ts',
  out: './resources/drizzle',
  strict: true
} satisfies Config
