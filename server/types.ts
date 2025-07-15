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

export interface SegmentListResponseItem {
  pid: string;
  name: string;
  description: string;
  rule_config: object;
  created_at: string;
  modified_at: string;
  experience_count: number;
}

export interface ExperienceSegment {
  pid: string;
  experience_id: string;
  name: string;
  status: string;
  target_percentage: number;
  created_at: string;
}

export interface SegmentDetailsResponse {
  pid: string;
  name: string;
  description: string;
  rule_config: object;
  created_at: string;
  modified_at: string;
  experience_segments: ExperienceSegment[];
  experience_count: number;
  active_experiences: number;
}
