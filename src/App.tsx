import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FinanceProvider } from "@/contexts/FinanceContext";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Lancamentos from "@/pages/Lancamentos";
import NovaDespesa from "@/pages/NovaDespesa";
import NovaReceita from "@/pages/NovaReceita";
import Categorias from "@/pages/Categorias";
import Patrimonio from "@/pages/Patrimonio";
import Relatorios from "@/pages/Relatorios";
import Configuracoes from "@/pages/Configuracoes";
import Mensalidades from "@/pages/Mensalidades";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <FinanceProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/lancamentos" element={<Lancamentos />} />
              <Route path="/nova-despesa" element={<NovaDespesa />} />
              <Route path="/nova-receita" element={<NovaReceita />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/mensalidades" element={<Mensalidades />} />
              <Route path="/patrimonio" element={<Patrimonio />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </FinanceProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
