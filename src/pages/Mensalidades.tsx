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
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Pencil, Trash2, CalendarDays, CheckCircle2, Clock, X as XIcon } from 'lucide-react';

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
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editMensMonth, setEditMensMonth] = useState<string | null>(null);
  const [editMensValor, setEditMensValor] = useState('');

  const mesAtualStr = format(new Date(), 'yyyy-MM');

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

  // Detail: temporal grid for a mensalidade
  const detailMensalidade = detailId ? dados.mensalidades.find(m => m.id === detailId) : null;

  const temporalGrid = detailMensalidade ? (() => {
    const m = detailMensalidade;
    const meses: { mes: string; valor: number; status: 'pago' | 'pendente' | 'inativo' | 'projecao'; transacaoId?: string }[] = [];
    let cursor = new Date(m.mesInicio + '-01');
    const limite = addMonths(new Date(), 12);
    while (cursor <= limite) {
      const mesStr = format(cursor, 'yyyy-MM');
      if (m.mesFim && mesStr > m.mesFim) break;
      const override = m.overridesMes[mesStr];
      const valor = override?.valor ?? m.valorPadrao;
      const isInativo = m.mesesInativos?.includes(mesStr);
      const trans = dados.transacoes.find(t => t.origemMensalidade === m.id && t.data.startsWith(mesStr));
      meses.push({
        mes: mesStr,
        valor,
        status: isInativo ? 'inativo' : trans ? trans.status : (mesStr <= mesAtualStr ? 'pendente' : 'projecao'),
        transacaoId: trans?.id,
      });
      cursor = addMonths(cursor, 1);
    }
    return meses;
  })() : [];

  const saveMensOverride = () => {
    if (!editMensMonth || !detailMensalidade) return;
    const valor = parseFloat(editMensValor.replace(',', '.'));
    const novas = dados.mensalidades.map(m => {
      if (m.id !== detailMensalidade.id) return m;
      const newOverrides = { ...m.overridesMes };
      if (editMensValor && !isNaN(valor) && valor > 0) {
        newOverrides[editMensMonth] = { ...(newOverrides[editMensMonth] || {}), valor };
      } else {
        if (newOverrides[editMensMonth]) {
          delete newOverrides[editMensMonth].valor;
          if (Object.keys(newOverrides[editMensMonth]).length === 0) delete newOverrides[editMensMonth];
        }
      }
      return { ...m, overridesMes: newOverrides };
    });
    let transacoes = dados.transacoes;
    const trans = dados.transacoes.find(t => t.origemMensalidade === detailMensalidade.id && t.data.startsWith(editMensMonth));
    if (trans && !isNaN(valor) && valor > 0) {
      transacoes = transacoes.map(t => t.id === trans.id ? { ...t, valor } : t);
    }
    atualizarDados({ ...dados, mensalidades: novas, transacoes });
    toast.success('Valor atualizado');
    setEditMensMonth(null);
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
              <Card key={m.id} className="cursor-pointer hover:ring-1 ring-primary/20 transition-all" onClick={() => setDetailId(m.id)}>
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
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Badge variant={m.ativa ? 'default' : 'secondary'} className="text-[9px] h-4">{m.ativa ? 'Ativa' : 'Inativa'}</Badge>
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

      {/* Create/Edit dialog */}
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

      {/* Detail dialog with temporal grid */}
      <Dialog open={!!detailId} onOpenChange={() => { setDetailId(null); setEditMensMonth(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {detailMensalidade?.descricao}
            </DialogTitle>
          </DialogHeader>
          {detailMensalidade && (
            <div className="space-y-3 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">Valor Padrão</p><p className="font-medium font-mono">{formatarMoeda(detailMensalidade.valorPadrao)}</p></div>
                <div><p className="text-muted-foreground text-xs">Vigência</p><p className="font-medium">{detailMensalidade.mesInicio} → {detailMensalidade.mesFim || '∞'}</p></div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-semibold mb-2">Lançamentos por Mês</p>
                <div className="space-y-1">
                  {temporalGrid.map(item => (
                    <div key={item.mes} className={`flex items-center justify-between p-2.5 rounded-lg text-sm ${
                      item.mes === mesAtualStr ? 'bg-primary/10 ring-1 ring-primary/20' :
                      item.status === 'inativo' ? 'opacity-40' : item.status === 'projecao' ? 'opacity-60 border border-dashed border-border' : 'bg-muted/50'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        {item.status === 'pago' && <CheckCircle2 className="h-4 w-4 text-success shrink-0" />}
                        {item.status === 'pendente' && <Clock className="h-4 w-4 text-warning shrink-0" />}
                        {item.status === 'inativo' && <XIcon className="h-4 w-4 text-muted-foreground shrink-0" />}
                        {item.status === 'projecao' && <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <span className="capitalize">{format(new Date(item.mes + '-01'), 'MMM/yy', { locale: ptBR })}</span>
                        {item.mes === mesAtualStr && <Badge className="text-[8px] h-3.5 bg-primary">Atual</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium font-mono">{formatarMoeda(item.valor)}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {item.status === 'pago' ? 'Pago' : item.status === 'pendente' ? 'Pendente' : item.status === 'inativo' ? 'Inativo' : 'Projeção'}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                          setEditMensMonth(item.mes);
                          const ov = detailMensalidade.overridesMes[item.mes];
                          setEditMensValor(ov?.valor?.toString() || '');
                        }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {editMensMonth && (
                <div className="flex items-end gap-2 pt-2 border-t">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Valor para {editMensMonth} (vazio = padrão)</Label>
                    <Input value={editMensValor} onChange={e => setEditMensValor(e.target.value)} placeholder={detailMensalidade.valorPadrao.toString()} inputMode="decimal" className="h-8" />
                  </div>
                  <Button size="sm" onClick={saveMensOverride} className="h-8">Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditMensMonth(null)} className="h-8">×</Button>
                </div>
              )}

              <div className="border-t pt-3">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { abrirEditar(detailMensalidade); setDetailId(null); }}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-1 text-xs" onClick={() => { excluir(detailMensalidade.id); setDetailId(null); }}>
                    <Trash2 className="h-3 w-3" /> Excluir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
