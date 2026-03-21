import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { DadosFinanceiros } from '@/types/finance';
import { carregarDados, salvarDados } from '@/utils/localStorage';
import { gerarReceitasAutomaticas } from '@/utils/receitasAutomaticas';
import { gerarTransacoesMensalidades } from '@/utils/mensalidadesUtils';
import { format } from 'date-fns';

interface FinanceContextType {
  dados: DadosFinanceiros;
  atualizarDados: (novos: DadosFinanceiros) => void;
  recarregar: () => void;
  garantirTransacoesMes: (mes: string) => void;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [dados, setDados] = useState<DadosFinanceiros>(() => carregarDados());
  const mesesGerados = useRef<Set<string>>(new Set());

  const garantirTransacoesMes = useCallback((mes: string) => {
    if (mesesGerados.current.has(mes)) return;
    mesesGerados.current.add(mes);

    setDados(prev => {
      const receitasNovas = gerarReceitasAutomaticas(prev, mes);
      const mensalidadesNovas = gerarTransacoesMensalidades(prev, mes);
      const todasNovas = [...receitasNovas, ...mensalidadesNovas];
      if (todasNovas.length > 0) {
        const atualizado = { ...prev, transacoes: [...prev.transacoes, ...todasNovas] };
        salvarDados(atualizado);
        return atualizado;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const mesAtual = format(new Date(), 'yyyy-MM');
    garantirTransacoesMes(mesAtual);
  }, [garantirTransacoesMes]);

  const atualizarDados = useCallback((novos: DadosFinanceiros) => {
    setDados(prev => {
      // If mensalidades changed, clear mesesGerados so transactions regenerate
      if (JSON.stringify(prev.mensalidades) !== JSON.stringify(novos.mensalidades)) {
        mesesGerados.current.clear();
      }
      salvarDados(novos);
      return novos;
    });
  }, []);

  const recarregar = useCallback(() => {
    mesesGerados.current.clear();
    setDados(carregarDados());
  }, []);

  return (
    <FinanceContext.Provider value={{ dados, atualizarDados, recarregar, garantirTransacoesMes }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
