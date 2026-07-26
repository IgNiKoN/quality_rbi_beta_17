/** Зона на плане — проценты 0…100 (как legacy ConstAcceptance). */
export type AcceptanceZoneV2 = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Оси / захватка — внутри zone jsonb (отдельной колонки в sql/002 нет). */
  room?: string | null;
};

/** Статусы заявки на приёмку v2. */
export type AcceptanceStatusV2 = 'pending' | 'rejected' | 'accepted';

/**
 * ConstructionAcceptanceV2 — поля ≈ таблица construction_acceptance_v2 (sql/002).
 * locationId = id узла floor из service.locations.
 */
export interface ConstructionAcceptanceV2 {
  id: string;
  companyId: string;
  locationId: string;
  zone: AcceptanceZoneV2 | null;
  template_key?: string | null;
  work_type?: string | null;
  volume?: string | null;
  requested_date?: string | null;
  requested_time?: string | null;
  contractorId?: string | null;
  status: AcceptanceStatusV2 | string;
  created_by?: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
  version?: number;
  syncStatus?: string;
  source?: string;
  _deleted?: boolean;
}

export const ACCEPTANCE_STATUSES_V2: AcceptanceStatusV2[] = ['pending', 'rejected', 'accepted'];
