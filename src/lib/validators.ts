import { z } from "zod";

export const pointSchema = z.object({
  title: z.string().min(2).max(100),
  category: z.enum([
    "battery",
    "electronics",
    "medicine",
    "fluorescent",
    "toner",
    "other",
  ]),
  description: z.string().max(500).optional(),
  lat: z.number().min(33).max(43),
  lng: z.number().min(124).max(132),
  address: z.string().max(200).optional(),
  photoIds: z.array(z.uuid()).max(5).optional(),
});

export const pointPatchSchema = pointSchema.partial();

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(300).optional(),
});

export const reportSchema = z.object({
  type: z.enum([
    "incorrect_location",
    "no_longer_exists",
    "wrong_category",
    "spam",
    "inappropriate",
    "other",
  ]),
  reason: z.string().max(300).optional(),
});

export const suggestionSchema = z.object({
  category: z.enum([
    "battery",
    "electronics",
    "medicine",
    "fluorescent",
    "toner",
    "other",
  ]),
  address: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
});

export const adminReportDecisionSchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
});

export const adminSuggestionDecisionSchema = z.object({
  status: z.enum(["applied", "dismissed"]),
});
