export interface Review {
  id: string;
  pointId: string;
  userId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ReviewFormData {
  rating: number;
  comment?: string;
}
