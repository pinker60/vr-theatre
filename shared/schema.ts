import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - includes auth, profile, and seller information
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  theater: text("theater"), // Optional theater name
  avatar: text("avatar"), // Base64 or URL
  isVerified: boolean("is_verified").default(false).notNull(),
  isSeller: boolean("is_seller").default(false).notNull(),
  stripeId: text("stripe_id"), // Stripe account ID for sellers
  preferences: jsonb("preferences").default('{}').notNull(), // User preferences as JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Contents table - VR theatre performances
export const contents = pgTable("contents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  duration: integer("duration").notNull(), // Duration in minutes
  tags: jsonb("tags").default('[]').notNull(), // Array of tags as JSON
  vrUrl: text("vr_url").notNull(), // URL to VR content
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  contents: many(contents),
}));

export const contentsRelations = relations(contents, ({ one }) => ({
  creator: one(users, {
    fields: [contents.createdBy],
    references: [users.id],
  }),
}));

// Insert schemas with validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
}).omit({
  id: true,
  createdAt: true,
});

export const insertContentSchema = createInsertSchema(contents, {
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  imageUrl: z.string().url("Invalid image URL"),
  duration: z.number().positive("Duration must be positive"),
  vrUrl: z.string().url("Invalid VR URL"),
}).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;
export type Content = typeof contents.$inferSelect;
