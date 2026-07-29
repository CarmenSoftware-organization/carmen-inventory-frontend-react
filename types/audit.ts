export interface AuditEntry {
  at: string;
  id: string;
  name: string;
}

export interface Audit {
  created?: AuditEntry;
  updated?: AuditEntry;
}
