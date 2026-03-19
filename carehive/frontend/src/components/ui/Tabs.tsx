'use client';

import { useState, type ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({ tabs, defaultTab, onChange, className = '' }: TabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id || '');

  function handleChange(id: string) {
    setActive(id);
    onChange?.(id);
  }

  const activeTab = tabs.find((t) => t.id === active);

  return (
    <div className={className}>
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700 mb-4 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              active === tab.id
                ? 'border-teal-500 text-teal-700 dark:text-teal-300'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab && <div>{activeTab.content}</div>}
    </div>
  );
}
