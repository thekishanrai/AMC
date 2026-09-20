export type Category = "trek" | "waterfall" | "camping";

export interface Spot {
  id: string;
  name: string;
  category: Category;
  lat: number;
  lng: number;
  description: string | null;
  difficulty: string | null;
  best_season: string | null;
  distance_from_mumbai_km: number | null;
  distance_from_pune_km: number | null;
  time_by_car_minutes: number | null;
  time_by_bike_minutes: number | null;
  how_to_reach: string | null;
  photos: string[] | null;
  status: string;
}
