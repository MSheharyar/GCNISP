import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  RefreshCw, Clock, HandCoins, Receipt, Wallet, CalendarDays, FileText, Tv, UserCog, Percent,
  ArrowRight, Check, Loader2, Smartphone, Monitor, ChevronDown, ShieldCheck, Zap,
} from 'lucide-react';
import { api, type LeadPayload } from '../services/api';
import { useAuth } from '../services/auth';
import { LogoMark } from '../components/Logo';
import { cn } from '../components/ui/primitives';

const PRODUCT = 'GCN Suite';

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leadOpen, setLeadOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <LogoMark size={32} />
            <span className="text-[16px] font-bold tracking-tight text-slate-900">{PRODUCT}</span>
          </div>
          <nav className="hidden items-center gap-7 text-[13.5px] font-medium text-slate-600 md:flex">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how" className="hover:text-slate-900">How it works</a>
            <a href="#faq" className="hover:text-slate-900">FAQ</a>
          </nav>
          <div className="flex items-center gap-2.5">
            {user ? (
              <Link to="/dashboard" className="rounded-lg bg-brand-600 px-3.5 py-2 text-[13.5px] font-semibold text-white hover:bg-brand-700">
                Go to dashboard
              </Link>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="text-[13.5px] font-semibold text-slate-600 hover:text-slate-900">
                  Login
                </button>
                <button onClick={() => setLeadOpen(true)} className="rounded-lg bg-brand-600 px-3.5 py-2 text-[13.5px] font-semibold text-white hover:bg-brand-700">
                  Request access
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-slate-100 bg-ink-900 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: 'radial-gradient(700px circle at 25% 15%, #2f83f7, transparent)' }} />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
          <div>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] font-medium text-brand-100">
              <Zap size={13} /> Built for ISP &amp; cable operators
            </div>
            <h1 className="text-[34px] font-extrabold leading-[1.1] tracking-tight sm:text-[44px]">
              Run your internet &amp; cable business — without the Excel.
            </h1>
            <p className="mt-4 max-w-lg text-[15.5px] leading-relaxed text-slate-300">
              {PRODUCT} pulls recharges straight from your Connect &amp; Fiber Beam portals, chases recovery,
              collects payments, and sends receipts — on web and on your phone.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={() => setLeadOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-[14px] font-semibold text-white hover:bg-brand-700">
                Request access <ArrowRight size={16} />
              </button>
              <a href="#features" className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-5 py-3 text-[14px] font-semibold text-white hover:bg-white/10">
                See what it does
              </a>
            </div>
            <div className="mt-6 flex items-center gap-2 text-[12.5px] text-slate-400">
              <ShieldCheck size={15} /> Each dealer is a fully isolated, private workspace.
            </div>
          </div>

          {/* Product mockup — illustrative, mock numbers only */}
          <HeroMock />
        </div>
      </section>

      {/* ── Trust strip ─────────────────────────────────────────────────── */}
      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-5 text-[13px] font-medium text-slate-500">
          <span className="flex items-center gap-2"><RefreshCw size={15} className="text-brand-600" /> Connect portal sync</span>
          <span className="flex items-center gap-2"><RefreshCw size={15} className="text-brand-600" /> Fiber Beam sync</span>
          <span className="flex items-center gap-2"><Smartphone size={15} className="text-brand-600" /> Web &amp; mobile</span>
          <span className="flex items-center gap-2"><ShieldCheck size={15} className="text-brand-600" /> Private per dealer</span>
        </div>
      </section>

      {/* ── Problem → Solution ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <SectionHead kicker="Why operators switch" title="The three things that eat your day — solved." />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <ProblemCard problem="Subscribers scattered across Excel sheets" fix="One live customer list with balances, packages and status — searchable, on any device." />
          <ProblemCard problem="Reconciling portal recharges by hand every night" fix="Recharges import automatically from Connect &amp; Fiber Beam, matched to the right customer, with your margin tracked." />
          <ProblemCard problem="Chasing who hasn't paid" fix="A live recovery list of everyone overdue, one-tap collection, and instant receipts." />
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section id="features" className="border-y border-slate-100 bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <SectionHead kicker="Everything in one place" title="Built for how ISP resellers actually work." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <f.icon size={19} />
                </div>
                <h3 className="mt-3 text-[15px] font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1 text-[13.5px] leading-relaxed text-slate-500">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16">
        <SectionHead kicker="Getting started" title="Live in a day — we set you up." />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-xl border border-slate-200 p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-[15px] font-bold text-white">{i + 1}</div>
              <h3 className="mt-4 text-[15.5px] font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Web + Mobile ────────────────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-ink-900 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 md:grid-cols-2">
          <div>
            <h2 className="text-[26px] font-bold tracking-tight">Manage from the office, collect from the field.</h2>
            <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-slate-300">
              The full system runs in any browser. Your team collects payments, logs charges and shares receipts
              from the mobile app — with roles so operators and viewers only see what they should.
            </p>
            <div className="mt-6 flex gap-6 text-[13.5px] text-slate-300">
              <span className="flex items-center gap-2"><Monitor size={17} className="text-brand-300" /> Web dashboard</span>
              <span className="flex items-center gap-2"><Smartphone size={17} className="text-brand-300" /> Android app</span>
            </div>
          </div>
          <div className="flex justify-center gap-4">
            <div className="w-40 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <Monitor size={28} className="mx-auto text-brand-300" />
              <div className="mt-2 text-[13px] font-semibold">Office console</div>
              <div className="text-[11.5px] text-slate-400">Full control</div>
            </div>
            <div className="mt-6 w-40 rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <Smartphone size={28} className="mx-auto text-brand-300" />
              <div className="mt-2 text-[13px] font-semibold">Field app</div>
              <div className="text-[11.5px] text-slate-400">Collect anywhere</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-16">
        <SectionHead kicker="Questions" title="Good to know." center />
        <div className="mt-8 divide-y divide-slate-100 rounded-xl border border-slate-200">
          {FAQS.map((f) => (
            <Faq key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-brand-600">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 px-5 py-14 text-center text-white">
          <h2 className="text-[28px] font-bold tracking-tight">Ready to run your ISP without Excel?</h2>
          <p className="max-w-lg text-[15px] text-brand-100">
            Tell us about your setup and we'll get your private workspace ready.
          </p>
          <button onClick={() => setLeadOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-[14px] font-semibold text-brand-700 hover:bg-brand-50">
            Request access <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-ink-900 text-slate-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-[13px] sm:flex-row">
          <div className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <span className="font-semibold text-white">{PRODUCT}</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/login')} className="hover:text-white">Dealer login</button>
            <button onClick={() => setLeadOpen(true)} className="hover:text-white">Request access</button>
          </div>
          <div className="text-[12px]">© {new Date().getFullYear()} {PRODUCT}</div>
        </div>
      </footer>

      <LeadModal open={leadOpen} onClose={() => setLeadOpen(false)} />
    </div>
  );
}

// ── Content ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: RefreshCw, title: 'Automatic portal sync', body: 'Recharges pull nightly from Connect & Fiber Beam, matched to the right customer — no manual reconciliation.' },
  { icon: Clock, title: 'Charged-today feed', body: "See the day's recharges as they land, review the opening balance, and add them to the ledger in one tap." },
  { icon: HandCoins, title: 'Recovery list', body: 'Everyone overdue in one place, sorted by how many months behind — so nothing slips.' },
  { icon: Receipt, title: 'Payments & receipts', body: 'Log collections and send a clean receipt to the customer instantly.' },
  { icon: Percent, title: 'Margin tracking', body: 'Record your upstream cost against each package and see exactly what you keep.' },
  { icon: CalendarDays, title: 'Monthly register', body: 'A month-by-month view of who was charged, who paid, and what is outstanding.' },
  { icon: Wallet, title: 'Cash book & expenses', body: 'Track income and spend so you always know where the business stands.' },
  { icon: FileText, title: 'Invoices & quotations', body: 'Generate professional PDF invoices and custom quotations for new or existing customers.' },
  { icon: Tv, title: 'TV cable subscribers', body: 'Manage cable customers and their monthly fees alongside internet — one system.' },
  { icon: UserCog, title: 'Staff roles', body: 'Admin, operator and viewer roles so each team member sees only what they should.' },
];

const STEPS = [
  { title: 'We set up your workspace', body: 'You get a private, branded workspace and your approved admin login — ready to use.' },
  { title: 'Add your customers', body: "Enter your subscribers (or we help you import them) and connect your portal logins." },
  { title: 'Collect & let it sync', body: 'Recharges import automatically every night; you collect payments and watch recovery drop.' },
];

const FAQS = [
  { q: 'Which portals does it support?', a: 'Connect and Fiber Beam recharge imports are built in. If you use another company, you can enter your own packages and record data manually.' },
  { q: 'Do I own my data?', a: 'Yes. Your workspace is completely isolated — no other dealer can see it — and the data is yours.' },
  { q: 'Can I use my own packages and prices?', a: 'Absolutely. Set your own package names, speeds, customer prices and your upstream cost so your margin is tracked.' },
  { q: 'Can it be branded for my business?', a: 'Yes — your logo, name and primary colour are applied across the web app.' },
  { q: 'How long does onboarding take?', a: 'Usually a day. We create your workspace and admin login, then you start entering customers right away.' },
  { q: 'Is there a mobile app?', a: 'Yes, an Android app for collecting payments and logging charges in the field, alongside the web dashboard.' },
];

// ── Small components ────────────────────────────────────────────────────
function SectionHead({ kicker, title, center }: { kicker: string; title: string; center?: boolean }) {
  return (
    <div className={cn(center && 'text-center')}>
      <div className="text-[12.5px] font-semibold uppercase tracking-wider text-brand-600">{kicker}</div>
      <h2 className="mt-1.5 text-[26px] font-bold tracking-tight text-slate-900 sm:text-[30px]">{title}</h2>
    </div>
  );
}

function ProblemCard({ problem, fix }: { problem: string; fix: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="text-[13px] font-semibold text-rose-600">✕ {problem}</div>
      <div className="mt-3 flex gap-2 text-[13.5px] text-slate-600">
        <Check size={17} className="mt-0.5 shrink-0 text-emerald-500" />
        <span dangerouslySetInnerHTML={{ __html: fix }} />
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <span className="text-[14.5px] font-medium text-slate-800">{q}</span>
        <ChevronDown size={18} className={cn('shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="px-5 pb-4 text-[13.5px] leading-relaxed text-slate-500">{a}</div>}
    </div>
  );
}

function HeroMock() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
      <div className="rounded-xl bg-white p-4 text-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-[13px] font-semibold text-slate-700">Dashboard</div>
          <div className="text-[11px] text-slate-400">July 2026</div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { k: 'Collected today', v: 'Rs 48,600' },
            { k: 'This month', v: 'Rs 9.2 L' },
            { k: 'Overdue', v: '21' },
          ].map((t) => (
            <div key={t.k} className="rounded-lg bg-slate-50 p-2.5">
              <div className="text-[15px] font-bold text-slate-900">{t.v}</div>
              <div className="text-[10px] text-slate-400">{t.k}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-end gap-1.5">
          {[40, 62, 48, 75, 58, 88, 70].map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-brand-500/80" style={{ height: h }} />
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          {['Ali Traders · 50 MB', 'Bilal · 25 MB', 'Sana Net · 100 MB'].map((r) => (
            <div key={r} className="flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5 text-[11.5px]">
              <span className="text-slate-600">{r}</span>
              <span className="font-semibold text-emerald-600">Paid</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Lead form ───────────────────────────────────────────────────────────
const EMPTY: LeadPayload = { name: '', businessName: '', phone: '', city: '', subscribers: '', portals: '', message: '' };

function LeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<LeadPayload>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const set = (k: keyof LeadPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await api.submitLead({ ...form, name: form.name.trim(), phone: form.phone.trim() });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    onClose();
    setTimeout(() => {
      setForm(EMPTY);
      setDone(false);
      setError('');
    }, 200);
  };

  const input = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-[15px] font-semibold text-slate-800">Request access</h3>
          <button onClick={close} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">✕</button>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={24} />
            </div>
            <div className="mt-3 text-[15px] font-semibold text-slate-800">Thanks — we've got it.</div>
            <p className="mx-auto mt-1 max-w-xs text-[13px] text-slate-500">
              We'll reach out shortly to set up your workspace.
            </p>
            <button onClick={close} className="mt-5 rounded-lg bg-brand-600 px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-brand-700">
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 px-5 py-4">
            <div className="grid grid-cols-2 gap-2.5">
              <input className={input} placeholder="Your name *" value={form.name} onChange={set('name')} />
              <input className={input} placeholder="Phone / WhatsApp *" value={form.phone} onChange={set('phone')} />
            </div>
            <input className={input} placeholder="Business name" value={form.businessName} onChange={set('businessName')} />
            <div className="grid grid-cols-2 gap-2.5">
              <input className={input} placeholder="City" value={form.city} onChange={set('city')} />
              <select className={input} value={form.subscribers} onChange={set('subscribers')}>
                <option value="">Subscribers…</option>
                <option>Under 100</option>
                <option>100–300</option>
                <option>300–500</option>
                <option>500–1000</option>
                <option>1000+</option>
              </select>
            </div>
            <input className={input} placeholder="Which portal(s)? e.g. Connect, Fiber Beam" value={form.portals} onChange={set('portals')} />
            <textarea className={cn(input, 'min-h-[60px] resize-y')} placeholder="Anything else? (optional)" value={form.message} onChange={set('message')} />

            {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</div>}

            <button
              onClick={submit}
              disabled={saving || !form.name.trim() || !form.phone.trim()}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />} Send request
            </button>
            <p className="text-center text-[11.5px] text-slate-400">No spam — we'll only contact you about setup.</p>
          </div>
        )}
      </div>
    </div>
  );
}
