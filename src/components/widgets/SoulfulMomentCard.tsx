import React from 'react';
import { motion } from 'motion/react';
import { RefreshCw, X } from 'lucide-react';
import { format } from 'date-fns';

interface SoulfulMomentCardProps {
  photo: string;
  index: number;
  date: Date;
  onReplace: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (index: number) => void;
}

export const SoulfulMomentCard: React.FC<SoulfulMomentCardProps> = ({
  photo,
  index,
  date,
  onReplace,
  onRemove
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, rotate: index % 2 === 0 ? -2 : 2 }}
      animate={{ opacity: 1, scale: 1, rotate: index % 2 === 0 ? -2 : 2 }}
      whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
      className="bg-white p-3 pb-10 shadow-xl border border-black/5 relative group w-[160px]"
    >
      <div className="aspect-square overflow-hidden bg-gray-100">
        <img 
          src={photo} 
          alt={`Moment ${index + 1}`} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <label className="bg-black/50 text-white p-1.5 rounded-full cursor-pointer hover:bg-black/70 transition-colors">
          <RefreshCw size={12} />
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => onReplace(index, e)}
          />
        </label>
        <button
          onClick={() => onRemove(index)}
          className="bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-colors"
        >
          <X size={12} />
        </button>
      </div>
      <div className="absolute bottom-2 left-0 right-0 text-center">
        <span className="font-serif-display text-[10px] opacity-30 italic">
          {format(date, 'MMM d, yyyy')}
        </span>
      </div>
    </motion.div>
  );
};
