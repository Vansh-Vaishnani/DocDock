import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl bg-white p-10 shadow-lg ring-1 ring-slate-200">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-semibold">DocDock</h1>
              <p className="mt-4 max-w-2xl text-lg text-slate-600">
                Doctor-on-demand home consultation platform for patients, doctors, and admins.
              </p>
            </div>
            <Link href="/doctors" className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
              Explore doctors
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold">Patient</h2>
              <p className="mt-2 text-sm text-slate-600">Find nearby verified doctors, book appointments, and track visits live.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold">Doctor</h2>
              <p className="mt-2 text-sm text-slate-600">Manage availability, appointments, prescriptions, and earnings.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold">Admin</h2>
              <p className="mt-2 text-sm text-slate-600">Verify doctors and monitor platform health.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
