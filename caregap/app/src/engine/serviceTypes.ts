import data from '../data/service_types.json';
import type { ServiceTypeDef, ServiceTypeId } from '../types';

export const SERVICE_TYPES = data.types as ServiceTypeDef[];
const byId = new Map(SERVICE_TYPES.map((t) => [t.id, t]));

export function serviceType(id: ServiceTypeId): ServiceTypeDef {
  const t = byId.get(id);
  if (!t) throw new Error(`알 수 없는 서비스 유형: ${id}`);
  return t;
}
