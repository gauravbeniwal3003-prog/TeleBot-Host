import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  textColor?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textColor = 'text-slate-900',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2.5 font-bold select-none ${className}`}>
      {/* Custom Telegram-inspired Modern Geometric Paper-Plane Hosting Icon */}
      <div
        className={`${iconSizes[size]} bg-gradient-to-br from-[#24A1DE] to-[#0077b5] rounded-xl flex items-center justify-center shadow-sm text-white relative overflow-hidden flex-shrink-0`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-[60%] h-[60%] -translate-x-[0.5px] translate-y-[0.5px] text-white"
        >
          {/* Paper-plane rocket hybrid vector */}
          <path d="M22 2L11 13" />
          <path d="M22 2L15 22L11 13L2 9L22 2Z" fill="currentColor" fillOpacity="0.3" />
          <circle cx="20" cy="4" r="1.5" fill="#fff" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className={`font-logo tracking-tight ${textSizes[size]} ${textColor} flex items-center gap-1.5`}>
            <span className="font-normal tracking-tight">
              Tele<span className="font-semibold text-slate-900">Bot</span>{' '}
              <span className="font-light text-[#0088cc]">Host</span>
            </span>
            <span className="text-[10px] uppercase tracking-wider font-medium bg-[#24A1DE]/10 text-[#0088cc] px-1.5 py-0.5 rounded border border-[#24A1DE]/20">
              Cloud
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
