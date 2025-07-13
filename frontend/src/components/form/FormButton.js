import LoadingSpinner from '../ui/LoadingSpinner';

export default function FormButton({ 
  children, 
  type = 'button', 
  onClick, 
  disabled = false, 
  loading = false,
  variant = 'primary',
  className = ''
}) {
  const baseClasses = `
    w-full flex items-center justify-center px-4 py-2 border text-sm font-medium rounded-md
    focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantClasses = {
    primary: `
      border-transparent text-white bg-blue-600 hover:bg-blue-700 
      focus:ring-blue-500 disabled:hover:bg-blue-600
    `,
    secondary: `
      border-gray-300 text-gray-700 bg-white hover:bg-gray-50 
      focus:ring-blue-500 disabled:hover:bg-white
    `
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {loading && <LoadingSpinner className="mr-2 h-4 w-4" />}
      {children}
    </button>
  );
} 