import Link from 'next/link';
import Image from 'next/image';

interface DocDockLogoProps {
  className?: string;
  size?: number;
  showSubtitle?: boolean;
  subtitleText?: string;
  collapsed?: boolean;
  href?: string;
}

export function DocDockLogo({
  className = '',
  size = 34,
  showSubtitle = true,
  subtitleText = 'Knock-Knock, your doctor is here.',
  collapsed = false,
  href
}: DocDockLogoProps) {
  const content = (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: Math.max(8, Math.round(size * 0.35)),
          overflow: 'hidden',
          flexShrink: 0,
          display: 'inline-flex',
          boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
        }}
      >
        <Image
          src="/logo.png"
          alt="DocDock Logo"
          width={size}
          height={size}
          style={{ display: 'block', width: size, height: size }}
          priority
        />
      </div>
      {!collapsed && (
        <div className="flex flex-col justify-center">
          <div
            className="font-bold leading-none tracking-tight"
            style={{
              color: 'var(--text-primary)',
              fontSize: size >= 32 ? '15px' : '14px',
            }}
          >
            DocDock
          </div>
          {showSubtitle && (
            <div
              className="mt-0.5 font-medium leading-none"
              style={{
                color: 'var(--text-muted)',
                fontSize: '10px',
              }}
            >
              {subtitleText}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
