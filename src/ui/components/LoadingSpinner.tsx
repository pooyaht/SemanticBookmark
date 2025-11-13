import { Loader2 } from 'lucide-react';
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message,
}) => {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 56,
  };

  return (
    <div className="loading-spinner-container">
      <Loader2 size={sizeMap[size]} className="loading-spinner-icon" />
      {message && <p className="loading-spinner-message">{message}</p>}
    </div>
  );
};
