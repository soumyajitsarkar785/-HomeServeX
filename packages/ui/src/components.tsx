import React, { useEffect } from 'react';

// ==========================================
// Button Component
// ==========================================
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  ...props
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isActive, setIsActive] = React.useState(false);

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: isHovered ? '#DCFCE7' : '#EAF6EF',
          color: '#145C43',
          border: '1px solid #BBF7D0',
          boxShadow: isHovered ? '0 2px 8px rgba(20, 92, 67, 0.12)' : 'none',
        };
      case 'outline':
        return {
          backgroundColor: isHovered ? '#F8FAFC' : 'transparent',
          color: '#0F172A',
          border: isHovered ? '1px solid #CBD5E1' : '1px solid #E2E8F0',
          boxShadow: isHovered ? '0 2px 6px rgba(0,0,0,0.04)' : 'none',
        };
      case 'danger':
        return {
          background: isHovered
            ? 'linear-gradient(180deg, #EF4444 0%, #DC2626 100%)'
            : 'linear-gradient(180deg, #DC2626 0%, #B91C1C 100%)',
          color: '#FFFFFF',
          border: 'none',
          boxShadow: isHovered
            ? '0 6px 16px rgba(220, 38, 38, 0.35)'
            : '0 2px 8px rgba(220, 38, 38, 0.2)',
        };
      case 'ghost':
        return {
          backgroundColor: isHovered ? '#F1F5F9' : 'transparent',
          color: isHovered ? '#0F172A' : '#64748B',
          border: 'none',
        };
      case 'primary':
      default:
        return {
          background: isHovered
            ? 'linear-gradient(180deg, #16865D 0%, #0E3E2F 100%)'
            : 'linear-gradient(180deg, #145C43 0%, #0B3326 100%)',
          color: '#FFFFFF',
          border: 'none',
          boxShadow: isHovered
            ? '0 6px 18px rgba(14, 62, 47, 0.32)'
            : '0 2px 10px rgba(14, 62, 47, 0.2)',
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return { padding: '6px 14px', fontSize: '12.5px', height: '34px', borderRadius: '18px' };
      case 'lg':
        return { padding: '12px 28px', fontSize: '15px', height: '48px', fontWeight: 700, borderRadius: '24px' };
      case 'md':
      default:
        return { padding: '9px 20px', fontSize: '13.5px', height: '40px', borderRadius: '20px' };
    }
  };

  return (
    <button
      disabled={disabled || isLoading}
      onMouseEnter={(e) => {
        setIsHovered(true);
        if (onMouseEnter) onMouseEnter(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        setIsActive(false);
        if (onMouseLeave) onMouseLeave(e);
      }}
      onMouseDown={(e) => {
        setIsActive(true);
        if (onMouseDown) onMouseDown(e);
      }}
      onMouseUp={(e) => {
        setIsActive(false);
        if (onMouseUp) onMouseUp(e);
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 700,
        letterSpacing: '-0.2px',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: disabled || isLoading ? 0.6 : 1,
        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        transform: isActive && !disabled && !isLoading ? 'scale(0.97)' : isHovered && !disabled && !isLoading ? 'translateY(-1px)' : 'none',
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style,
      }}
      {...props}
    >
      {isLoading ? (
        <Spinner size="sm" color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#145C43'} />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};

// ==========================================
// Input Component
// ==========================================
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, id, style, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {label && (
          <label
            htmlFor={inputId}
            style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text, #17211C)' }}
          >
            {label}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
          {leftIcon && (
            <div
              style={{
                position: 'absolute',
                left: '12px',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
                color: 'var(--color-text-muted, #8E9992)',
              }}
            >
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            style={{
              width: '100%',
              padding: leftIcon ? '10px 14px 10px 38px' : '10px 14px',
              fontSize: '14px',
              color: 'var(--color-text, #17211C)',
              backgroundColor: 'var(--color-card-bg, #FFFFFF)',
              border: `1px solid ${error ? 'var(--color-danger, #D64545)' : 'var(--color-border, #E4EAE5)'}`,
              borderRadius: 'var(--radius-control, 10px)',
              outline: 'none',
              transition: 'border-color var(--transition-fast, 0.15s ease)',
              boxSizing: 'border-box',
              ...style,
            }}
            {...props}
          />
        </div>
        {error && (
          <span style={{ fontSize: '12px', color: 'var(--color-danger, #D64545)', fontWeight: 500 }}>
            {error}
          </span>
        )}
        {!error && helperText && (
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted, #8E9992)' }}>
            {helperText}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// ==========================================
// Card Component
// ==========================================
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  bordered = true,
  hoverable = false,
  style,
  ...props
}) => {
  const getPadding = () => {
    switch (padding) {
      case 'none': return 0;
      case 'sm': return '14px';
      case 'lg': return '28px';
      case 'md': default: return '20px';
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--color-card-bg, #FFFFFF)',
        borderRadius: 'var(--radius-card, 16px)',
        border: bordered ? '1px solid var(--color-border, #E4EAE5)' : 'none',
        boxShadow: 'var(--shadow-sm)',
        padding: getPadding(),
        transition: hoverable ? 'transform var(--transition-fast, 0.15s ease), box-shadow var(--transition-fast, 0.15s ease)' : undefined,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// ==========================================
// Badge Component
// ==========================================
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  style,
  ...props
}) => {
  const getColors = () => {
    switch (variant) {
      case 'primary': return { bg: 'var(--color-mint-light, #EAF6EF)', text: 'var(--color-primary, #145C43)', border: '#CBE5D7' };
      case 'success': return { bg: '#EAF7EE', text: 'var(--color-success, #188653)', border: '#C5ECD3' };
      case 'warning': return { bg: '#FEF7E8', text: 'var(--color-warning, #D99118)', border: '#FCE7BD' };
      case 'danger': return { bg: '#FDF1F1', text: 'var(--color-danger, #D64545)', border: '#F8CECE' };
      case 'neutral': default: return { bg: '#F2F4F2', text: 'var(--color-text-secondary, #6B756F)', border: '#E4EAE5' };
    }
  };

  const { bg, text, border } = getColors();

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: 'var(--radius-full, 9999px)',
        fontSize: size === 'sm' ? '11px' : '12px',
        fontWeight: 600,
        backgroundColor: bg,
        color: text,
        border: `1px solid ${border}`,
        letterSpacing: '0.02em',
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
};

// ==========================================
// Spinner Component
// ==========================================
export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'var(--color-primary, #145C43)' }) => {
  const pixelSize = size === 'sm' ? 16 : size === 'lg' ? 36 : 24;

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: 'hsx-spin 0.75s linear infinite' }}
    >
      <style>
        {`@keyframes hsx-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
      </style>
      <circle cx="12" cy="12" r="10" stroke="var(--color-border, #E4EAE5)" strokeWidth="3" />
      <path
        d="M12 2C6.47715 2 2 6.47715 2 12"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
};

// ==========================================
// Empty State Component
// ==========================================
export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action, icon }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '56px 24px',
        textAlign: 'center',
        borderRadius: 'var(--radius-card, 16px)',
        backgroundColor: 'var(--color-card-bg, #FFFFFF)',
        border: '1px dashed var(--color-border, #E4EAE5)',
      }}
    >
      {icon && <div style={{ marginBottom: '16px', color: 'var(--color-text-secondary, #6B756F)' }}>{icon}</div>}
      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text, #17211C)', margin: '0 0 8px 0' }}>
        {title}
      </h3>
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary, #6B756F)', margin: '0 0 24px 0', maxWidth: '440px', lineHeight: 1.5 }}>
        {description}
      </p>
      {action}
    </div>
  );
};

// ==========================================
// Modal / Dialog Component
// ==========================================
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = '540px' }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(23, 33, 28, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-card, 16px)',
          width: '100%',
          maxWidth,
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--color-border, #E4EAE5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text, #17211C)', margin: 0 }}>
              {title}
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '20px',
                color: 'var(--color-text-secondary, #6B756F)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
              }}
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
        )}
        <div style={{ padding: '24px', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// RatingStars Component
// ==========================================
export const RatingStars: React.FC<{ rating: number; count?: number; showText?: boolean }> = ({
  rating,
  count,
  showText = true,
}) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ color: '#E8A317', fontSize: '14px' }}>★</span>
      {showText && (
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text, #17211C)' }}>
          {rating.toFixed(1)}
        </span>
      )}
      {count !== undefined && (
        <span style={{ fontSize: '12px', color: 'var(--color-text-secondary, #6B756F)' }}>
          ({count})
        </span>
      )}
    </div>
  );
};

// ==========================================
// Skeleton Component (Loading Placeholder)
// ==========================================
export const Skeleton: React.FC<{ width?: string; height?: string; borderRadius?: string; style?: React.CSSProperties }> = ({
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  style,
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#EAEFEA',
        animation: 'hsx-pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    >
      <style>
        {`@keyframes hsx-pulse { 0%, 100% { opacity: 0.8; } 50% { opacity: 0.35; } }`}
      </style>
    </div>
  );
};

// ==========================================
// Status Stepper Component
// ==========================================
export const StatusStepper: React.FC<{ currentStatus: string }> = ({ currentStatus }) => {
  const steps = [
    { key: 'PENDING', label: 'Requested' },
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  const getStepIndex = (st: string) => {
    switch (st) {
      case 'PENDING':
      case 'SEARCHING_PROVIDER': return 0;
      case 'ASSIGNED':
      case 'PROVIDER_EN_ROUTE':
      case 'ARRIVED': return 1;
      case 'IN_PROGRESS': return 2;
      case 'COMPLETED': return 3;
      case 'CANCELLED': return -1;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED';

  if (isCancelled) {
    return (
      <div style={{ padding: '12px 16px', backgroundColor: '#FDF1F1', borderRadius: '10px', color: '#D64545', fontSize: '13px', fontWeight: 600 }}>
        ⚠️ This booking was cancelled.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', margin: '16px 0', gap: '4px' }}>
      {steps.map((step, idx) => {
        const isCompleted = currentIndex > idx;
        const isCurrent = currentIndex === idx;

        return (
          <React.Fragment key={step.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1 }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  backgroundColor: isCompleted
                    ? 'var(--color-success, #188653)'
                    : isCurrent
                    ? 'var(--color-primary, #145C43)'
                    : '#E4EAE5',
                  color: isCompleted || isCurrent ? '#FFFFFF' : '#6B756F',
                  transition: 'all 0.2s',
                }}
              >
                {isCompleted ? '✓' : idx + 1}
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? 'var(--color-primary, #145C43)' : isCompleted ? 'var(--color-text, #17211C)' : 'var(--color-text-muted, #8E9992)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                style={{
                  height: '3px',
                  flex: 1,
                  backgroundColor: isCompleted ? 'var(--color-success, #188653)' : '#E4EAE5',
                  marginBottom: '18px',
                  borderRadius: '2px',
                  transition: 'background-color 0.2s',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
