export interface HassState {
  attributes: Record<string, unknown>;
  entity_id: string;
  last_changed: string;
  state: string;
}

export interface HassConfig extends Record<string, unknown> {
  components: string[];
  config_dir: string;
  elevation: number;
  latitude: number;
  location_name: string;
  longitude: number;
  time_zone: string;
  unit_system: Record<string, string>;
  version: string;
  whitelist_external_dirs: string[];
}

export interface HassHistory {
  attributes: Record<string, unknown>;
  entity_id: string;
  last_changed: string;
  last_updated: string;
  state: string;
}

export type HassMinimalHistory = Pick<HassHistory, "last_changed" | "state">;

export interface HassLogbook {
  context_user_id: string | null;
  domain: string;
  entity_id: string;
  message: string;
  name: string;
  when: string;
}
