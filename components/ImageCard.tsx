
import React from 'react';

interface ImageCardProps {
  title: string;
  url: string;
}

export const ImageCard: React.FC<ImageCardProps> = ({ title, url }) => {
  return (
    <div className="bg-gray-100 rounded-lg overflow-hidden shadow-md group transition-transform duration-300 hover:scale-105">
      <img src={url} alt={title} className="w-full h-64 object-cover" />
      <div className="p-4">
        <h4 className="text-lg font-semibold text-text-primary">{title}</h4>
      </div>
    </div>
  );
};
