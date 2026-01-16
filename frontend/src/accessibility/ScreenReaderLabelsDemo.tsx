export function ScreenReaderLabelsDemo() {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Screen Reader Labels</h2>
        <p className="text-sm text-slate-600">
          Each field has a visible label, and icon buttons include accessible names.
        </p>
      </div>
      <form className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="sr-name">
            Full name
          </label>
          <input
            id="sr-name"
            type="text"
            placeholder="Ada Lovelace"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="sr-email">
            Work email
          </label>
          <input
            id="sr-email"
            type="email"
            placeholder="ada@example.com"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="sr-note">
            Notes
          </label>
          <textarea
            id="sr-note"
            rows={3}
            placeholder="Optional details"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
          >
            Submit form
          </button>
          <button
            type="button"
            aria-label="Clear form"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/60 focus-visible:ring-offset-2"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
