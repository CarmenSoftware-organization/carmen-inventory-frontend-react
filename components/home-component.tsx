
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bed,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  ClipboardList,
  Coffee,
  FileText,
  Globe,
  Hotel,
  Layers,
  Package,
  Plug,
  Sparkles,
  Store,
  Users,
  Utensils,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CarmenLogo } from "@/components/icons/carmen-logo";
import { cn } from "@/lib/utils";

/* ── Static data ── */

const modules = [
  {
    icon: ClipboardList,
    title: "Procurement",
    desc: "Purchase requests for kitchen, bar, housekeeping and engineering — with approval routing, POs, goods receipts and credit notes in one workflow.",
    iconBg: "bg-module-procurement/10",
    iconColor: "text-module-procurement",
  },
  {
    icon: Package,
    title: "F&B Inventory",
    desc: "Real-time stock across kitchens, bars, minibars and dry stores — with par-level alerts, recipe costing and period-end reconciliation.",
    iconBg: "bg-module-inventory/10",
    iconColor: "text-module-inventory",
  },
  {
    icon: Users,
    title: "Vendor Management",
    desc: "Supplier directory, price-list comparison and RFP workflows — get the best price for produce, dairy, beverages and amenities.",
    iconBg: "bg-module-vendor/10",
    iconColor: "text-module-vendor",
  },
  {
    icon: Store,
    title: "Store Operations",
    desc: "Inter-outlet requisitions, replenishment and wastage reporting — keep every kitchen, banquet and minibar running smoothly.",
    iconBg: "bg-module-store/10",
    iconColor: "text-module-store",
  },
];

const moreFeatures = [
  {
    icon: BarChart3,
    title: "F&B cost analytics",
    desc: "Food cost %, beverage cost %, slow-moving items and waste by outlet — actionable insights for chefs and F&B managers.",
    iconColor: "text-module-report",
  },
  {
    icon: ChefHat,
    title: "Recipe & menu costing",
    desc: "Build recipes from inventory items, calculate plate cost in real time, and reprice menus when ingredient costs shift.",
    iconColor: "text-module-admin",
  },
  {
    icon: Zap,
    title: "Par-level & low-stock alerts",
    desc: "SMS, email or in-app notifications when minibars, linens or kitchen supplies dip below reorder point.",
    iconColor: "text-info",
  },
  {
    icon: Globe,
    title: "Multi-property",
    desc: "Run a single workspace across every property in your group — chains, resorts, boutique hotels and serviced apartments.",
    iconColor: "text-module-operation",
  },
  {
    icon: FileText,
    title: "Audit-ready reports",
    desc: "Period-end stock counts, variance reports and cost-of-sales — exportable to PDF, Excel or your accounting system.",
    iconColor: "text-module-config",
  },
  {
    icon: Layers,
    title: "PMS / POS integration",
    desc: "Connects with Opera, Cloudbeds, Micros, Toast and other hotel platforms via REST API. Stock decrements as guests order.",
    iconColor: "text-module-product",
  },
];

const integrations = [
  { name: "Opera PMS", icon: Bed },
  { name: "Cloudbeds", icon: Hotel },
  { name: "Micros POS", icon: Utensils },
  { name: "Toast POS", icon: Coffee },
  { name: "QuickBooks", icon: BarChart3 },
  { name: "Custom API", icon: Plug },
];

const faqs = [
  {
    q: "How long does setup take?",
    a: "Most properties go live in 2–4 weeks. Single-property hotels can be operational within a week using our setup wizard. Multi-property chains typically need 4–6 weeks for data migration and staff training.",
  },
  {
    q: "Does Carmen integrate with our PMS or POS?",
    a: "Yes — we have native connectors for Opera, Cloudbeds, Mews, Micros, Toast, Square and most major hospitality platforms. For other systems, our REST API enables custom integration in days.",
  },
  {
    q: "Can multiple properties share the same vendor list?",
    a: "Absolutely. Maintain a global vendor directory at the chain level, then override pricing or terms per property. Price-list templates can be issued to multiple vendors simultaneously.",
  },
  {
    q: "How does Carmen handle recipe costing?",
    a: "Recipes link directly to inventory items. As ingredient costs change (via new vendor pricing or POs), plate costs update automatically. Chefs can see real-time food cost % per dish.",
  },
  {
    q: "Is staff training included?",
    a: "Yes. Onboarding includes role-based training for chefs, F&B managers, purchasing officers and storekeepers. Most teams reach proficiency within the first week.",
  },
  {
    q: "What about data security and compliance?",
    a: "We're SOC 2 Type II audited, with GDPR-compliant data handling, role-based access control, and full audit logs. Hotel financial data stays in your region of choice.",
  },
];

const steps = [
  {
    num: 1,
    title: "Configure your property",
    desc: "Set up outlets, kitchens, bars, stores and minibar locations. Import your vendor directory. Our wizard handles the heavy lifting.",
  },
  {
    num: 2,
    title: "Connect PMS, POS and accounting",
    desc: "Link Opera, Cloudbeds, Micros, Toast and your accounting suite via API. Stock decrements as guests order.",
  },
  {
    num: 3,
    title: "Train your team",
    desc: "Role-based training for executive chefs, F&B managers, purchasing officers and storekeepers. Most teams ramp up in a week.",
  },
  {
    num: 4,
    title: "Go live",
    desc: "Roll out real-time inventory tracking across every kitchen, banquet and outlet — with full audit trails from day one.",
  },
];

const OVERVIEW_STATS = [
  { label: "F&B SKUs", val: "2,847", barClass: "w-[78%] bg-info/55" },
  { label: "Below par", val: "23", barClass: "w-[12%] bg-warning/55" },
  { label: "POs in transit", val: "156", barClass: "w-[52%] bg-success/55" },
];

const CHART_BARS = [35, 48, 40, 55, 45, 60, 52, 68, 58, 72, 65, 78].map(
  (h, i) => ({
    style: { height: `${h}%`, minHeight: `${h * 0.5}px` } as const,
    highlight: i >= 10,
  }),
);

const TRUST_STATS = [
  { value: "180+", label: "Hotels" },
  { value: "12,000+", label: "F&B SKUs" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "< 200ms", label: "API response" },
];

const ACTIVITY_ITEMS = [
  {
    text: "Banquet linens restocked",
    detail: "+240 units · Floor 22",
    time: "2m ago",
    color: "text-success",
  },
  {
    text: "Minibar 1407 replenished",
    detail: "+85 units · Housekeeping",
    time: "15m ago",
    color: "text-info",
  },
  {
    text: "Kitchen supplies received",
    detail: "+120 units · Main Kitchen",
    time: "1h ago",
    color: "text-warning",
  },
];

/* ── Component ── */

export default function HomeComponent() {
  const orbsRef = useRef<HTMLDivElement | null>(null);

  // Mouse parallax for hero orbs
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!orbsRef.current) return;
      const x = (e.clientX / globalThis.innerWidth - 0.5) * 14;
      const y = (e.clientY / globalThis.innerHeight - 0.5) * 14;
      orbsRef.current.style.setProperty("--mx", `${x}px`);
      orbsRef.current.style.setProperty("--my", `${y}px`);
    };
    globalThis.addEventListener("mousemove", handle);
    return () => globalThis.removeEventListener("mousemove", handle);
  }, []);

  return (
    <div className="bg-background text-foreground relative isolate min-h-svh">
      <GlobalKeyframes />

      {/* ── Navbar ── */}
      <nav className="border-border/50 bg-background/70 sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <span className="text-foreground text-[0.9375rem] font-bold tracking-tight">
              Carmen
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/login">
                Get started <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        {/* Animated background orbs */}
        <div
          ref={orbsRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div
            className="absolute top-[-20%] left-[-10%] h-160 w-160 rounded-full opacity-70 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklch, var(--primary), transparent 60%) 0%, transparent 70%)",
              animation: "home-orb-1 18s ease-in-out infinite",
            }}
          />
          <div
            className="absolute top-[10%] right-[-15%] h-144 w-xl rounded-full opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklch, var(--chart-3), transparent 65%) 0%, transparent 70%)",
              animation: "home-orb-2 22s ease-in-out infinite",
            }}
          />
          <div
            className="absolute bottom-[-15%] left-[20%] h-176 w-176 rounded-full opacity-50 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklch, var(--chart-2), transparent 70%) 0%, transparent 70%)",
              animation: "home-orb-3 26s ease-in-out infinite",
            }}
          />
        </div>

        {/* Subtle grain */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.015] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-20 pb-24 text-center md:pt-28 md:pb-28">
          {/* Eyebrow */}
          <div
            className="border-primary/20 bg-primary/6 mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1 backdrop-blur-sm"
            style={{ animation: "home-fade-up 0.6s ease-out 0.05s both" }}
          >
            <span className="bg-success size-1.5 rounded-full" />
            <span className="text-primary text-[0.6875rem] font-semibold tracking-wider uppercase">
              Hotel Inventory ERP
            </span>
          </div>

          {/* Cinematic headline */}
          <h1
            className="text-foreground mx-auto max-w-3xl text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.05] font-semibold tracking-[-0.03em]"
            style={{ animation: "home-title-reveal 0.9s ease-out 0.15s both" }}
          >
            Hospitality inventory{" "}
            <span
              className="from-primary via-primary to-chart-3 inline-block bg-linear-to-r bg-clip-text text-transparent"
              style={{
                backgroundSize: "200% 100%",
                animation: "home-shimmer 8s ease-in-out infinite alternate",
              }}
            >
              that runs the back of house.
            </span>
          </h1>

          <p
            className="text-muted-foreground/90 mx-auto mt-5 max-w-xl text-[0.9375rem] leading-relaxed md:text-base"
            style={{ animation: "home-fade-up 0.7s ease-out 0.35s both" }}
          >
            Streamline procurement, track stock across every department, and
            make smarter purchasing decisions — all from a single platform built
            for modern hotels.
          </p>

          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
            style={{ animation: "home-fade-up 0.7s ease-out 0.5s both" }}
          >
            <ShineButton asChild size="lg">
              <Link to="/login">
                <span>Get started today</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </ShineButton>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-border/60 bg-card/40 backdrop-blur-sm"
            >
              <a href="#how-it-works">Learn more</a>
            </Button>
          </div>

          {/* Trust strip */}
          <div
            className="mx-auto mt-16 max-w-2xl"
            style={{ animation: "home-fade-up 0.7s ease-out 0.7s both" }}
          >
            <p className="text-muted-foreground/60 mb-5 text-[0.6875rem] font-semibold tracking-widest uppercase">
              Trusted by hotel chains managing thousands of inventory items
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {TRUST_STATS.map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-foreground text-xl font-bold tracking-tight tabular-nums">
                    {s.value}
                  </p>
                  <p className="text-muted-foreground text-[0.6875rem]">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Integrations strip ── */}
      <section className="border-border/50 bg-muted/20 relative border-y py-10 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <p className="text-muted-foreground/70 mb-6 text-center text-[0.6875rem] font-semibold tracking-widest uppercase">
              Connects with your hotel stack
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12">
              {integrations.map((it) => (
                <div
                  key={it.name}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 transition-colors"
                >
                  <it.icon className="size-4" />
                  <span className="text-sm font-semibold tracking-tight">
                    {it.name}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="grid items-center gap-16 lg:grid-cols-2">
              {/* Left — text */}
              <div>
                <Eyebrow icon={Sparkles}>How it works</Eyebrow>
                <h2 className="text-foreground mt-3 text-[clamp(1.5rem,3.5vw,2.25rem)] leading-tight font-semibold tracking-[-0.02em]">
                  Set up your hotel inventory portal — with ease, by integrating
                  directly with our API.
                </h2>

                <div className="mt-10 space-y-5">
                  {[
                    {
                      num: 1,
                      title: "Configure your property",
                      desc: "Set up locations, departments, vendors and product catalogs directly in your portal. Our API enables complete integration.",
                    },
                    {
                      num: 2,
                      title: "Build templates for every department",
                      desc: "Create reusable purchase order and requisition templates tailored to each department's needs.",
                    },
                    {
                      num: 3,
                      title: "Staff start using immediately",
                      desc: "Once configured, your team can create orders, receive goods and track stock right away.",
                    },
                  ].map((step) => (
                    <div key={step.num} className="flex gap-4">
                      <div className="from-primary to-chart-3 text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-xs font-bold shadow-[0_0.5rem_1rem_-0.25rem_color-mix(in_oklch,var(--primary),transparent_55%)]">
                        {step.num}
                      </div>
                      <div>
                        <p className="text-foreground text-sm font-semibold tracking-tight">
                          {step.title}
                        </p>
                        <p className="text-muted-foreground mt-1 text-[0.8125rem] leading-relaxed">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — glass card mock */}
              <div className="hidden lg:block">
                <div className="border-border/40 bg-card/60 relative overflow-hidden rounded-2xl border p-6 shadow-[0_2rem_4rem_-1rem_color-mix(in_oklch,var(--primary),transparent_82%),0_0.5rem_1.5rem_-0.5rem_rgba(0,0,0,0.05)] backdrop-blur-2xl">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-2xl"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)",
                    }}
                  />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <h3 className="text-foreground text-sm font-semibold tracking-tight">
                        New Purchase Order
                      </h3>
                      <span className="bg-primary/10 text-primary border-primary/15 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.5625rem] font-bold tracking-widest uppercase">
                        Draft
                      </span>
                    </div>
                    <div className="mt-5 space-y-3">
                      {[
                        { label: "Vendor", value: "Grand Supply Co." },
                        { label: "Department", value: "Kitchen" },
                        { label: "Delivery date", value: "2026-04-15" },
                      ].map((field) => (
                        <div key={field.label}>
                          <p className="text-muted-foreground/80 mb-1 text-[0.5625rem] font-semibold tracking-widest uppercase">
                            {field.label}
                          </p>
                          <div className="border-border/40 bg-background/60 flex h-9 items-center rounded-lg border px-3 text-sm">
                            {field.value}
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" size="sm">
                          Cancel
                        </Button>
                        <ShineButton size="sm">
                          <span>Submit</span>
                        </ShineButton>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Core Modules — 2×2 grid ── */}
      <section id="features" className="relative py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="text-center">
              <Eyebrow>Valuable tools that power hotel operations</Eyebrow>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {modules.map((m, i) => (
              <Reveal key={m.title} delay={i * 80}>
                <BentoCard
                  icon={m.icon}
                  iconBg={m.iconBg}
                  iconColor={m.iconColor}
                  title={m.title}
                  desc={m.desc}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── More Features — 3×2 grid ── */}
      <section className="relative py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="text-center">
              <h2 className="text-foreground text-[clamp(1.5rem,3.5vw,2.25rem)] font-semibold tracking-[-0.02em]">
                Built for the rhythm of hotel operations.
              </h2>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {moreFeatures.map((f, i) => (
              <Reveal key={f.title} delay={i * 60}>
                <BentoCard
                  icon={f.icon}
                  iconColor={f.iconColor}
                  title={f.title}
                  desc={f.desc}
                  small
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonial ── */}
      <section className="relative py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <Reveal>
            <div className="border-border/40 bg-card/60 relative overflow-hidden rounded-3xl border p-10 shadow-[0_2rem_4rem_-1rem_color-mix(in_oklch,var(--primary),transparent_82%)] backdrop-blur-2xl md:p-14">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-3xl"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%)",
                }}
              />
              <div className="relative">
                <span className="bg-primary/10 text-primary border-primary/15 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.5625rem] font-bold tracking-widest uppercase">
                  <Sparkles className="size-2.5" />
                  Customer story
                </span>
                <blockquote className="text-foreground mt-5 text-[clamp(1.25rem,3vw,1.875rem)] leading-snug font-semibold tracking-[-0.02em]">
                  &ldquo;Carmen reduced our procurement cycle from{" "}
                  <span className="from-primary to-chart-3 bg-linear-to-r bg-clip-text text-transparent">
                    3 days to 2 hours
                  </span>{" "}
                  — and we set up stock tracking across every department in 15
                  minutes.&rdquo;
                </blockquote>
                <div className="mt-8 flex items-center justify-center gap-3">
                  <div className="from-primary to-chart-3 text-primary-foreground flex size-10 items-center justify-center rounded-xl bg-linear-to-br">
                    <Hotel className="size-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-foreground text-sm font-semibold">
                      Operations Director
                    </p>
                    <p className="text-muted-foreground text-xs">
                      5-Star Hotel Chain, Bangkok
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Dark CTA Banner ── */}
      <section className="bg-invert relative overflow-hidden">
        <div className="bg-primary/8 pointer-events-none absolute top-1/2 left-1/2 size-160 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[8rem]" />
        <div
          aria-hidden
          className="from-chart-3/20 pointer-events-none absolute -top-20 -right-20 size-96 rounded-full bg-linear-to-br to-transparent blur-3xl"
        />

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-20 md:py-24">
          <Reveal>
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <span className="bg-primary/15 text-primary border-primary/20 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.5625rem] font-bold tracking-widest uppercase">
                  <span>Why Carmen</span>
                </span>
                <blockquote className="text-invert-foreground mt-4 text-[clamp(1.5rem,3.5vw,2.25rem)] leading-tight font-semibold tracking-[-0.02em]">
                  &ldquo;We can manage inventory globally across 12 properties,
                  automate F&amp;B procurement, and maintain visibility on every
                  outlet — all from one platform.&rdquo;
                </blockquote>
                <ShineButton asChild size="sm" className="mt-6">
                  <Link to="/login">
                    <span>Get started</span>
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </ShineButton>
              </div>

              <div className="flex flex-wrap items-start gap-8 lg:justify-end">
                <div>
                  <p className="text-invert-foreground/50 text-xs">
                    Automated alerts via
                    <br />
                    email, SMS and in-app
                  </p>
                  <p className="text-invert-foreground mt-2 text-4xl font-bold tracking-tight tabular-nums">
                    24/7
                  </p>
                </div>
                <div>
                  <p className="text-invert-foreground/50 text-xs">
                    Staff adoption rate
                    <br />
                    within first week
                  </p>
                  <p className="text-invert-foreground mt-2 text-4xl font-bold tracking-tight tabular-nums">
                    85%
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Implementation Steps ── */}
      <section className="relative py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-start gap-16 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>Implementation</Eyebrow>
              <h2 className="text-foreground mt-3 text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight font-semibold tracking-[-0.02em]">
                <span>As a </span>
                <span className="from-primary to-chart-3 bg-linear-to-r bg-clip-text text-transparent">
                  hotel operator
                </span>
                <span>, your path with us is important to us.</span>
              </h2>
            </Reveal>

            <div className="relative space-y-6">
              <div className="from-primary/40 via-primary/20 absolute top-3 left-3 h-[calc(100%-1.5rem)] w-px bg-linear-to-b to-transparent" />
              {steps.map((step, i) => (
                <Reveal key={step.num} delay={i * 100}>
                  <div className="flex gap-5">
                    <div className="from-primary to-chart-3 text-primary-foreground relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br shadow-[0_0.5rem_1rem_-0.25rem_color-mix(in_oklch,var(--primary),transparent_55%)]">
                      <CheckCircle2 className="size-3.5" />
                    </div>
                    <div>
                      <p className="text-primary text-sm font-semibold tracking-tight">
                        {step.title}
                      </p>
                      <p className="text-muted-foreground mt-1 text-[0.8125rem] leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Dashboard Preview ── */}
      <section className="relative py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="mb-12 text-center">
              <Eyebrow icon={Activity}>Live dashboard</Eyebrow>
              <h2 className="text-foreground mt-3 text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.02em]">
                Everything at a glance
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Card: Overview */}
            <Reveal delay={0}>
              <DashboardCard>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-success size-2 rounded-full" />
                    <span className="text-muted-foreground text-[0.6875rem] font-semibold tracking-widest uppercase">
                      Overview
                    </span>
                  </div>
                  <span className="text-success/80 text-[0.625rem]">
                    ● Live
                  </span>
                </div>
                <div className="space-y-3">
                  {OVERVIEW_STATS.map((r) => (
                    <div key={r.label}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-muted-foreground text-xs">
                          {r.label}
                        </span>
                        <span className="text-foreground text-[0.75rem] font-semibold tabular-nums">
                          {r.val}
                        </span>
                      </div>
                      <div className="bg-muted h-1 overflow-hidden rounded-full">
                        <div
                          className={cn("h-full rounded-full", r.barClass)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            </Reveal>

            {/* Card: Activity */}
            <Reveal delay={100}>
              <DashboardCard>
                <div className="mb-4 flex items-center gap-2">
                  <Activity className="text-muted-foreground size-3.5" />
                  <span className="text-muted-foreground text-[0.6875rem] font-semibold tracking-widest uppercase">
                    Recent Activity
                  </span>
                </div>
                <div className="space-y-3">
                  {ACTIVITY_ITEMS.map((item) => (
                    <div key={item.text} className="flex items-start gap-2">
                      <ArrowUpRight
                        className={cn("mt-0.5 size-3.5 shrink-0", item.color)}
                      />
                      <div>
                        <p className="text-foreground text-[0.75rem] font-medium">
                          {item.text}
                        </p>
                        <p className="text-muted-foreground text-[0.625rem]">
                          {item.detail} · {item.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            </Reveal>

            {/* Card: Monthly Savings */}
            <Reveal delay={200}>
              <DashboardCard>
                <p className="text-muted-foreground text-[0.6875rem] font-semibold tracking-widest uppercase">
                  F&amp;B cost savings
                </p>
                <p className="from-primary to-chart-3 mt-1 bg-linear-to-r bg-clip-text text-3xl font-bold tracking-tight text-transparent tabular-nums">
                  ฿284k
                </p>
                <p className="text-success mt-1 text-xs">
                  +12.5% vs last month
                </p>
                <div className="mt-4 flex h-20 items-end gap-0.75">
                  {CHART_BARS.map((bar) => (
                    <div
                      key={`bar-${bar.style.height}`}
                      className={cn(
                        "flex-1 rounded-sm",
                        bar.highlight
                          ? "from-primary to-chart-3 bg-linear-to-t"
                          : "bg-muted",
                      )}
                      style={bar.style}
                    />
                  ))}
                </div>
              </DashboardCard>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="relative py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal>
            <div className="mb-10 text-center">
              <Eyebrow>FAQ</Eyebrow>
              <h2 className="text-foreground mt-3 text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-[-0.02em]">
                Frequently asked questions
              </h2>
              <p className="text-muted-foreground mt-2 text-sm">
                Everything you need to know before getting started.
              </p>
            </div>
          </Reveal>
          <div className="space-y-2">
            {faqs.map((item, i) => (
              <Reveal key={item.q} delay={i * 60}>
                <FaqItem question={item.q} answer={item.a} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative py-20 text-center md:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <Reveal>
            <div className="border-border/40 bg-card/60 relative overflow-hidden rounded-3xl border p-10 shadow-[0_2rem_4rem_-1rem_color-mix(in_oklch,var(--primary),transparent_82%)] backdrop-blur-2xl md:p-14">
              <div
                aria-hidden
                className="from-primary/10 pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-linear-to-br to-transparent blur-3xl"
              />
              <div className="relative">
                <h2 className="text-foreground text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-[-0.02em]">
                  <span>Ready to </span>
                  <span className="from-primary to-chart-3 bg-linear-to-r bg-clip-text text-transparent">
                    go live
                  </span>
                  <span>?</span>
                </h2>
                <p className="text-muted-foreground mt-3 text-[0.9375rem]">
                  Sign in to your account and start managing your hotel
                  inventory today.
                </p>
                <ShineButton asChild size="lg" className="mt-8">
                  <Link to="/login">
                    <span>Sign in to Carmen</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </ShineButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-border/50 bg-background/40 border-t backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <BrandMark size="xs" />
                <span className="text-foreground text-sm font-bold">
                  Carmen
                </span>
              </div>
              <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                Hotel Inventory ERP Platform
              </p>
            </div>

            {[
              {
                title: "Modules",
                items: ["Procurement", "Inventory", "Store Ops", "Vendors"],
              },
              {
                title: "Resources",
                items: ["Analytics", "Reports", "API Docs", "Integrations"],
              },
              {
                title: "Company",
                items: ["About", "Contact", "Privacy", "Terms"],
              },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-foreground text-[0.6875rem] font-semibold tracking-widest uppercase">
                  {col.title}
                </p>
                <ul className="mt-3 space-y-2">
                  {col.items.map((item) => (
                    <li
                      key={item}
                      className="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-border/50 mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
            <p className="text-muted-foreground text-xs">
              © Carmen {new Date().getFullYear()}
            </p>
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors">
                Privacy Policy
              </span>
              <span className="text-muted-foreground hover:text-foreground cursor-pointer text-xs transition-colors">
                Terms of Service
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Atoms ────────────────────────────────────────── */

function GlobalKeyframes() {
  return (
    <style>{`
      @keyframes home-orb-1 { 0%, 100% { transform: translate(var(--mx, 0), var(--my, 0)); } 50% { transform: translate(calc(var(--mx, 0) + 1.5rem), calc(var(--my, 0) - 2rem)); } }
      @keyframes home-orb-2 { 0%, 100% { transform: translate(var(--mx, 0), var(--my, 0)); } 50% { transform: translate(calc(var(--mx, 0) - 2rem), calc(var(--my, 0) + 1.5rem)); } }
      @keyframes home-orb-3 { 0%, 100% { transform: translate(var(--mx, 0), var(--my, 0)); } 50% { transform: translate(calc(var(--mx, 0) + 2.5rem), calc(var(--my, 0) + 1rem)); } }
      @keyframes home-shimmer { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
      @keyframes home-shine-sweep { 0% { transform: translateX(-150%) skewX(-20deg); } 100% { transform: translateX(250%) skewX(-20deg); } }
      @keyframes home-fade-up { 0% { opacity: 0; transform: translateY(0.75rem); } 100% { opacity: 1; transform: translateY(0); } }
      @keyframes home-title-reveal {
        0% { opacity: 0; transform: translateY(0.75rem); filter: blur(0.25rem); }
        100% { opacity: 1; transform: translateY(0); filter: blur(0); }
      }
      .home-reveal {
        opacity: 0;
        transform: translateY(1.25rem);
        transition: opacity 0.8s ease-out, transform 0.8s ease-out;
        will-change: opacity, transform;
      }
      .home-reveal.is-visible {
        opacity: 1;
        transform: translateY(0);
      }
      @media (prefers-reduced-motion: reduce) {
        .home-reveal { opacity: 1; transform: none; transition: none; }
      }
    `}</style>
  );
}

/**
 * Wrap section to fade-up on scroll into viewport (IntersectionObserver)
 */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  readonly children: React.ReactNode;
  readonly delay?: number;
  readonly className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.12, rootMargin: "-5% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("home-reveal", visible && "is-visible", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

function BrandMark({ size = "sm" }: { readonly size?: "xs" | "sm" }) {
  const pxSize = size === "xs" ? 28 : 32;
  return <CarmenLogo size={pxSize} />;
}

function Eyebrow({
  children,
  icon: Icon = Sparkles,
}: {
  readonly children: React.ReactNode;
  readonly icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span className="bg-primary/10 text-primary border-primary/15 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold tracking-widest uppercase backdrop-blur-sm">
      <Icon className="size-2.5" />
      {children}
    </span>
  );
}

function BentoCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  desc,
  small,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly iconBg?: string;
  readonly iconColor: string;
  readonly title: string;
  readonly desc: string;
  readonly small?: boolean;
}) {
  return (
    <div className="border-border/40 bg-card/50 hover:border-primary/30 hover:bg-card/70 group relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl transition-all md:p-6">
      <div
        aria-hidden
        className="from-primary/10 absolute -top-12 -right-12 size-40 rounded-full bg-linear-to-br to-transparent opacity-0 blur-2xl transition-opacity group-hover:opacity-100"
      />
      <div className="relative">
        {small ? (
          <Icon className={cn("size-5", iconColor)} />
        ) : (
          <div
            className={cn(
              "flex size-11 items-center justify-center rounded-xl",
              iconBg,
            )}
          >
            <Icon className={cn("size-5", iconColor)} />
          </div>
        )}
        <h3 className="text-foreground mt-4 text-[0.9375rem] font-semibold tracking-tight">
          {title}
        </h3>
        <p className="text-muted-foreground mt-1.5 text-[0.8125rem] leading-relaxed">
          {desc}
        </p>
      </div>
    </div>
  );
}

function DashboardCard({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="border-border/40 bg-card/60 hover:border-primary/30 group relative overflow-hidden rounded-2xl border p-5 backdrop-blur-xl transition-all">
      <div
        aria-hidden
        className="from-primary/8 absolute -top-12 -right-12 size-32 rounded-full bg-linear-to-br to-transparent opacity-0 blur-2xl transition-opacity group-hover:opacity-100"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function FaqItem({
  question,
  answer,
}: {
  readonly question: string;
  readonly answer: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-border/40 bg-card/40 hover:border-primary/30 group overflow-hidden rounded-xl border backdrop-blur-xl transition-colors">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-foreground text-sm font-semibold tracking-tight">
          {question}
        </span>
        <ChevronDown
          className={cn(
            "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <p className="text-muted-foreground px-5 pb-4 text-[0.8125rem] leading-relaxed">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

function ShineButton({
  children,
  className,
  asChild,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      asChild={asChild}
      {...props}
      className={cn(
        "from-primary to-primary/85 hover:to-primary group relative overflow-hidden bg-linear-to-br shadow-[0_0.5rem_1.25rem_-0.25rem_color-mix(in_oklch,var(--primary),transparent_55%)] transition-all hover:shadow-[0_0.75rem_1.75rem_-0.25rem_color-mix(in_oklch,var(--primary),transparent_45%)] hover:brightness-105",
        className,
      )}
    >
      {asChild ? (
        children
      ) : (
        <span className="relative z-10 inline-flex items-center justify-center gap-2">
          {children}
          <span
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 h-full w-1/3 bg-linear-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100"
            style={{ animation: "home-shine-sweep 1.2s ease-out infinite" }}
          />
        </span>
      )}
    </Button>
  );
}
