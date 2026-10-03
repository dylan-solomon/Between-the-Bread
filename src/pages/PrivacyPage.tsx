import type { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'
import { CONTACT_EMAIL, SITE_URL } from '@/data/site'

const LAST_UPDATED = 'October 3, 2026'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold text-neutral-900">{title}</h2>
      <div className="mt-3 space-y-3 text-neutral-700">{children}</div>
    </section>
  )
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="ml-5 list-disc space-y-2">
      {items.map((item, index) => <li key={index}>{item}</li>)}
    </ul>
  )
}

const contactLink = <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline">{CONTACT_EMAIL}</a>

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-12">
      <Helmet>
        <title>Privacy Policy | Between the Bread</title>
        <meta name="description" content="How Between the Bread collects, uses and protects your information." />
        <link rel="canonical" href={`${SITE_URL}/privacy`} />
      </Helmet>

      <h1 className="font-display text-3xl font-bold text-neutral-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-neutral-500">Last updated: {LAST_UPDATED}</p>

      <p className="mt-6 text-neutral-700">
        Between the Bread is a sandwich generator, encyclopedia and community. This policy explains what
        information we collect when you use the site, how we use it, what other people can see, and the
        choices you have. You can use most of the site without an account.
      </p>

      <Section title="Information you give us">
        <Bullets
          items={[
            <><strong>Account details.</strong> Your email address, password and username when you sign up. Your password is stored securely by our sign-in provider and we never see it.</>,
            <><strong>Profile and preferences.</strong> An optional display name and your settings, such as dietary filters, Smart Mode and cost view.</>,
            <><strong>Sandwiches you save.</strong> The sandwiches in your history, your favorites and the ratings you give them.</>,
            <><strong>Things you post.</strong> Ratings, comments, replies, likes and photos you add to sandwich pages and blog posts.</>,
            <><strong>Shared links.</strong> When you share a sandwich, we store the sandwich and the IP address it was shared from, so we can limit abuse.</>,
          ]}
        />
      </Section>

      <Section title="What is public">
        <p>
          Your username is public. It appears next to your comments, on your public profile page (which shows when you
          joined and how many comments you have made), and on community sandwiches you are the first to make. Your
          email address and display name are never shown to other people.
        </p>
        <p>
          Comments, replies, ratings and approved photos can be seen by anyone. Ratings are shown as averages, not
          tied to your name. Anyone with a shared sandwich link can open it.
        </p>
        <p>
          When you save or share a sandwich, its combination of ingredients can appear on our public community
          leaderboard, together with how many times it has been made. If you are the first person to make it, your
          username appears on it. Your saved history itself stays private.
        </p>
      </Section>

      <Section title="How we use information">
        <Bullets
          items={[
            'To run your account, keep you signed in and save your sandwiches and preferences.',
            'To show your comments, ratings and photos, and to build the community leaderboard.',
            'To moderate content and prevent spam and abuse.',
            'To understand how the site is used so we can fix problems and improve it.',
          ]}
        />
      </Section>

      <Section title="Analytics">
        <p>
          We use PostHog to understand how people use the site. It records things like the pages you visit, the
          features you use (for example rolling, saving or sharing a sandwich), your browser and device type, page
          speed, and an approximate location based on your IP address. If you are signed in, this is linked to your
          account and email address.
        </p>
        <p>
          For a small share of visits (about 1 in 100), PostHog also records how the page was used, such as scrolling
          and clicks, so we can spot problems. Passwords are never recorded.
        </p>
      </Section>

      <Section title="Cookies and browser storage">
        <p>
          We use your browser&apos;s local and session storage to keep you signed in, remember your recent sandwiches
          and current sandwich, and store an anonymous analytics ID. We do not use advertising cookies. If that changes,
          we will update this policy and ask for your consent where required.
        </p>
      </Section>

      <Section title="Who we share information with">
        <p>We do not sell your personal information. We share it only with the services that run the site for us:</p>
        <Bullets
          items={[
            <><strong>Supabase</strong> stores our database, accounts and uploaded photos.</>,
            <><strong>Vercel</strong> hosts the site and keeps short-term server logs, including IP addresses.</>,
            <><strong>PostHog</strong> provides the analytics described above.</>,
          ]}
        />
        <p>We may also share information if the law requires it, or to protect the safety of our users or the site.</p>
      </Section>

      <Section title="How long we keep information">
        <p>
          We keep your account information until you delete your account. Your history keeps your 50 most recent
          sandwiches plus any favorites. Shared sandwich links expire after 90 days. Community leaderboard entries are
          kept as part of the site, but your username is removed from them when you delete your account. Analytics data
          is kept according to PostHog&apos;s retention settings.
        </p>
      </Section>

      <Section title="Your choices">
        <Bullets
          items={[
            <>You can change your username, display name and preferences in <Link to="/account/settings" className="text-primary underline">Settings</Link>.</>,
            'You can delete your own comments at any time.',
            'You can delete your account in Settings. This removes your profile, saved sandwiches, ratings, comments and photos.',
            <>To ask for a copy of your information, or for help correcting or deleting it, email us at {contactLink}.</>,
          ]}
        />
      </Section>

      <Section title="Children">
        <p>
          Between the Bread is not meant for children under 13, and we do not knowingly collect information from them.
          If you believe a child has given us information, contact us and we will delete it.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If we change this policy, we will update the date at the top of this page. For significant changes, we will
          let signed-in users know on the site.
        </p>
      </Section>

      <Section title="Contact us">
        <p>Questions about this policy or your information? Email us at {contactLink}.</p>
      </Section>
    </div>
  )
}
