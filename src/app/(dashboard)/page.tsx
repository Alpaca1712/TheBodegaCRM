export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Welcome to TheBodegaCRM</h1>
      <div className="bg-white rounded-xl shadow p-8 max-w-2xl">
        <p className="text-slate-600 mb-4">
          This is your dashboard. Once the CRM modules are built, you'll see:
        </p>
        <ul className="list-disc list-inside text-slate-600 space-y-2">
          <li>Key performance indicators (KPIs)</li>
          <li>Recent activities and notifications</li>
          <li>Pipeline overview and deal metrics</li>
          <li>Upcoming tasks and events</li>
        </ul>
        <div className="mt-8 pt-6 border-t border-slate-200">
          <p className="text-slate-500 text-sm">
            Get started by exploring the navigation sidebar to manage your contacts, companies, deals, and activities.
          </p>
        </div>
      </div>
    </div>
  )
}
