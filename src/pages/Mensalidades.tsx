import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatarMoeda } from '@/utils/financialCalculations';
import { Mensalidade } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Pencil, Trash2, CalendarDays } from 'lucide-react';

function gerarMesesOptions() {
  const hoje = new Date();
  const meses: { value: string; label: string }[] = [];
  for (let i = -6; i <= 24; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    meses.push({ value: format(d, 'yyyy-MM'), label: format(d, "MMM yyyy", { locale: ptBR }) });
  }
  return meses;
}

const mesesOpts = gerarMesesOptions();

interface MensalidadeForm {
  descricao: string;
  valorPadrao: string;
  categoriaId: string;
  formaPagamento: 'cartao' | 'boleto' | 'pix' | 'dinheiro';
  diaVencimento: string;
  mesInicio: string;
  mesFim: string;
  ativa: boolean;
}

const formVazio: MensalidadeForm = {
  descricao: '',
  valorPadrao: '',
  categoriaId: '',
  formaPagamento: 'boleto',
  diaVencimento: '10',
  mesInicio: format(new Date(), 'yyyy-MM'),
  mesFim: '',
  ativa: true,
};

export default function Mensalidades() {
  const { dados, atualizarDados } = useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MensalidadeForm>(formVazio);
  const [overrideDialog, setOverrideDialog] = useState<{ mensalidadeId: string; mes: string } | null>(null);
  const [overrideValor, setOverrideValor] = useState('');
  const [overrideDia, setOverrideDia] = useState('');

  const abrirNova = () => {
    setForm({ ...formVazio, categoriaId: dados.categorias[0]?.id || '' });
    setEditId(null);
    setDialogOpen(true);
  };

  const abrirEditar = (m: Mensalidade) => {
    setForm({
      descricao: m.descricao,
      valorPadrao: m.valorPadrao.toString(),
      categoriaId: m.categoriaId,
      formaPagamento: m.formaPagamento,
      diaVencimento: m.diaVencimento.toString(),
      mesInicio: m.mesInicio,
      mesFim: m.mesFim || '',
      ativa: m.ativa,
    });
    setEditId(m.id);
    setDialogOpen(true);
  };

  const salvar = () => {
    const valor = parseFloat(form.valorPadrao.replace(',', '.'));
    const dia = parseInt(form.diaVencimento);
    if (!form.descricao || isNaN(valor) || valor <= 0 || isNaN(dia) || dia < 1 || dia > 28) {
      toast.error('Preencha todos os campos corretamente (dia entre 1-28)');
      return;
    }

    const nova: Mensalidade = {
      id: editId || crypto.randomUUID(),
      descricao: form.descricao,
      valorPadrao: valor,
      categoriaId: form.categoriaId,
      formaPagamento: form.formaPagamento,
      diaVencimento: dia,
      mesInicio: form.mesInicio,
      mesFim: form.mesFim || undefined,
      ativa: form.ativa,
      overridesMes: editId ? (dados.mensalidades.find(m => m.id === editId)?.overridesMes || {}) : {},
    };

    const novas = editId
      ? dados.mensalidades.map(m => m.id === editId ? nova : m)
      : [...dados.mensalidades, nova];

    atualizarDados({ ...dados, mensalidades: novas });
    toast.success(editId ? 'Mensalidade atualizada!' : 'Mensalidade criada!');
    setDialogOpen(false);
  };

  const excluir = (id: string) => {
    atualizarDados({ ...dados, mensalidades: dados.mensalidades.filter(m => m.id !== id) });
    toast.success('Mensalidade removida');
  };

  const abrirOverride = (mensalidadeId: string) => {
    const mesAtual = format(new Date(), 'yyyy-MM');
    const m = dados.mensalidades.find(x => x.id === mensalidadeId);
    const ov = m?.overridesMes[mesAtual];
    setOverrideValor(ov?.valor?.toString() || '');
    setOverrideDia(ov?.diaVencimento?.toString() || '');
    setOverrideDialog({ mensalidadeId, mes: mesAtual });
  };

  const salvarOverride = () => {
    if (!overrideDialog) return;
    const { mensalidadeId, mes } = overrideDialog;
    const novas = dados.mensalidades.map(m => {
      if (m.id !== mensalidadeId) return m;
      const newOverrides = { ...m.overridesMes };
      const ov: { valor?: number; diaVencimento?: number } = {};
      if (overrideValor) ov.valor = parseFloat(overrideValor.replace(',', '.'));
      if (overrideDia) ov.diaVencimento = parseInt(overrideDia);
      if (ov.valor || ov.diaVencimento) {
        newOverrides[mes] = ov;
      } else {
        delete newOverrides[mes];
      }
      return { ...m, overridesMes: newOverrides };
    });
    atualizarDados({ ...dados, mensalidades: novas });
    toast.success('Override salvo!');
    setOverrideDialog(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mensalidades</h1>
          <p className="text-muted-foreground text-sm">Gerencie despesas recorrentes (água, luz, internet, etc.)</p>
        </div>
        <Button onClick={abrirNova} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova
        </Button>
      </div>

      {dados.mensalidades.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhuma mensalidade cadastrada
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {dados.mensalidades.map(m => {
            const cat = dados.categorias.find(c => c.id === m.categoriaId);
            return (
              <Card key={m.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{cat?.icone || '📋'}</div>
                      <div>
                        <p className="font-medium">{m.descricao}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatarMoeda(m.valorPadrao)}/mês</span>
                          <span>· Venc. dia {m.diaVencimento}</span>
                          <span>· {m.formaPagamento === 'cartao' ? 'Cartão' : m.formaPagamento === 'boleto' ? 'Boleto' : m.formaPagamento === 'pix' ? 'PIX' : 'Dinheiro'}</span>
                          {m.mesFim && <span>· Até {m.mesFim}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={m.ativa ? 'default' : 'secondary'}>
                        {m.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirOverride(m.id)}>
                        <CalendarDays className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => excluir(m.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog criar/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar' : 'Nova'} Mensalidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Internet, Água, Escola" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor Padrão (R$)</Label>
                <Input value={form.valorPadrao} onChange={e => setForm(f => ({ ...f, valorPadrao: e.target.value }))} placeholder="0,00" inputMode="decimal" />
              </div>
              <div className="space-y-2">
                <Label>Dia Vencimento (1-28)</Label>
                <Input type="number" min={1} max={28} value={form.diaVencimento} onChange={e => setForm(f => ({ ...f, diaVencimento: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoriaId} onValueChange={v => setForm(f => ({ ...f, categoriaId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dados.categorias.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.icone} {c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={form.formaPagamento} onValueChange={v => setForm(f => ({ ...f, formaPagamento: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Mês Início</Label>
                <Select value={form.mesInicio} onValueChange={v => setForm(f => ({ ...f, mesInicio: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {mesesOpts.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mês Fim (opcional)</Label>
                <Select value={form.mesFim || '__none__'} onValueChange={v => setForm(f => ({ ...f, mesFim: v === '__none__' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Indefinido" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Indefinido</SelectItem>
                    {mesesOpts.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativa</Label>
              <Switch checked={form.ativa} onCheckedChange={v => setForm(f => ({ ...f, ativa: v }))} />
            </div>
            <Button onClick={salvar} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog override mensal */}
      <Dialog open={!!overrideDialog} onOpenChange={() => setOverrideDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Mês Específico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Mês: {overrideDialog?.mes}</p>
            <div className="space-y-2">
              <Label>Valor (deixe vazio para usar padrão)</Label>
              <Input value={overrideValor} onChange={e => setOverrideValor(e.target.value)} placeholder="Valor padrão" inputMode="decimal" />
            </div>
            <div className="space-y-2">
              <Label>Dia Vencimento (deixe vazio para usar padrão)</Label>
              <Input type="number" min={1} max={28} value={overrideDia} onChange={e => setOverrideDia(e.target.value)} placeholder="Dia padrão" />
            </div>
            <Button onClick={salvarOverride} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
