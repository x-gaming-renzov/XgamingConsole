import ConsoleLayout from "@/components/console-layout";

export default function AppSettings() {
  return (
    <ConsoleLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <span>Settings</span>
            <span className="mx-2">/</span>
            <span className="text-foreground">App</span>
          </div>
          <h1 className="text-2xl font-semibold">App Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage app-specific settings and integrations.
          </p>
        </div>
        <p>Coming soon...</p>
      </div>
    </ConsoleLayout>
  );
}
