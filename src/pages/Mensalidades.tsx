import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatarMoeda } from '@/utils/financialCalculations';
import { Mensalidade } from '@/types/finance';
import { Card, CardContent } from '@/components/ui/card';
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
  return Array.from({ length: 31 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + i - 6, 1);
    return { value: format(d, 'yyyy-MM'), label: format(d, "MMM yyyy", { locale: ptBR }) };
  });
}
const mesesOpts = gerarMesesOptions();

interface MensalidadeForm {
  descricao: string; valorPadrao: string; categoriaId: string;
  formaPagamento: 'cartao' | 'boleto' | 'pix' | 'dinheiro';
  diaVencimento: string; mesInicio: string; mesFim: string; ativa: boolean;
}

const formVazio: MensalidadeForm = {
  descricao: '', valorPadrao: '', categoriaId: '', formaPagamento: 'boleto',
  diaVencimento: '10', mesInicio: format(new Date(), 'yyyy-MM'), mesFim: '', ativa: true,
};

export default function Mensalidades() {
  const { dados, atualizarDados } = useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MensalidadeForm>(formVazio);
  const [overrideDialog, setOverrideDialog] = useState<{ mensalidadeId: string; mes: string } | null>(null);
  const [overrideValor, setOverrideValor] = useState('');
  const [overrideDia, setOverrideDia] = useState('');

  const abrirNova = () => { setForm({ ...formVazio, categoriaId: dados.categorias[0]?.id || '' }); setEditId(null); setDialogOpen(true); };
  const abrirEditar = (m: Mensalidade) => {
    setForm({ descricao: m.descricao, valorPadrao: m.valorPadrao.toString(), categoriaId: m.categoriaId, formaPagamento: m.formaPagamento, diaVencimento: m.diaVencimento.toString(), mesInicio: m.mesInicio, mesFim: m.mesFim || '', ativa: m.ativa });
    setEditId(m.id); setDialogOpen(true);
  };

  const salvar = () => {
    const valor = parseFloat(form.valorPadrao.replace(',', '.'));
    const dia = parseInt(form.diaVencimento);
    if (!form.descricao || isNaN(valor) || valor <= 0 || isNaN(dia) || dia < 1 || dia > 28) { toast.error('Preencha corretamente'); return; }
    const nova: Mensalidade = { id: editId || crypto.randomUUID(), descricao: form.descricao, valorPadrao: valor, categoriaId: form.categoriaId, formaPagamento: form.formaPagamento, diaVencimento: dia, mesInicio: form.mesInicio, mesFim: form.mesFim || undefined, ativa: form.ativa, overridesMes: editId ? (dados.mensalidades.find(m => m.id === editId)?.overridesMes || {}) : {} };
    const novas = editId ? dados.mensalidades.map(m => m.id === editId ? nova : m) : [...dados.mensalidades, nova];
    atualizarDados({ ...dados, mensalidades: novas });
    toast.success(editId ? 'Atualizada!' : 'Criada!');
    setDialogOpen(false);
  };

  const excluir = (id: string) => { atualizarDados({ ...dados, mensalidades: dados.mensalidades.filter(m => m.id !== id) }); toast.success('Removida'); };

  const salvarOverride = () => {
    if (!overrideDialog) return;
    const { mensalidadeId, mes } = overrideDialog;
    const novas = dados.mensalidades.map(m => {
      if (m.id !== mensalidadeId) return m;
      const newOv = { ...m.overridesMes };
      const ov: { valor?: number; diaVencimento?: number } = {};
      if (overrideValor) ov.valor = parseFloat(overrideValor.replace(',', '.'));
      if (overrideDia) ov.diaVencimento = parseInt(overrideDia);
      if (ov.valor || ov.diaVencimento) newOv[mes] = ov; else delete newOv[mes];
      return { ...m, overridesMes: newOv };
    });
    atualizarDados({ ...dados, mensalidades: novas });
    toast.success('Override salvo!');
    setOverrideDialog(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Mensalidades</h1>
          <p className="text-sm text-muted-foreground">Despesas recorrentes</p>
        </div>
        <Button onClick={abrirNova} size="sm" className="gap-1.5 h-8 text-xs"><Plus className="h-3.5 w-3.5" /> Nova</Button>
      </div>

      {dados.mensalidades.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Nenhuma mensalidade</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {dados.mensalidades.map(m => {
            const cat = dados.categorias.find(c => c.id === m.categoriaId);
            const pgto = m.formaPagamento === 'cartao' ? 'Cartão' : m.formaPagamento === 'pix' ? 'PIX' : m.formaPagamento === 'boleto' ? 'Boleto' : 'Dinheiro';
            return (
              <Card key={m.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{cat?.icone || '📋'}</span>
                      <div>
                        <p className="text-sm font-medium">{m.descricao}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className="font-mono">{formatarMoeda(m.valorPadrao)}/mês</span>
                          <span>· Dia {m.diaVencimento}</span>
                          <span>· {pgto}</span>
                          {m.mesFim && <span>· Até {m.mesFim}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={m.ativa ? 'default' : 'secondary'} className="text-[9px] h-4">{m.ativa ? 'Ativa' : 'Inativa'}</Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        const mesAtual = format(new Date(), 'yyyy-MM');
                        const ov = m.overridesMes[mesAtual];
                        setOverrideValor(ov?.valor?.toString() || '');
                        setOverrideDia(ov?.diaVencimento?.toString() || '');
                        setOverrideDialog({ mensalidadeId: m.id, mes: mesAtual });
                      }}><CalendarDays className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrirEditar(m)}><Pencil className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => excluir(m.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-base">{editId ? 'Editar' : 'Nova'} Mensalidade</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Descrição</Label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Internet" className="h-8" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-xs">Valor (R$)</Label><Input value={form.valorPadrao} onChange={e => setForm(f => ({ ...f, valorPadrao: e.target.value }))} className="h-8" inputMode="decimal" /></div>
              <div className="space-y-1"><Label className="text-xs">Dia Vencimento</Label><Input type="number" min={1} max={28} value={form.diaVencimento} onChange={e => setForm(f => ({ ...f, diaVencimento: e.target.value }))} className="h-8" /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Categoria</Label>
              <Select value={form.categoriaId} onValueChange={v => setForm(f => ({ ...f, categoriaId: v }))}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{dados.categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.icone} {c.nome}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Pagamento</Label>
              <Select value={form.formaPagamento} onValueChange={v => setForm(f => ({ ...f, formaPagamento: v as any }))}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="boleto">Boleto</SelectItem><SelectItem value="cartao">Cartão</SelectItem><SelectItem value="pix">PIX</SelectItem><SelectItem value="dinheiro">Dinheiro</SelectItem></SelectContent></Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-xs">Início</Label><Select value={form.mesInicio} onValueChange={v => setForm(f => ({ ...f, mesInicio: v }))}><SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{mesesOpts.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1"><Label className="text-xs">Fim (opcional)</Label><Select value={form.mesFim || '__none__'} onValueChange={v => setForm(f => ({ ...f, mesFim: v === '__none__' ? '' : v }))}><SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Indefinido" /></SelectTrigger><SelectContent><SelectItem value="__none__">Indefinido</SelectItem>{mesesOpts.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="flex items-center justify-between"><Label className="text-xs">Ativa</Label><Switch checked={form.ativa} onCheckedChange={v => setForm(f => ({ ...f, ativa: v }))} /></div>
            <Button onClick={salvar} className="w-full h-8 text-sm">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!overrideDialog} onOpenChange={() => setOverrideDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Editar Mês</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{overrideDialog?.mes}</p>
            <div className="space-y-1"><Label className="text-xs">Valor (vazio = padrão)</Label><Input value={overrideValor} onChange={e => setOverrideValor(e.target.value)} className="h-8" inputMode="decimal" /></div>
            <div className="space-y-1"><Label className="text-xs">Dia (vazio = padrão)</Label><Input type="number" min={1} max={28} value={overrideDia} onChange={e => setOverrideDia(e.target.value)} className="h-8" /></div>
            <Button onClick={salvarOverride} className="w-full h-8 text-sm">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
