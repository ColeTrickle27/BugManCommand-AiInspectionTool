import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const inspections = sqliteTable("inspections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerName: text("customer_name").notNull(),
  customerAddress: text("customer_address").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  inspectorName: text("inspector_name").notNull(),
  inspectionDate: text("inspection_date").notNull(),
  structureType: text("structure_type").notNull(),
  constructionType: text("construction_type"),
  foundationType: text("foundation_type"),
  yearBuilt: text("year_built"),
  squareFootage: text("square_footage"),
  canvasData: text("canvas_data"),
  notes: text("notes"),
  findings: text("findings"),
  recommendations: text("recommendations"),
  quoteAmount: text("quote_amount"),
  quoteDetails: text("quote_details"),
  status: text("status").notNull().default("draft"),
  photos: text("photos"),
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertInspectionSchema = createInsertSchema(inspections).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type Inspection = typeof inspections.$inferSelect;
