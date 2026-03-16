import { Review } from "@/types/review";

export const CATEGORIES = {
  battery: { label: "폐건전지", icon: "battery" },
  electronics: { label: "폐소형가전", icon: "electronics" },
  medicine: { label: "폐의약품", icon: "medicine" },
  fluorescent: { label: "폐형광등", icon: "fluorescent" },
  toner: { label: "폐토너", icon: "toner" },
  other: { label: "기타", icon: "other" },
} as const;

export type PointCategory = keyof typeof CATEGORIES;
export type PointStatus = "pending" | "active" | "reported" | "inactive";
export type PointListStatus = PointStatus | "visible";

export interface CollectionPoint {
  id: string;
  userId: string;
  title: string;
  category: PointCategory;
  description: string | null;
  lat: number;
  lng: number;
  address: string | null;
  status: PointStatus;
  avgRating: number;
  reviewCount: number;
  reportCount: number;
  verifiedAt: string | null;
  photoIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PointFormData {
  title: string;
  category: PointCategory;
  description?: string;
  lat: number;
  lng: number;
  address?: string;
  photoIds?: string[];
}

export interface PointQuery {
  category?: PointCategory;
  status?: PointListStatus;
  q?: string;
  swLat?: number;
  swLng?: number;
  neLat?: number;
  neLng?: number;
}

export interface PointDetail extends CollectionPoint {
  reviews: Review[];
}
