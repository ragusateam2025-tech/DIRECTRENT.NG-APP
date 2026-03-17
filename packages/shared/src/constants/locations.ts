export interface LagosArea {
  name: string;
  lga: string;
  priority: number;
}

export const LAGOS_MAINLAND: LagosArea[] = [
  { name: 'Yaba', lga: 'Yaba', priority: 1 },
  { name: 'Surulere', lga: 'Surulere', priority: 1 },
  { name: 'Ikeja', lga: 'Ikeja', priority: 2 },
  { name: 'Ojodu', lga: 'Ojodu', priority: 2 },
  { name: 'Magodo', lga: 'Kosofe', priority: 3 },
  { name: 'Gbagada', lga: 'Kosofe', priority: 3 },
  { name: 'Maryland', lga: 'Kosofe', priority: 3 },
];

export const LAGOS_ISLAND: LagosArea[] = [
  { name: 'Lekki', lga: 'Eti-Osa', priority: 2 },
  { name: 'Ajah', lga: 'Eti-Osa', priority: 2 },
  { name: 'Victoria Island', lga: 'Eti-Osa', priority: 3 },
  { name: 'Ikoyi', lga: 'Eti-Osa', priority: 3 },
];

export const ALL_LAGOS_AREAS = [...LAGOS_MAINLAND, ...LAGOS_ISLAND];

export const RENT_RANGES = {
  mainland: { min: 300_000, max: 2_000_000, typical: 700_000 },
  island: { min: 900_000, max: 4_000_000, typical: 2_000_000 },
} as const;
