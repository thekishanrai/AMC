export type Category = "trek" | "waterfall" | "camping" | "adventure" | "activity";

export interface Faq {
  question: string;
  answer: string;
}

export interface Spot {
  id: string;
  slug: string;
  name: string;
  category: Category;
  lat: number;
  lng: number;
  region: string | null;
  description: string | null;
  difficulty: string | null;
  altitude_m: number | null;
  duration_label: string | null;
  best_season: string | null;
  highlights: string[] | null;
  distance_from_mumbai_km: number | null;
  distance_from_pune_km: number | null;
  time_by_car_minutes: number | null;
  time_by_bike_minutes: number | null;
  how_to_reach: string | null;
  nearest_station: string | null;
  things_to_carry: string[] | null;
  safety_note: string | null;
  faqs: Faq[] | null;
  youtube_url: string | null;
  photos: string[] | null;
  status: string;
  // Visible credit for the cover photo (from spot_photos), when there is one.
  credit?: string | null;
}
