import { useEffect } from 'react';
import { TrashIcon } from '@heroicons/react/24/solid';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isDeleting?: boolean;
}

export default function DeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  isDeleting = false 
}: DeleteModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-md"
        style={{
          animation: isOpen ? 'fadeIn 0.3s ease-out' : 'fadeOut 0.2s ease-in'
        }}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-md transform overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-black to-zinc-950 shadow-2xl border border-zinc-800/50"
        style={{
          animation: isOpen ? 'slideUp 0.3s ease-out' : 'slideDown 0.2s ease-in'
        }}
      >
        {/* Animated border glow */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-red-500/20 via-transparent to-orange-500/20 opacity-50 blur-xl" />
        
        {/* Content container */}
        <div className="relative">
          {/* Close button */}
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all duration-200 z-10"
            onClick={onClose}
            disabled={isDeleting}
          >
            <XIcon className="h-5 w-5" />
          </button>

          {/* Main content */}
          <div className="px-6 py-8 sm:px-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Icon */}
              <div className="mx-auto sm:mx-0 flex-shrink-0">
                <div className="relative h-14 w-14 sm:h-12 sm:w-12">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/30 to-orange-500/30 blur-lg animate-pulse" />
                  <div className="relative flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30">
                    <WarningIcon className="h-7 w-7 sm:h-6 sm:w-6 text-red-500" />
                  </div>
                </div>
              </div>

              {/* Text content */}
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl sm:text-lg font-bold text-white mb-2">
                  {title}
                </h3>
                <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                  {message}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-zinc-900/50 px-6 py-4 sm:px-8 border-t border-zinc-800/50 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button
              type="button"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 font-semibold transition-all duration-200 border border-zinc-700/50 hover:border-zinc-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              onClick={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="flex items-center justify-center gap-2">
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                  <span>Deleting...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <TrashIcon className="h-4 w-4" />
                  <span>Delete</span>
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(1rem) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(1rem) scale(0.95);
          }
        }
      `}</style>
    </div>
  );
}

// Icon components
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function WarningIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function SpinnerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}