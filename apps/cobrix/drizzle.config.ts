import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './drizzle/schema.drizzle.ts',
  out: './drizzle/migrations',
})
