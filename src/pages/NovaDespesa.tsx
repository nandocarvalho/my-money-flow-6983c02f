import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { gerarParcelas } from '@/utils/financialCalculations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function NovaDespesa() {
  const { dados, atualizarDados } = useFinance();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    descricao: '',
    valor: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    categoriaId: dados.categorias[0]?.id || '',
    formaPagamento: 'pix' as 'cartao' | 'boleto' | 'pix' | 'dinheiro',
    parcelado: false,
    parcelas: '2',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valor = parseFloat(form.valor.replace(',', '.'));
    if (!form.descricao || isNaN(valor) || valor <= 0) {
      toast.error('Preencha todos os campos corretamente');
      return;
    }

    const base = {
      data: form.data,
      valor,
      descricao: form.descricao,
      categoriaId: form.categoriaId,
      tipo: 'despesa' as const,
      formaPagamento: form.formaPagamento,
      status: 'pendente' as const,
    };

    let novasTransacoes;
    if (form.parcelado) {
      const numParcelas = parseInt(form.parcelas);
      if (numParcelas < 2 || numParcelas > 48) {
        toast.error('Parcelas devem ser entre 2 e 48');
        return;
      }
      novasTransacoes = gerarParcelas(base, numParcelas, valor);
      toast.success(`${numParcelas} parcelas de ${(valor / numParcelas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} criadas!`);
    } else {
      novasTransacoes = [{ ...base, id: crypto.randomUUID() }];
      toast.success('Despesa registrada!');
    }

    atualizarDados({
      ...dados,
      transacoes: [...dados.transacoes, ...novasTransacoes],
    });
    navigate('/lancamentos');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nova Despesa</h1>
        <p className="text-muted-foreground text-sm">Registre uma nova despesa</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Supermercado"
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
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.data}
                  onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.categoriaId} onValueChange={v => setForm(f => ({ ...f, categoriaId: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dados.categorias.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icone} {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento</Label>
                <Select value={form.formaPagamento} onValueChange={v => setForm(f => ({ ...f, formaPagamento: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 p-4 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <Label>Parcelado?</Label>
                <Switch
                  checked={form.parcelado}
                  onCheckedChange={v => setForm(f => ({ ...f, parcelado: v }))}
                />
              </div>
              {form.parcelado && (
                <div className="space-y-2">
                  <Label>Número de Parcelas</Label>
                  <Input
                    type="number"
                    min={2}
                    max={48}
                    value={form.parcelas}
                    onChange={e => setForm(f => ({ ...f, parcelas: e.target.value }))}
                  />
                  {form.valor && !isNaN(parseFloat(form.valor.replace(',', '.'))) && (
                    <p className="text-sm text-muted-foreground">
                      {form.parcelas}x de {(parseFloat(form.valor.replace(',', '.')) / parseInt(form.parcelas || '1')).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg">
              Salvar Despesa
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
