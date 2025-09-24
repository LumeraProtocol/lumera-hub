import React from 'react';
import './Skeleton.css'; 

interface SkeletonProps {
  type?: 'text' | 'title' | 'image' | 'list';
  count?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({ type = 'text', count = 1 }) => {
  const renderSkeletonItem = () => {
    switch (type) {
      case 'title':
        return <span className="skeleton skeleton-title"></span>;
      case 'image':
        return <span className="skeleton skeleton-image"></span>;
      case 'list':
        return (
          Array.from({ length: count }).map((_, index) => (
            <span key={index} className="skeleton skeleton-list-item"></span>
          ))
        );
      case 'text':
      default:
        return <span className="skeleton skeleton-text"></span>;
    }
  };

  return <span className={`skeleton-container skeleton-container-${type}`}>{renderSkeletonItem()}</span>;
};

export default Skeleton;