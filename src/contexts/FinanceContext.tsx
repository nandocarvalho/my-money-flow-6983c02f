import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { DadosFinanceiros } from '@/types/finance';
import { carregarDados, salvarDados } from '@/utils/localStorage';
import { gerarReceitasAutomaticas } from '@/utils/receitasAutomaticas';
import { format } from 'date-fns';

interface FinanceContextType {
  dados: DadosFinanceiros;
  atualizarDados: (novos: DadosFinanceiros) => void;
  recarregar: () => void;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [dados, setDados] = useState<DadosFinanceiros>(() => carregarDados());

  useEffect(() => {
    const mesAtual = format(new Date(), 'yyyy-MM');
    const novas = gerarReceitasAutomaticas(dados, mesAtual);
    if (novas.length > 0) {
      const atualizado = {
        ...dados,
        transacoes: [...dados.transacoes, ...novas],
      };
      salvarDados(atualizado);
      setDados(atualizado);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const atualizarDados = useCallback((novos: DadosFinanceiros) => {
    salvarDados(novos);
    setDados(novos);
  }, []);

  const recarregar = useCallback(() => {
    setDados(carregarDados());
  }, []);

  return (
    <FinanceContext.Provider value={{ dados, atualizarDados, recarregar }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
