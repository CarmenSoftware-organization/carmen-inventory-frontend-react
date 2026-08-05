export interface PhysicalCountPeriod {
  id: string;
  counting_period_from_date: string;
  counting_period_to_date: string;
  status: string;
}

export interface CreatePhysicalCountPeriodDto {
  counting_period_from_date: string;
  counting_period_to_date: string;
  status: string;
}
