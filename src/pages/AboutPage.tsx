import AppShell from '@/components/AppShell'

export default function AboutPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[720px] px-4 py-12">
        <h1 className="font-display text-3xl font-bold text-neutral-900">About Between the Bread</h1>

        <p className="mt-6 text-neutral-600">
          Welcome to Between the Bread — where sandwich logic goes to retire.
        </p>

        <p className="mt-4 text-neutral-600">
          This website exists for one simple reason:
          <br />
          The world needs more unpredictable sandwiches.
        </p>

        <p className="mt-4 text-neutral-600">
          With one click, fate assembles your next creation.
          <br />
          Sometimes it&apos;s inspired.
          <br />
          Sometimes it&apos;s confusing.
          <br />
          Sometimes it legally qualifies as a cry for help.
        </p>

        <p className="mt-6 font-semibold text-neutral-800">We believe:</p>
        <ul className="mt-3 space-y-2 text-neutral-600">
          <li>Every ingredient deserves a moment between the bread</li>
          <li>No flavor combination should feel too safe</li>
          <li>Culinary destiny is better when randomized</li>
        </ul>

        <p className="mt-6 text-neutral-600">
          You might discover your new favorite lunch.
          <br />
          You might discover a sandwich that should never exist.
        </p>

        <p className="mt-4 text-neutral-600">Either way, it&apos;s happening.</p>

        <p className="mt-6 text-neutral-600">
          Between the Bread isn&apos;t about perfection. It&apos;s about possibility. It&apos;s about
          chaos. It&apos;s about asking, &ldquo;But what if we added pickles?&rdquo;
        </p>

        <p className="mt-6 text-neutral-600">
          Go ahead.
          <br />
          Generate boldly.
        </p>

        <p className="mt-6 font-display text-lg font-semibold text-neutral-800">
          The bread is waiting.
        </p>
      </div>
    </AppShell>
  )
}
