import ConsoleLayout from "@/components/console-layout";

export default function OrganizationSettings() {
  return (
    <ConsoleLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <span>Settings</span>
            <span className="mx-2">/</span>
            <span className="text-foreground">Organization</span>
          </div>
          <h1 className="text-2xl font-semibold">Organization Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage organization-wide settings and members.
          </p>
        </div>
        <p>Coming soon...</p>
      </div>
    </ConsoleLayout>
  );
}
