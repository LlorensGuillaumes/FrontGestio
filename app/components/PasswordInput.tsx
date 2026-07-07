// app/components/PasswordInput.tsx
import { useState, forwardRef } from "react";

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  dark?: boolean;
  labelClassName?: string;
  inputClassName?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, dark = false, labelClassName, inputClassName, className = "", id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const defaultInputClass = dark
      ? "w-full px-4 py-3 pr-12 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
      : "w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100";

    const defaultLabelClass = dark
      ? "block text-sm font-medium text-slate-300 mb-2"
      : "block text-sm font-medium text-gray-700 mb-1";

    const buttonClass = dark
      ? "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
      : "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors";

    return (
      <div className={className}>
        {label && (
          <label htmlFor={id} className={labelClassName || defaultLabelClass}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={showPassword ? "text" : "password"}
            className={`${inputClassName || defaultInputClass} ${error ? "border-red-500" : ""}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className={buttonClass}
            tabIndex={-1}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
