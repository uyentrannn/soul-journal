import React from 'react';
import { motion } from 'motion/react';
import { NotebookConfig, ThemeConfig } from '../types';
import { cn } from '../lib/utils';

interface NotebookCoverProps {
  config: NotebookConfig;
  theme: ThemeConfig;
  onOpen: () => void;
}

export const NotebookCover: React.FC<NotebookCoverProps> = ({ config, theme, onOpen }) => {
  return (
    <motion.div
      initial={{ rotateY: 0 }}
      whileHover={{ rotateY: -5, x: -10 }}
      onClick={onOpen}
      className={cn(
        "relative w-full max-w-md aspect-[3/4] cursor-pointer rounded-r-lg shadow-2xl overflow-hidden flex flex-col items-center justify-center p-12",
        theme.font === 'serif-display' ? "font-serif-display" : theme.font === 'playfair' ? "font-playfair" : "font-serif-body",
        `texture-${theme.texture}`
      )}
      style={{ 
        backgroundColor: theme.coverColor || '#f5f5f0',
        backgroundBlendMode: 'multiply',
        transformStyle: 'preserve-3d',
        perspective: '1000px'
      }}
    >
      {/* Spine */}
      <div className="absolute left-0 top-0 bottom-0 w-8 notebook-spine z-20" />
      
      {/* Ornate Border */}
      <div className="absolute inset-8 border-2 border-journal-accent/40 pointer-events-none">
        <div className="absolute inset-1 border border-journal-accent/20" />
      </div>

      {/* Decorative Ornaments (Corners) */}
      <div className="absolute top-10 left-10 w-12 h-12 border-t-2 border-l-2 border-journal-accent/60 rounded-tl-sm" />
      <div className="absolute top-10 right-10 w-12 h-12 border-t-2 border-r-2 border-journal-accent/60 rounded-tr-sm" />
      <div className="absolute bottom-10 left-10 w-12 h-12 border-b-2 border-l-2 border-journal-accent/60 rounded-bl-sm" />
      <div className="absolute bottom-10 right-10 w-12 h-12 border-b-2 border-r-2 border-journal-accent/60 rounded-br-sm" />

      {/* Content */}
      <div className="relative z-10 text-center flex flex-col items-center">
        <div className="w-24 h-10 vintage-ornament mb-4 opacity-60" />
        
        <h1 className="text-4xl tracking-[0.2em] uppercase mb-2 font-bold text-journal-accent">
          {config.title}
        </h1>
        
        <p className="text-sm italic opacity-60 mb-12 border-b border-journal-accent/20 pb-2 px-4">
          A sacred space for your inner light 💫
          <br />
          To reflect, to heal, and to grow 🌱
        </p>

        <div className="mt-12 space-y-8">
          <div className="relative">
            <span className="text-xl italic font-serif-display">{config.owner}'s Journal ♡</span>
            <div className="absolute -bottom-1 left-0 right-0 h-px bg-journal-accent/30" />
          </div>

          <div className="relative mt-8">
            <span className="text-lg tracking-widest opacity-80">~ {config.year} ~</span>
            <div className="absolute -bottom-1 left-4 right-4 h-px bg-journal-accent/30" />
          </div>
        </div>

        <div className="mt-auto pt-12">
          <div className="border border-journal-accent/40 px-3 py-1 text-[10px] tracking-widest uppercase">
            Volume I
          </div>
        </div>
      </div>

      {/* Realistic Paper Edge Effect */}
      <div className="absolute right-0 top-1 bottom-1 w-1 bg-white/20 rounded-r-sm" />
    </motion.div>
  );
};
