export interface PhysicalCountPeriod {
  id: string;
  counting_period_from_date: string;
  counting_period_to_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePhysicalCountPeriodDto {
  counting_period_from_date: string;
  counting_period_to_date: string;
  status: string;
}
