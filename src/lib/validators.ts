import { z } from "zod";

export const pointSchema = z.object({
  title: z.string().trim().min(2).max(100),
  category: z.enum([
    "battery",
    "electronics",
    "medicine",
    "fluorescent",
    "toner",
    "other",
  ]),
  description: z.string().trim().max(500).optional(),
  lat: z.number().min(33).max(43),
  lng: z.number().min(124).max(132),
  address: z.string().trim().max(200).optional(),
  photoIds: z.array(z.uuid()).max(5).optional(),
}).strict();

export const pointPatchSchema = pointSchema.omit({ photoIds: true }).partial().refine(
  (value) => Object.keys(value).length > 0,
  "최소 한 개 이상의 수정 필드가 필요합니다.",
);

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(300).optional(),
}).strict();

export const reportSchema = z.object({
  type: z.enum([
    "incorrect_location",
    "no_longer_exists",
    "wrong_category",
    "spam",
    "inappropriate",
    "other",
  ]),
  reason: z.string().trim().max(300).optional(),
}).strict();

export const suggestionSchema = z.object({
  category: z.enum([
    "battery",
    "electronics",
    "medicine",
    "fluorescent",
    "toner",
    "other",
  ]),
  address: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
}).strict();

export const adminReportDecisionSchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
}).strict();

export const adminSuggestionDecisionSchema = z.object({
  status: z.enum(["applied", "dismissed"]),
}).strict();

export const verificationVoteSchema = z.object({
  value: z.enum(["accurate", "inaccurate"]),
}).strict();

export const adminVerificationDecisionSchema = z.object({
  status: z.enum(["pending", "verified", "inaccurate"]),
}).strict();

export const uploadIntentSchema = z.object({
  originalName: z.string().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sourceSize: z.number().int().min(1).max(50 * 1024 * 1024),
  storedSize: z.number().int().min(1).max(10 * 1024 * 1024),
}).strict();
