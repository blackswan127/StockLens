import type { DcfNumericField } from '../dcfTypes.js';

export type FieldIdFactory = (name: string) => string;

export type DcfNumericSetter = (field: DcfNumericField, value: number) => void;

export interface ProvenanceData {
  source: string;
  fallbackApplied: boolean;
  timestamp?: string;
}
