import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AppSelector() {
  const { fetchOrgs, fetchApps, selectApp } = useAuth();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const o = await fetchOrgs();
        setOrgs(o);
        const a = await fetchApps();
        setApps(a);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [fetchOrgs, fetchApps]);

  if (loading) return <p>Loading organizations and apps...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Select an Application</h2>
      <div className="space-y-6">
        {orgs.map((org) => (
          <div key={org.id}>
            <h3 className="font-semibold">{org.name}</h3>
            <ul className="list-disc list-inside">
              {apps
                .filter((app) => app.org_pid === org.id)
                .map((app) => (
                  <li key={app.id}>
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => selectApp(app.pid)}
                    >
                      {app.name}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
