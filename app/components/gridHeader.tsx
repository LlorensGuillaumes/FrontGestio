type PageHeaderProps = {
  title: string;
  subtitle?: string;
  className?: string;
};

export default function GridHeader({ title, subtitle, className }: PageHeaderProps) {
  return (
    <header className={`mb-8 ${className ?? ""}`}>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {subtitle ? <p className="text-slate-500 text-sm">{subtitle}</p> : null}
    </header>
  );
}
