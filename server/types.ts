export interface FeatureFlagItem {
  pid: string;
  name: string;
  description: string;
  keys_config: Record<string, object>;
  default_variant: FlagVariant | null;
  is_active: boolean;
  created_at: string;
}

export type GetFeatureFlagsResponse = FeatureFlagItem[];

export interface FlagVariant {
  pid: string;
  name: string;
  config: Record<string, object>;
}

export interface GetFeatureFlagDetailsResponse {
  pid: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  variants: FlagVariant[];
  keys_config: Record<string, object>;
  default_variant: FlagVariant | null;
}
