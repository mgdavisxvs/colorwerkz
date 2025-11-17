import React from 'react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' };

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, ...rest }) => {
  const base = 'padding:0.5rem 1rem;border-radius:4px;font-weight:600;cursor:pointer;';
  const styles: Record<string, string> = {
    primary: base + 'background:#111;color:#fff;',
    secondary: base + 'background:#eee;color:#111;',
  };
  return (
    <button style={{ cssText: styles[variant] }} {...rest}>
      {children}
    </button>
  );
};
