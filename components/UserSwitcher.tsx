'use client';
import { useState, useEffect } from 'react';
import { getCurrentUser, setCurrentUser, isAdmin } from '@/lib/localStorage';

export function UserSwitcher() {
  const [currentUser, setCurrentUserState] = useState(getCurrentUser());
  const [isOpen, setIsOpen] = useState(false);

  const users = [
    { username: 'admin', role: 'admin' as const, label: 'Admin' },
    { username: 'usuario', role: 'user' as const, label: 'Usuário' },
  ];

  const switchUser = (user: { username: string; role: 'admin' | 'user' }) => {
    setCurrentUser(user);
    setCurrentUserState(user);
    setIsOpen(false);
    window.location.reload(); // Recarrega para aplicar permissões
  };

  const currentUserData = users.find(u => u.username === currentUser.username) || users[0];

  return (
    <div className="relative user-switcher">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`user-btn w-full p-3 rounded-lg bg-white/5 dark:bg-gray-800 text-gray-900 dark:text-white transition-all flex items-center justify-between`}
      >
        <div className="flex items-center gap-3 w-full">
          <div className="avatar w-9 h-9 rounded-lg bg-black text-white flex items-center justify-center font-semibold border-2 border-black shadow-sm">{currentUserData.username[0].toUpperCase()}</div>
          <div className="user-info flex-1 text-center">
            <div className="text-xs opacity-80 user-label">Logado como</div>
            <div className="font-semibold user-name">{currentUserData.label}</div>
          </div>
          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {users.map((user) => (
            <button
              key={user.username}
              onClick={() => switchUser(user)}
              className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                currentUser.username === user.username ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="font-medium">{user.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {user.role === 'admin' ? 'Pode gerenciar tudo' : 'Pode adicionar itens'}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
