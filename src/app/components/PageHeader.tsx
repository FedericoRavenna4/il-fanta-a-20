type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  descriptionClassName?: string;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  descriptionClassName = "",
}: PageHeaderProps) {
  return (
    <header className="relative mb-10 overflow-hidden border-b border-slate-200/80 pb-8 pt-1 sm:mb-12 sm:pb-10 lg:mb-16 lg:pb-14 lg:pt-2">
      <div className="pointer-events-none absolute -left-16 top-0 h-40 w-72 bg-sky-200/25 blur-[70px]" />
      <div className="relative max-w-4xl">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-500 sm:text-xs sm:tracking-[0.32em]">
          {eyebrow}
        </p>
        <h1 className="mt-3 break-words text-4xl font-black uppercase leading-[0.96] tracking-[-0.035em] text-blue-950 sm:mt-4 sm:text-5xl lg:text-7xl lg:leading-[0.94] lg:tracking-[-0.04em]">
          {title}
        </h1>
        <p className={`mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-500 sm:mt-6 sm:text-base sm:leading-8 lg:text-lg ${descriptionClassName}`}>
          {description}
        </p>
      </div>
    </header>
  );
}
