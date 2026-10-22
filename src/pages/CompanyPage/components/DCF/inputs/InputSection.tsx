import type { FC, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

const CARD_CLASS = 'bg-[#F8F9FB] border border-[#E5E8EF] rounded-xl p-4 space-y-4';
const CARD_TITLE_CLASS =
  'font-sans font-bold text-[12.5px] text-slate-800 uppercase tracking-wider';

interface InputSectionProps {
  title: string;
  icon?: LucideIcon;
  iconClassName?: string;
  className?: string;
  titleClassName?: string;
  children: ReactNode;
}

export const InputSection: FC<InputSectionProps> = ({
  title,
  icon: Icon,
  iconClassName,
  className = CARD_CLASS,
  titleClassName = CARD_TITLE_CLASS,
  children,
}) => (
  <div className={className}>
    {Icon ? (
      <div className="flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
        <Icon className={iconClassName} />
        <h4 className={titleClassName}>{title}</h4>
      </div>
    ) : (
      <h4 className={titleClassName}>{title}</h4>
    )}
    {children}
  </div>
);
