import React from 'react';
import { LayoutDashboard, PlusCircle, CalendarDays, BrainCircuit, Settings, Calendar, BarChart3, Clock, Zap, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { UserSettings } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  settings: UserSettings;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, settings, isMobileOpen, onCloseMobile }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'add-task', label: 'Add Task', icon: PlusCircle },
    { id: 'commitments', label: 'Commitments', icon: CalendarDays },
    { id: 'planner', label: 'Planner', icon: BrainCircuit, highlight: true },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'chat', label: 'AI Coach Chat', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Touch Swipe Gesture References and Handlers
  const touchStartX = React.useRef(0);
  const touchStartY = React.useRef(0);
  const touchCurrentX = React.useRef(0);
  const touchCurrentY = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchCurrentX.current = e.touches[0].clientX;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    touchCurrentY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    const swipeDistanceX = touchStartX.current - touchCurrentX.current;
    const swipeDistanceY = Math.abs(touchStartY.current - touchCurrentY.current);

    // If swiped left by more than 50px horizontally, and vertical movement was small (to prevent scroll close)
    if (swipeDistanceX > 50 && swipeDistanceY < 100 && onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Translucent overlay backdrop for mobile */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          id="sidebar-overlay"
        />
      )}

      <aside
        id="app-sidebar"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-[340px] bg-slate-950/98 backdrop-blur-3xl border-r border-slate-900/30 shadow-[4px_0_30px_rgba(0,0,0,0.6)] flex flex-col h-screen fixed top-0 overflow-y-auto z-50 transition-transform duration-300 ease-in-out md:translate-x-0 md:left-0 ${
          isMobileOpen
            ? 'translate-x-0 left-0 shadow-[0_0_50px_rgba(139,92,246,0.15)]'
            : '-translate-x-full left-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-28 px-8 border-b border-slate-900/40 flex items-center relative overflow-hidden group flex-shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl group-hover:bg-violet-600/20 transition-all duration-700"></div>
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl"></div>
          
          <div className="flex items-center gap-4 w-full relative z-10">
            <div className="p-3 rounded-xl bg-gradient-to-tr from-violet-600 via-purple-600 to-cyan-400 shadow-[0_0_20px_rgba(139,92,246,0.45)] animate-pulse flex-shrink-0 flex items-center justify-center w-12 h-12">
              <Zap className="w-6 h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-2xl font-bold font-sans tracking-tight text-white flex items-center gap-1 leading-none">
                Deadline<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">AI</span>
              </h1>
              <p className="text-[10px] font-mono tracking-widest text-violet-400/80 uppercase mt-1 leading-none">Adaptive scheduler</p>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-grow px-5 mt-6 pb-8 flex flex-col gap-2.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`group relative flex items-center justify-between w-full px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
                }`}
              >
                {/* Highlight background active animation */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-950/40 via-purple-950/30 to-transparent border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}

                {/* Glowing Indicator for active tab */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full bg-gradient-to-b from-purple-400 to-cyan-400 shadow-[0_0_10px_rgba(192,132,252,0.8)]" />
                )}

                <div className="flex items-center gap-3.5 relative z-10">
                  <Icon
                    className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
                      isActive
                        ? item.highlight
                          ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                          : 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]'
                        : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  <span className="font-sans font-medium tracking-wide">{item.label}</span>
                </div>

                {item.highlight && (
                  <span className="relative z-10 px-2 py-0.5 text-[9px] font-mono tracking-widest font-semibold uppercase rounded-full bg-cyan-950/60 text-cyan-400 border border-cyan-400/30 shadow-[0_0_8px_rgba(6,182,212,0.3)] animate-pulse">
                    AI Core
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer / User Profile Brief */}
        <div className="p-6 border-t border-violet-500/10 bg-slate-950/60 backdrop-blur-md flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] text-sm border border-white/10 uppercase">
                {settings.userName ? settings.userName.substring(0, 2) : 'NE'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border border-slate-950 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
            </div>
            <div className="min-w-0 flex-grow">
              <h4 className="text-sm font-semibold font-sans text-white truncate">{settings.userName || 'Netrunner'}</h4>
              <p className="text-[10px] font-mono text-slate-500 truncate uppercase tracking-widest">
                {settings.workMode} MODE ACTIVE
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
