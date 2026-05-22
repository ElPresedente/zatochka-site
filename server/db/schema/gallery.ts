import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const gallerySections = pgTable('gallery_sections', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const galleryImages = pgTable('gallery_images', {
  id: serial('id').primaryKey(),
  sectionId: integer('section_id').notNull().references(() => gallerySections.id, { onDelete: 'cascade' }),
  src: text('src').notNull(),
  label: text('label').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
})

export const gallerySectionsRelations = relations(gallerySections, ({ many }) => ({
  images: many(galleryImages),
}))

export const galleryImagesRelations = relations(galleryImages, ({ one }) => ({
  section: one(gallerySections, {
    fields: [galleryImages.sectionId],
    references: [gallerySections.id],
  }),
}))
