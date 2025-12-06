import React from 'react';
import './Skeleton.css';

interface SkeletonProps {
  type?: 'text' | 'title' | 'image' | 'list';
  count?: number;
  className?: string;
}

const Skeleton = ({ type = 'text', count = 1, className = '' }: SkeletonProps) => {
  const renderSkeletonItem = () => {
    switch (type) {
      case 'title':
        return <span className={`skeleton skeleton-title ${className}`}></span>;
      case 'image':
        return <span className={`skeleton skeleton-image ${className}`}></span>;
      case 'list':
        return (
          Array.from({ length: count }).map((_, index) => (
            <span key={index} className={`skeleton skeleton-list-item ${className}`}></span>
          ))
        );
      case 'text':
      default:
        return <span className={`skeleton skeleton-text ${className}`}></span>;
    }
  };

  return <span className={`skeleton-container skeleton-container-${type}`}>{renderSkeletonItem()}</span>;
};

export default Skeleton;
