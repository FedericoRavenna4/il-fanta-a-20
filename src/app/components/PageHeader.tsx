type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  descriptionClassName?: string;
  onderTitle?: boolean;
  compact?: boolean;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  descriptionClassName = "",
  onderTitle = false,
  compact = false,
}: PageHeaderProps) {
  return (
    <header className={`relative overflow-hidden border-b border-slate-200/80 pt-1 lg:pt-2 ${compact ? "mb-5 pb-4 sm:mb-8 sm:pb-6 lg:mb-10 lg:pb-8" : "mb-7 pb-5 sm:mb-12 sm:pb-10 lg:mb-16 lg:pb-14"}`}>
      <div className="pointer-events-none absolute -left-16 top-0 h-40 w-72 bg-sky-200/25 blur-[70px]" />
      <div className="relative max-w-4xl lg:max-w-none">
        <p className="section-eyebrow">
          {eyebrow}
        </p>
        <h1 className={`mt-2.5 break-words text-3xl font-black uppercase leading-[0.98] tracking-[-0.025em] text-blue-950 sm:mt-4 sm:text-5xl sm:leading-[0.96] sm:tracking-[-0.035em] lg:text-7xl lg:leading-[0.94] lg:tracking-[-0.04em] ${onderTitle ? "font-onder-title" : ""}`}>
          {title}
        </h1>
        <p className={`mt-3 max-w-3xl text-[13px] font-semibold leading-5 text-slate-500 sm:mt-6 sm:text-base sm:leading-8 lg:max-w-none lg:text-lg ${descriptionClassName}`}>
          {description}
        </p>
      </div>
    </header>
  );
}
