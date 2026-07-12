import React from 'react';
import { format, isSameDay, isSameMonth, isToday } from 'date-fns';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Entry, MOODS } from '../../types';

interface CalendarViewProps {
  entries: Entry[];
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  setView: (view: any) => void;
  calendarMonth: Date;
  handlePrevMonth: () => void;
  handleNextMonth: () => void;
  calendarDays: Date[];
  monthlyStats: { count: number; topMood: any };
  themeClasses: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  entries,
  currentDate,
  setCurrentDate,
  setView,
  calendarMonth,
  handlePrevMonth,
  handleNextMonth,
  calendarDays,
  monthlyStats,
  themeClasses
}) => {
  return (
    <div className={cn(themeClasses, "relative overflow-hidden")}>
      <div className="notebook-inner-shadow absolute inset-y-0 left-0 w-8 pointer-events-none" />
      <div className="page-curl" />
      
      {/* Decorative Corners */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-journal-accent/20 rounded-tl-sm pointer-events-none" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-journal-accent/20 rounded-tr-sm pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-journal-accent/20 rounded-bl-sm pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-journal-accent/20 rounded-br-sm pointer-events-none" />

      <div className="flex justify-between items-center mb-8">
        <h2 className="font-serif-display text-3xl italic">Soul Calendar</h2>
        <div className="flex items-center gap-4">
          <button 
            onClick={handlePrevMonth}
            className="p-2 hover:bg-journal-accent/5 rounded-full transition-colors cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-serif-display text-xl italic min-w-[140px] text-center">
            {format(calendarMonth, 'MMMM yyyy')}
          </span>
          <button 
            onClick={handleNextMonth}
            className="p-2 hover:bg-journal-accent/5 rounded-full transition-colors cursor-pointer"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-journal-accent/10 border border-journal-accent/10 rounded-2xl overflow-hidden mb-8">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-journal-accent/5 py-4 text-center text-[10px] uppercase tracking-widest font-bold opacity-40">
            {day}
          </div>
        ))}
        {calendarDays.map((day, idx) => {
          const entryForDay = entries.find(e => isSameDay(new Date(e.date), day));
          const isCurrentMonth = isSameMonth(day, calendarMonth);
          const isSelected = isSameDay(day, currentDate);
          const isTodayDay = isToday(day);

          return (
            <button
              key={idx}
              onClick={() => {
                setCurrentDate(day);
                setView('today');
              }}
              className={cn(
                "aspect-square p-2 flex flex-col items-center justify-between transition-all hover:z-10 relative group cursor-pointer",
                isCurrentMonth ? "bg-journal-paper" : "bg-journal-accent/[0.02] text-journal-accent/20",
                isSelected && "ring-2 ring-journal-accent/40 z-10",
                !isCurrentMonth && "pointer-events-none"
              )}
            >
              <span className={cn(
                "text-[10px] font-serif-display",
                isTodayDay && "bg-journal-accent text-journal-paper w-5 h-5 flex items-center justify-center rounded-full"
              )}>
                {format(day, 'd')}
              </span>
              
              {entryForDay && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col items-center gap-0.5"
                >
                  <span className="text-sm sm:text-lg transform group-hover:scale-125 transition-transform">
                    {MOODS.find(m => m.type === entryForDay.mood)?.emoji}
                  </span>
                  <div className="w-1 h-1 bg-journal-accent rounded-full opacity-40" />
                </motion.div>
              )}

              {isCurrentMonth && !entryForDay && (
                <Plus size={8} className="opacity-0 group-hover:opacity-20 transition-opacity" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto max-h-[25vh] pr-1">
        <div className="flex flex-wrap gap-4 justify-center">
          {MOODS.map(m => {
            const count = entries.filter(e => e.mood === m.type && isSameMonth(new Date(e.date), calendarMonth)).length;
            if (count === 0) return null;
            return (
              <div key={m.type} className="flex items-center gap-2 bg-journal-accent/5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest opacity-60">
                <span>{m.emoji}</span>
                <span>{m.label}</span>
                <span className="font-bold opacity-40">({count})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Page Number */}
      <div className="mt-auto pt-4 pb-4 flex justify-center">
        <div className="text-[10px] uppercase tracking-widest opacity-20 font-serif-display">
          Calendar
        </div>
      </div>
    </div>
  );
};
