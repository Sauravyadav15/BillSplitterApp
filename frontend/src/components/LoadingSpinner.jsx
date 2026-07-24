// frontend/src/components/LoadingSpinner.jsx

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center text-sm text-text">
      <div className="spinner-ring h-8 w-8" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
