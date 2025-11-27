'use client';
import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { getInitialData } from '@/lib/localStorage';
import DeparImporter from '@/components/reports/DeparImporterClean';

export default function ReportsPage() {
  const [data, setData] = useState({ categories: [], items: [], totalItems: 0 });

  useEffect(() => {
    const inventoryData = getInitialData();
    setData({
      categories: inventoryData.categories,
      items: inventoryData.items,
      totalItems: inventoryData.items.length,
    });
  }, []);

  return (
    <Layout>
      <div className="content">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Relatórios</h1>
          <p className="text-gray-600 dark:text-gray-400">Ferramentas para comparar planilhas e gerar relatórios.</p>
        </div>

        <div className="space-y-6">
          <DeparImporter />
        </div>
      </div>
    </Layout>
  );
}
