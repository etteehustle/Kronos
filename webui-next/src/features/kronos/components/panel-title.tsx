export function PanelTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-md bg-[#eef4ff] text-[#2563eb]">
        {icon}
      </span>
      <span className="text-base font-semibold text-[#172033]">{title}</span>
    </div>
  );
}
