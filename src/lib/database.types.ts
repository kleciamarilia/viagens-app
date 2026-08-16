export type TripStatus = "planned" | "active" | "done";
export type ActivityType = "atracao" | "experiencia" | "comida" | "transporte" | "outro";
export type ActivityStatus = "planejado" | "confirmado" | "concluido";

export interface Trip {
  id: string;
  name: string;
  destination: string | null;
  start_date: string;
  end_date: string;
  emoji: string;
  color: string;
  status: TripStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  emoji: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
}

export interface ItineraryDay {
  id: string;
  trip_id: string;
  day_number: number;
  date: string;
  city: string | null;
  lodging_name: string | null;
  lodging_link: string | null;
  transport: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  trip_id: string;
  itinerary_day_id: string | null;
  date: string;
  time: string | null;
  title: string;
  type: ActivityType;
  location: string | null;
  notes: string | null;
  status: ActivityStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  category_id: string | null;
  description: string;
  expense_date: string;
  amount: number;
  currency: string;
  amount_brl: number;
  payment_method: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

