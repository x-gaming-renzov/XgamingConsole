import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Loader2, RefreshCw, Play, Shield, Sparkles, Info, StickyNote, Lightbulb, Megaphone, Flame } from "lucide-react";

interface PlaygroundSessionResponse {
  session_id: string;
  token: string;
  sdk_key: string;
  user_id: string;
  personalisation_id: string;
  expires_at: string;
  personalisation: PlaygroundPersonalisation;
}

interface PlaygroundPersonalisation {
  pid: string;
  name: string;
  description: string;
  experience_id: string;
  priority: number;
  rollout_percentage: number;
  rule_config: {
    conditions: PlaygroundCondition[];
  };
  is_active: boolean;
  experience_variants: PlaygroundExperienceVariant[];
  metrics?: any[];
  segment_rules?: any[];
}

interface PlaygroundCondition {
  field: string;
  operator: string;
  value: string;
  type?: string;
}

interface PlaygroundExperienceVariant {
  pid: string;
  target_percentage: number;
  experience_variant: {
    pid: string;
    name: string;
    description: string;
    is_default: boolean;
    last_updated_at?: string;
    feature_variants: PlaygroundFeatureVariant[];
  };
}

interface PlaygroundFeatureVariant {
  pid: string;
  experience_feature_id: string;
  name: string;
  config: Record<string, any>;
}

type ConfigType = "number" | "boolean" | "string";

type StepNoteProps = {
  step: string;
  title: string;
  description: string;
};

function StepNote({ step, title, description }: StepNoteProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm text-primary-foreground">
      <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <div className="flex items-start gap-3 pl-3">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary/20 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {step}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <StickyNote className="h-4 w-4" />
            <p className="font-medium">{title}</p>
          </div>
          <p className="text-xs text-primary/80">{description}</p>
        </div>
      </div>
    </div>
  );
}

type NoteStyleSampleProps = {
  label: string;
  description: string;
  children: ReactNode;
};

function NoteStyleSample({ label, description, children }: NoteStyleSampleProps) {
  return (
    <Card className="border-border/40 bg-card/80">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {children}
      </CardContent>
    </Card>
  );
}

const GAME_BASE_URL = "https://vampiresurvivor.pages.dev";

export default function PlaygroundPage() {
  const { toast } = useToast();
  const [session, setSession] = useState<PlaygroundSessionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [personalisation, setPersonalisation] = useState<PlaygroundPersonalisation | null>(null);
  const [countryDraft, setCountryDraft] = useState("");
  const [configDrafts, setConfigDrafts] = useState<Record<string, string>>({});
  const initialConfigTypesRef = useRef<Record<string, ConfigType>>({});

  const playgroundToken = session?.token ?? "";
  const authorizationHeader = useMemo(() => {
    if (!playgroundToken) return "";
    return playgroundToken.startsWith("Bearer ") ? playgroundToken : `Bearer ${playgroundToken}`;
  }, [playgroundToken]);

  const fetchPersonalisation = async (tokenHeader: string) => {
    const res = await fetch("/api/playground/personalisation", {
      method: "GET",
      headers: {
        Authorization: tokenHeader,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const details: PlaygroundPersonalisation = await res.json();
    setPersonalisation(details);
    return details;
  };

  const createSession = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/playground/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data: PlaygroundSessionResponse = await res.json();
      setSession(data);
      setPersonalisation(data.personalisation);

      const header = data.token.startsWith("Bearer ") ? data.token : `Bearer ${data.token}`;
      try {
        await fetchPersonalisation(header);
      } catch (error) {
        console.warn("Failed to load detailed playground personalisation", error);
      }
    } catch (error: any) {
      console.error("Failed to create playground session", error);
      toast({
        variant: "destructive",
        title: "Unable to start playground",
        description: error?.message || "Please try again in a moment.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    createSession();
  }, []);

  useEffect(() => {
    if (!personalisation) return;

    const drafts: Record<string, string> = {};
    const types: Record<string, ConfigType> = {};

    personalisation.experience_variants.forEach((variant) => {
      variant.experience_variant.feature_variants.forEach((featureVariant) => {
        Object.entries(featureVariant.config || {}).forEach(([key, value]) => {
          const mapKey = `${featureVariant.pid}:${key}`;
          drafts[mapKey] = formatValue(value);
          types[mapKey] = resolveConfigType(value);
        });
      });
    });

    initialConfigTypesRef.current = types;
    setConfigDrafts(drafts);

    const countryCondition = personalisation.rule_config?.conditions?.find(
      (condition) => condition.field?.toLowerCase() === "country"
    );
    setCountryDraft(countryCondition?.value ?? "");
  }, [personalisation]);

  const handleConfigChange = (featurePid: string, key: string, nextValue: string) => {
    const mapKey = `${featurePid}:${key}`;
    setConfigDrafts((prev) => ({
      ...prev,
      [mapKey]: nextValue,
    }));
  };

  const handleBooleanChange = (featurePid: string, key: string, nextValue: string) => {
    handleConfigChange(featurePid, key, nextValue);
  };

  const handleRefreshPersonalisation = async () => {
    if (!authorizationHeader) return;
    setRefreshing(true);
    try {
      await fetchPersonalisation(authorizationHeader);
      toast({ description: "Playground personalisation refreshed." });
    } catch (error: any) {
      console.error("Failed to refresh playground personalisation", error);
      toast({
        variant: "destructive",
        title: "Unable to refresh personalisation",
        description: error?.message || "Please try again.",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const gameUrl = useMemo(() => {
    if (!session?.sdk_key) return null;
    const url = new URL(GAME_BASE_URL);
    // url.searchParams.set("sdkkey", session.sdk_key);
    if (playgroundToken) {
      url.searchParams.set("sdkkey", playgroundToken.replace(/^Bearer\s+/i, ""));
    }
    // url.searchParams.set("session", session.session_id);
    return url.toString();
  }, [session, playgroundToken]);

  const isReady = !loading && personalisation;

  const handleSave = async () => {
    if (!personalisation || !authorizationHeader) return;

    setSaving(true);
    try {
      const updatedExperienceVariants = personalisation.experience_variants.map((variant) => {
        const updatedFeatureVariants = variant.experience_variant.feature_variants.map((featureVariant) => {
          const updatedConfig: Record<string, any> = {};
          Object.entries(featureVariant.config || {}).forEach(([configKey, originalValue]) => {
            const draftKey = `${featureVariant.pid}:${configKey}`;
            const draftValue = configDrafts.hasOwnProperty(draftKey)
              ? configDrafts[draftKey]
              : formatValue(originalValue);
            const detectedType = initialConfigTypesRef.current[draftKey] ?? resolveConfigType(originalValue);
            updatedConfig[configKey] = parseDraftValue(draftValue, detectedType, originalValue);
          });

          return {
            ...featureVariant,
            config: updatedConfig,
          };
        });

        return {
          ...variant,
          experience_variant: {
            ...variant.experience_variant,
            feature_variants: updatedFeatureVariants,
          },
        };
      });

      const baseConditions = personalisation.rule_config?.conditions?.filter(
        (condition) => condition.field?.toLowerCase() !== "country"
      ) ?? [];

      const trimmedCountry = countryDraft.trim();
      const updatedConditions: PlaygroundCondition[] = [...baseConditions];

      if (trimmedCountry) {
        const existingCountryCondition = personalisation.rule_config?.conditions?.find(
          (condition) => condition.field?.toLowerCase() === "country"
        );
        updatedConditions.push({
          field: "country",
          operator: existingCountryCondition?.operator ?? "equals",
          value: trimmedCountry,
          type: existingCountryCondition?.type ?? "text",
        });
      }

      const payload: PlaygroundPersonalisation = {
        ...personalisation,
        rule_config: {
          ...(personalisation.rule_config ?? { conditions: [] }),
          conditions: updatedConditions,
        },
        experience_variants: updatedExperienceVariants,
      };

      const res = await fetch("/api/playground/personalisation", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorizationHeader,
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const updated: PlaygroundPersonalisation = await res.json();
      setPersonalisation(updated);
      toast({ description: "Playground personalisation updated." });
    } catch (error: any) {
      console.error("Failed to update playground personalisation", error);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error?.message || "Please adjust values and try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const renderFeatureVariant = (variant: PlaygroundExperienceVariant) => {
    return variant.experience_variant.feature_variants.map((featureVariant) => (
      <Card key={`${variant.pid}-${featureVariant.pid}`} className="h-full border-border/30 bg-muted/20 shadow-none">
        <CardHeader className="space-y-2 p-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                {featureVariant.name}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Feature ID: {featureVariant.experience_feature_id}
              </CardDescription>
            </div>
            <Badge variant="outline">Variant</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-2">
          {Object.entries(featureVariant.config || {}).map(([configKey, originalValue]) => {
            const mapKey = `${featureVariant.pid}:${configKey}`;
            const detectedType = initialConfigTypesRef.current[mapKey] ?? resolveConfigType(originalValue);
            const value = configDrafts.hasOwnProperty(mapKey)
              ? configDrafts[mapKey]
              : formatValue(originalValue);

            return (
              <div key={configKey} className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  {configKey}
                </Label>
                {detectedType === "boolean" ? (
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant={value === "true" ? "default" : "outline"}
                      size="sm"
                      className="h-9 px-3 text-xs"
                      onClick={() => handleBooleanChange(featureVariant.pid, configKey, "true")}
                    >
                      True
                    </Button>
                    <Button
                      type="button"
                      variant={value === "false" ? "default" : "outline"}
                      size="sm"
                      className="h-9 px-3 text-xs"
                      onClick={() => handleBooleanChange(featureVariant.pid, configKey, "false")}
                    >
                      False
                    </Button>
                  </div>
                ) : (
                  <Input
                    type={detectedType === "number" ? "number" : "text"}
                    value={value}
                    onChange={(event) => handleConfigChange(featureVariant.pid, configKey, event.target.value)}
                    className="h-9 text-sm"
                  />
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Booting up your playground session…</p>
        </div>
      </div>
    );
  }

  if (!session || !personalisation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Playground unavailable</CardTitle>
            <CardDescription>
              We couldn't start a playground session right now. Please refresh the page to try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-end">
            <Button onClick={createSession}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 bg-background/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Nova Playground</p>
              <h1 className="text-xl font-semibold">Personalisation Sandbox</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={handleRefreshPersonalisation} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh data
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <Card className="border-border/40 bg-card">
          <CardHeader className="flex flex-row items-start justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Live playground session
              </div>
              <div>
                <CardTitle className="text-2xl font-semibold">{personalisation.name}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  {personalisation.description || "Explore Nova without signing up. Adjust the preset experience variant values and target country, then jump straight into the game."}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
              <span>Session expires at</span>
              <time className="font-medium text-foreground">
                {new Date(session.expires_at).toLocaleString()}
              </time>
              <code className="rounded bg-muted px-2 py-1 text-xs">{session.session_id}</code>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-3 rounded-md border border-border/40 bg-muted/30 p-4 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4" />
              <p>
                You&apos;re in a sandbox environment. Tweak the feature values below, optionally add a country condition, and then launch the sample game to see your adjustments live—no signup required.
              </p>
            </div>
          </CardContent>
        </Card>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Experience variants</h2>
              <p className="text-sm text-muted-foreground">
                Tune the feature values for each variant. Changes apply instantly after you save.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {personalisation.experience_variants.length} variant{personalisation.experience_variants.length === 1 ? "" : "s"} detected for this playground session.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <StepNote
              step="1"
              title="Change the personalisation values"
              description="Adjust the feature inputs for each experience variant as needed. All changes will be staged until you apply them."
            />

            {personalisation.experience_variants.map((variant, index) => (
              <Card key={`${variant.pid}-${index}`} className="border-border/40 bg-card">
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-xl font-semibold">
                      {variant.experience_variant.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      {variant.experience_variant.description || "No description provided."}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Rollout share</span>
                    <Badge variant="outline" className="border-primary/40 text-primary">
                      {variant.target_percentage}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {renderFeatureVariant(variant)}
                  </div>
                </CardContent>
              </Card>
            ))}
            {personalisation.experience_variants.length === 0 && (
              <Card className="border-border/40 bg-card">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No experience variants available for this playground session.
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <StepNote
            step="2"
            title="Optional: set a country condition"
            description="Specify a target country if you only want this personalisation to deploy to players in that location. Leave it blank to keep the rule global."
          />
          <Card className="border-border/40 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Targeting rules</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Country is the only editable rule for this playground session. Other targeting logic stays locked in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-w-lg">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Target country</Label>
              <Input
                placeholder="e.g. United States"
                value={countryDraft}
                onChange={(event) => setCountryDraft(event.target.value)}
                className="h-9 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Clear the field to remove the country rule. Hidden session targeting stays in place automatically.
              </p>
            </CardContent>
          </Card>
        </section>

        <Separator className="border-border/40" />

        <div className="space-y-6 py-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <StepNote
                step="3"
                title="Apply the personalisation"
                description="Click the apply button to push these staged variant values live to the playground session."
              />
              <Button
                type="button"
                variant="default"
                size="lg"
                onClick={handleSave}
                disabled={!isReady || saving}
                className="w-full md:w-auto"
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Apply personalisation
              </Button>
            </div>
            <div className="space-y-3">
              <StepNote
                step="4"
                title="Open the sample game"
                description="Launch or revisit the demo game to see the new values. Pro tip: if it was already open, hop back to the main menu to pull in the latest changes."
              />
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => {
                  if (!gameUrl) return;
                  window.open(gameUrl, "_blank", "noopener,noreferrer");
                  toast({ description: "Launching sample game in a new tab." });
                }}
                disabled={!gameUrl}
                className="w-full md:w-auto"
              >
                <Play className="mr-2 h-4 w-4" />
                Open the sample game
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Saving keeps the hidden session targeting intact. The playground session token will be sent to the game automatically so you can see your tweaks immediately.
          </p>
        </div>

        <Separator className="border-border/40" />

      </main>
    </div>
  );
}

function formatValue(value: any): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === null || value === undefined) return "";
  return String(value);
}

function resolveConfigType(value: any): ConfigType {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

function parseDraftValue(draft: string, type: ConfigType, fallback: any) {
  if (type === "number") {
    if (draft === "") return fallback;
    const parsed = Number(draft);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  if (type === "boolean") {
    return draft === "true";
  }
  return draft;
}
