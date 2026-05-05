"use client";
import React from 'react';

export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/95 backdrop-blur-xl animate-scale-in">
      <div className="relative">
        {/* Outer Glow / Ring */}
        <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-2xl animate-pulse-gentle"></div>
        
        {/* Branded Logo Container */}
        <div className="relative bg-white p-8 rounded-[3rem] shadow-2xl shadow-indigo-100 border border-slate-50 flex flex-col items-center">
          <div className="relative w-24 h-24 mb-6">
            <img 
              src="/logo.png" 
              alt="Loading" 
              className="w-full h-full object-contain animate-pulse-gentle"
            />
            
            {/* Orbital Ring */}
            <div className="absolute inset-[-12px] border-t-2 border-l-2 border-primary/40 rounded-full animate-spin-slow"></div>
            <div className="absolute inset-[-12px] border-b-2 border-r-2 border-accent/20 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '6s' }}></div>
          </div>
          
          <div className="flex flex-col items-center">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">EduStream AI</h3>
            <div className="flex gap-1.5 mt-3">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }}></span>
              <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-2 h-2 rounded-full bg-primary/30 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
            <p className="mt-6 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Synchronizing Knowledge</p>
          </div>
        </div>
      </div>
    </div>
  );
}
