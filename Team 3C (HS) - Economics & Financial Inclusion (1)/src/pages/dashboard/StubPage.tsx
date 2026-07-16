import type { StubRouteMeta } from "@/data/navigation";

export default function StubPage({ label, description, icon: Icon }: StubRouteMeta) {
  return (
    <section className="mx-auto max-w-2xl px-5 py-16 text-center md:px-10 md:py-24">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <h1 className="font-display text-2xl text-foreground md:text-3xl">{label}</h1>
      <p className="mt-3 text-muted-foreground">{description}</p>
      <p className="font-mono-data mt-6 inline-block rounded-full bg-secondary px-3 py-1 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
        Coming soon
      </p>
    </section>
  );
}
