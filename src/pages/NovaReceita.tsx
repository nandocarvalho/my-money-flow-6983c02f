import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

function gerarMesesOptions() {
  const hoje = new Date();
  const meses: { value: string; label: string }[] = [];
  for (let i = -3; i <= 12; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    meses.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MM/yyyy'),
    });
  }
  return meses;
}

export default function NovaReceita() {
  const { dados, atualizarDados } = useFinance();
  const navigate = useNavigate();
  const mesesOptions = gerarMesesOptions();

  const [form, setForm] = useState({
    descricao: '',
    valor: '',
    mes: format(new Date(), 'yyyy-MM'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valor = parseFloat(form.valor.replace(',', '.'));
    if (!form.descricao || isNaN(valor) || valor <= 0) {
      toast.error('Preencha todos os campos corretamente');
      return;
    }
    if (!form.mes) {
      toast.error('Selecione o mês');
      return;
    }

    const novaReceita = {
      id: crypto.randomUUID(),
      data: `${form.mes}-01`,
      valor,
      descricao: form.descricao,
      categoriaId: dados.categorias[0]?.id || '',
      tipo: 'receita' as const,
      formaPagamento: 'pix' as const,
      status: 'pago' as const,
    };

    atualizarDados({
      ...dados,
      transacoes: [...dados.transacoes, novaReceita],
    });
    toast.success('Receita registrada!');
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nova Receita</h1>
        <p className="text-muted-foreground text-sm">Registre uma receita adicional para o mês</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Mês de referência</Label>
              <Select value={form.mes} onValueChange={v => setForm(f => ({ ...f, mes: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {mesesOptions.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Ex: Freelance, Bônus, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input
                value={form.valor}
                onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                placeholder="0,00"
                type="text"
                inputMode="decimal"
              />
            </div>

            <Button type="submit" className="w-full" size="lg">
              Salvar Receita
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
