import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Mensalidade } from '@/types/finance';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function NovaMensalidadeDialog({ open, onOpenChange }: Props) {
  const { dados, atualizarDados } = useFinance();
  const [form, setForm] = useState({
    descricao: '',
    valorPadrao: '',
    categoriaId: dados.categorias[0]?.id || '',
    formaPagamento: 'boleto' as string,
    diaVencimento: '10',
    mesInicio: format(new Date(), 'yyyy-MM'),
  });

  const handleOpen = (v: boolean) => {
    if (v) setForm({ descricao: '', valorPadrao: '', categoriaId: dados.categorias[0]?.id || '', formaPagamento: 'boleto', diaVencimento: '10', mesInicio: format(new Date(), 'yyyy-MM') });
    onOpenChange(v);
  };

  const salvar = () => {
    const valor = parseFloat(form.valorPadrao.replace(',', '.'));
    const dia = parseInt(form.diaVencimento);
    if (!form.descricao || isNaN(valor) || valor <= 0 || isNaN(dia) || dia < 1 || dia > 28) {
      toast.error('Preencha todos os campos corretamente');
      return;
    }
    const nova: Mensalidade = {
      id: crypto.randomUUID(),
      descricao: form.descricao,
      valorPadrao: valor,
      categoriaId: form.categoriaId,
      formaPagamento: form.formaPagamento as any,
      diaVencimento: dia,
      mesInicio: form.mesInicio,
      ativa: true,
      overridesMes: {},
    };
    atualizarDados({ ...dados, mensalidades: [...dados.mensalidades, nova] });
    toast.success('Mensalidade criada!');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Mensalidade</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Internet, Água" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input value={form.valorPadrao} onChange={e => setForm(f => ({ ...f, valorPadrao: e.target.value }))} placeholder="0,00" inputMode="decimal" />
            </div>
            <div className="space-y-2">
              <Label>Dia Vencimento</Label>
              <Input type="number" min={1} max={28} value={form.diaVencimento} onChange={e => setForm(f => ({ ...f, diaVencimento: e.target.value }))} />
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
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={salvar} className="w-full">Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
