import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { gerarParcelas } from '@/utils/financialCalculations';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: 'avista' | 'parcelado';
  defaultCartao: boolean;
  mesRef: string;
}

export default function NovoLancamentoDialog({ open, onOpenChange, tipo, defaultCartao, mesRef }: Props) {
  const { dados, atualizarDados } = useFinance();

  const [form, setForm] = useState({
    descricao: '',
    valor: '',
    data: format(new Date(), 'yyyy-MM-dd'),
    categoriaId: dados.categorias[0]?.id || '',
    formaPagamento: defaultCartao ? 'cartao' : 'pix' as string,
    parcelas: '2',
  });

  // Reset form when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setForm({
        descricao: '',
        valor: '',
        data: format(new Date(), 'yyyy-MM-dd'),
        categoriaId: dados.categorias[0]?.id || '',
        formaPagamento: defaultCartao ? 'cartao' : 'pix',
        parcelas: '2',
      });
    }
    onOpenChange(v);
  };

  const handleSubmit = () => {
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
      formaPagamento: form.formaPagamento as any,
      status: 'pendente' as const,
    };

    let novas;
    if (tipo === 'parcelado') {
      const numParcelas = parseInt(form.parcelas);
      if (numParcelas < 2 || numParcelas > 48) { toast.error('Parcelas: 2-48'); return; }
      novas = gerarParcelas(base, numParcelas, valor);
      toast.success(`${numParcelas} parcelas criadas!`);
    } else {
      novas = [{ ...base, id: crypto.randomUUID() }];
      toast.success('Lançamento adicionado!');
    }

    atualizarDados({ ...dados, transacoes: [...dados.transacoes, ...novas] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lançamento {tipo === 'parcelado' ? 'Parcelado' : 'À Vista'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Supermercado" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" inputMode="decimal" />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoriaId} onValueChange={v => setForm(f => ({ ...f, categoriaId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dados.categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.icone} {c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Pagamento</Label>
              <Select value={form.formaPagamento} onValueChange={v => setForm(f => ({ ...f, formaPagamento: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {tipo === 'parcelado' && (
            <div className="space-y-2">
              <Label>Parcelas</Label>
              <Input type="number" min={2} max={48} value={form.parcelas} onChange={e => setForm(f => ({ ...f, parcelas: e.target.value }))} />
              {form.valor && !isNaN(parseFloat(form.valor.replace(',', '.'))) && (
                <p className="text-sm text-muted-foreground">
                  {form.parcelas}x de {(parseFloat(form.valor.replace(',', '.')) / parseInt(form.parcelas || '1')).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              )}
            </div>
          )}
          <Button onClick={handleSubmit} className="w-full">Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
