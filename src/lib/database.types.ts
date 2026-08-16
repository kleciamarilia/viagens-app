export type TripStatus = "planned" | "active" | "done";
export type ActivityType = "atracao" | "experiencia" | "comida" | "transporte" | "tour_guiado" | "outro";
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

export interface Stay {
  id: string;
  trip_id: string;
  city: string;
  start_date: string;
  end_date: string;
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

export interface ActivityVoucher {
  id: string;
  activity_id: string;
  file_name: string;
  file_path: string;
  file_url: string;
  uploaded_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  category_id: string | null;
  activity_id: string | null;
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

