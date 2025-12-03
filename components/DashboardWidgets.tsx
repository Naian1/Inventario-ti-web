'use client';
import { useState, useEffect } from 'react';
import { getInitialData, getActivities, getDuplicateConfig } from '@/lib/localStorage';
import type { Activity } from '@/lib/types';
import type { Category } from '@/lib/types';

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  description?: string;
  trend?: { value: number; isPositive: boolean };
}

export function StatsCard({ title, value, icon, gradient, description, trend }: StatsCardProps) {
  return (
    <div className="panel overflow-hidden relative group">
      <div className="relative z-10 text-gray-900">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-medium mb-1 text-gray-600">{title}</p>
            <p className="text-3xl font-bold">{value.toLocaleString('pt-BR')}</p>
          </div>
          <div className="w-12 h-12 bg-slate-700/10 rounded-xl flex items-center justify-center text-2xl">
            {icon}
          </div>
        </div>

        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}

        {trend && (
          <div className={`mt-2 flex items-center gap-1 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <svg className={`w-4 h-4 ${trend.isPositive ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% este mês</span>
          </div>
        )}
      </div>

      <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-gray-100 rounded-full group-hover:scale-105 transition-transform duration-300"></div>
    </div>
  );
}

export function CategoryDistribution() {
  const [data, setData] = useState<{ category: Category; count: number }[]>([]);

  useEffect(() => {
    const inventoryData = getInitialData();
    const distribution = inventoryData.categories.map((cat) => ({
      category: cat,
      count: inventoryData.items.filter((item) => item.categoryId === cat.id).length,
    }));
    setData(distribution.sort((a, b) => b.count - a.count));
  }, []);

  const total = data.reduce((sum, item) => sum + item.count, 0);

  const colors = [
    'bg-sky-500/70',
    'bg-indigo-500/70',
    'bg-rose-500/60',
    'bg-emerald-500/60',
    'bg-amber-500/60',
    'bg-rose-600/60',
  ];

  return (
    <div className="panel">
      <h3 className="text-lg font-semibold mb-4">Distribuição por Categoria</h3>
      
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Nenhuma categoria cadastrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.count / total) * 100 : 0;
            return (
              <div key={item.category.id}>
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="font-medium">{item.category.name}</span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {item.count} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${colors[index % colors.length]} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    setActivities(getActivities());
  }, []);

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'import':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3 3m0 0l-3-3m3 3V10" />
          </svg>
        );
      case 'create':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      case 'update':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      case 'delete':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'import': return 'bg-blue-500';
      case 'create': return 'bg-green-500';
      case 'update': return 'bg-indigo-500';
      case 'delete': return 'bg-red-500';
      case 'warning': return 'bg-amber-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="panel">
      <h3 className="text-lg font-semibold mb-4">Atividades Recentes</h3>
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-sm text-gray-500">Nenhuma atividade recente</div>
        ) : (
          <div className="max-h-64 overflow-y-auto pr-2">
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 group">
                  <div className={`w-10 h-10 ${getActivityColor(activity.type)} rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white">{activity.title}</p>
                    
                    {activity.itemName && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {activity.itemName}
                        </span>
                        {activity.categoryName && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-full">
                            {activity.categoryName}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {activity.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {activity.description}
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(activity.time).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function DuplicateMonitor() {
  const [groupsCount, setGroupsCount] = useState<number | null>(null);

  useEffect(() => {
    const data = getInitialData();
    const cfg = getDuplicateConfig();
    const fields = cfg.fields || [];
    if (!fields || fields.length === 0) {
      setGroupsCount(0);
      return;
    }

    // Normalização de valores
    const normalizeValue = (val: any): string => {
      const str = String(val ?? '').trim().toLowerCase();
      // Remove espaços extras
      return str.replace(/\s+/g, ' ');
    };

    // Criar um Map por campo (igual ao DuplicateWarnings)
    const fieldMaps = new Map<string, Map<string, any[]>>();
    fields.forEach((field) => {
      fieldMaps.set(field, new Map());
    });

    // Indexar items por cada campo
    data.items.forEach((item) => {
      fields.forEach((field) => {
        const val = (item as any)[field];
        const normalized = normalizeValue(val);
        // Apenas indexar valores não-vazios
        if (normalized.length >= 2) {
          const fieldMap = fieldMaps.get(field)!;
          if (!fieldMap.has(normalized)) {
            fieldMap.set(normalized, []);
          }
          fieldMap.get(normalized)!.push(item);
        }
      });
    });

    // Contar grupos de duplicados (valores que aparecem mais de 1 vez)
    let totalGroups = 0;
    fieldMaps.forEach((fieldMap, fieldName) => {
      fieldMap.forEach((items, value) => {
        if (items.length > 1) {
          totalGroups++;
        }
      });
    });

    setGroupsCount(totalGroups);
  }, []);

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Monitor de Duplicados</h3>
      </div>
      <div>
        <div className="text-sm text-gray-600 mb-3">Grupos suspeitos de duplicados</div>
        <div className="text-2xl font-bold mb-3">{groupsCount === null ? '—' : groupsCount}</div>
        <div className="flex gap-2">
          <a href="/painel" className="px-3 py-1 border rounded text-sm text-blue-600">Ver Detalhes</a>
        </div>
      </div>
    </div>
  );
}

// Inline quick-actions panel removed. Use `QuickActionsFloating` for floating actions.
