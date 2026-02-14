export interface TrendDataPointDto {
  date: string;
  count: number;
  category?: string;
}

export interface TrendFilterDto {
  startDate: string;
  endDate: string;
  siteId?: string;
}

export interface PointsDistributionDto {
  reasonCode: string;
  totalAmount: number;
  count: number;
}
