import { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { calcularSaldoMes, calcularGastoPorCategoria, formatarMoeda, getLimiteMesCategoria, getDespesasDoMesPorCategoria } from '@/utils/financialCalculations';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowUpRight, ArrowDownRight, Wallet, MinusCircle, TrendingUp, ChevronLeft, ChevronRight, CreditCard, Layers, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Transacao } from '@/types/finance';
import NovoLancamentoDialog from '@/components/NovoLancamentoDialog';
import LancamentoDetailDialog from '@/components/LancamentoDetailDialog';

export default function Dashboard() {
  const { dados, atualizarDados, garantirTransacoesMes } = useFinance();
  const [mesRef, setMesRef] = useState(new Date());
  const mesAtual = format(mesRef, 'yyyy-MM');
  const mesLabel = format(mesRef, "MMMM 'de' yyyy", { locale: ptBR });

  useEffect(() => { garantirTransacoesMes(mesAtual); }, [mesAtual, garantirTransacoesMes]);

  const resumo = calcularSaldoMes(dados.transacoes, mesAtual, dados);
  const gastosPorCategoria = calcularGastoPorCategoria(dados.transacoes, mesAtual, dados);

  const [receitasDialog, setReceitasDialog] = useState(false);
  const receitasMes = useMemo(() => dados.transacoes.filter(t => t.tipo === 'receita' && t.data.startsWith(mesAtual)), [dados.transacoes, mesAtual]);
  const [novaReceitaForm, setNovaReceitaForm] = useState({ descricao: '', valor: '' });
  const [editReceitaId, setEditReceitaId] = useState<string | null>(null);

  const [catDetailId, setCatDetailId] = useState<string | null>(null);
  const catDetail = catDetailId ? dados.categorias.find(c => c.id === catDetailId) : null;
  const catTransacoes = catDetailId ? getDespesasDoMesPorCategoria(dados.transacoes, mesAtual, catDetailId, dados) : [];

  const [orcEditCat, setOrcEditCat] = useState<string | null>(null);
  const [orcEditValor, setOrcEditValor] = useState('');

  const [novoDialogOpen, setNovoDialogOpen] = useState(false);
  const [novoDialogTipo, setNovoDialogTipo] = useState<'avista' | 'parcelado'>('avista');
  const [detailTransacao, setDetailTransacao] = useState<Transacao | null>(null);

  const adicionarReceita = () => {
    const valor = parseFloat(novaReceitaForm.valor.replace(',', '.'));
    if (!novaReceitaForm.descricao || isNaN(valor) || valor <= 0) { toast.error('Preencha corretamente'); return; }
    if (editReceitaId) {
      const novas = dados.transacoes.map(t => t.id === editReceitaId ? { ...t, descricao: novaReceitaForm.descricao, valor } : t);
      atualizarDados({ ...dados, transacoes: novas });
      setEditReceitaId(null);
    } else {
      const nova = { id: crypto.randomUUID(), data: `${mesAtual}-01`, valor, descricao: novaReceitaForm.descricao, categoriaId: dados.categorias[0]?.id || '', tipo: 'receita' as const, formaPagamento: 'pix' as const, status: 'pago' as const };
      atualizarDados({ ...dados, transacoes: [...dados.transacoes, nova] });
    }
    toast.success(editReceitaId ? 'Atualizada!' : 'Adicionada!');
    setNovaReceitaForm({ descricao: '', valor: '' });
  };

  const editarReceita = (id: string) => {
    const t = dados.transacoes.find(x => x.id === id);
    if (!t) return;
    setNovaReceitaForm({ descricao: t.descricao, valor: t.valor.toString() });
    setEditReceitaId(id);
  };

  const removerReceita = (id: string) => {
    atualizarDados({ ...dados, transacoes: dados.transacoes.filter(t => t.id !== id) });
    toast.success('Removida');
  };

  const salvarOrcamentoMes = () => {
    if (!orcEditCat) return;
    const valor = parseFloat(orcEditValor.replace(',', '.'));
    if (isNaN(valor) || valor < 0) { toast.error('Valor inválido'); return; }
    const newOverrides = { ...dados.orcamentoMes.overridesMes };
    if (!newOverrides[mesAtual]) newOverrides[mesAtual] = {};
    newOverrides[mesAtual] = { ...newOverrides[mesAtual], [orcEditCat]: valor };
    atualizarDados({ ...dados, orcamentoMes: { ...dados.orcamentoMes, overridesMes: newOverrides } });
    toast.success('Orçamento atualizado!');
    setOrcEditCat(null);
  };

  const handleCatTransacaoClick = (t: Transacao) => {
    setCatDetailId(null);
    if (t.parcela) {
      const p = dados.transacoes.filter(x => x.parcela?.grupoId === t.parcela!.grupoId).sort((a, b) => a.parcela!.atual - b.parcela!.atual)[0];
      setDetailTransacao(p || t);
    } else {
      setDetailTransacao(t);
    }
  };

  const summaryCards = [
    { label: 'Saldo do Mês', value: resumo.saldo, color: resumo.saldo >= 0 ? 'text-success' : 'text-destructive', icon: Wallet, bg: resumo.saldo >= 0 ? 'bg-success/10' : 'bg-destructive/10', iconColor: resumo.saldo >= 0 ? 'text-success' : 'text-destructive' },
    { label: 'Receitas', value: resumo.receitas, color: 'text-success', icon: ArrowUpRight, bg: 'bg-success/10', iconColor: 'text-success', clickable: true, onClick: () => setReceitasDialog(true) },
    { label: 'Despesas', value: resumo.despesas, color: 'text-destructive', icon: ArrowDownRight, bg: 'bg-destructive/10', iconColor: 'text-destructive' },
    { label: 'Patrimônio', value: dados.investimento.saldo, color: 'text-primary', icon: TrendingUp, bg: 'bg-primary/10', iconColor: 'text-primary' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground capitalize">{mesLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMesRef(subMonths(mesRef, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMesRef(addMonths(mesRef, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((c, i) => (
          <Card
            key={i}
            className={`${c.clickable ? 'cursor-pointer hover:ring-1 ring-primary/30' : ''} transition-all`}
            onClick={c.onClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium">{c.label} {c.clickable ? '▸' : ''}</p>
                <div className={`p-1.5 rounded-lg ${c.bg}`}>
                  <c.icon className={`h-3.5 w-3.5 ${c.iconColor}`} />
                </div>
              </div>
              <p className={`text-lg font-bold font-mono ${c.color}`}>{formatarMoeda(c.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => { setNovoDialogTipo('avista'); setNovoDialogOpen(true); }}>
          <MinusCircle className="h-3.5 w-3.5" /> Nova Despesa
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => { setNovoDialogTipo('avista'); setNovoDialogOpen(true); }}>
          <CreditCard className="h-3.5 w-3.5" /> Créd. À Vista
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={() => { setNovoDialogTipo('parcelado'); setNovoDialogOpen(true); }}>
          <Layers className="h-3.5 w-3.5" /> Créd. Parcelado
        </Button>
      </div>

      {/* Budget by category */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Orçamento por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dados.categorias.map(cat => {
            const gasto = gastosPorCategoria[cat.id] || 0;
            const limite = getLimiteMesCategoria(dados, cat.id, mesAtual);
            const saldo = limite - gasto;
            const pct = limite > 0 ? Math.min((gasto / limite) * 100, 100) : 0;

            return (
              <div
                key={cat.id}
                className="cursor-pointer rounded-lg p-3 -mx-2 hover:bg-muted/50 transition-colors"
                onClick={() => setCatDetailId(cat.id)}
              >
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium text-[13px]">{cat.icone} {cat.nome}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground font-mono">
                      {formatarMoeda(gasto)} <span className="text-muted-foreground/60">/</span> {formatarMoeda(limite)}
                    </span>
                    <span className={`font-semibold font-mono ${saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {saldo >= 0 ? '+' : ''}{formatarMoeda(saldo)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOrcEditCat(cat.id); setOrcEditValor(limite.toString()); }}
                      className="p-0.5 rounded hover:bg-muted"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div className="relative h-1.5 w-full rounded-full bg-success/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-destructive' : pct >= 70 ? 'bg-warning' : 'bg-destructive/70'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {resumo.despesasPendentes > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-warning">
              ⚠️ {formatarMoeda(resumo.despesasPendentes)} em despesas pendentes
            </p>
          </CardContent>
        </Card>
      )}

      {/* Receitas dialog */}
      <Dialog open={receitasDialog} onOpenChange={setReceitasDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle className="text-base">Receitas — {mesLabel}</DialogTitle></DialogHeader>
          <div className="space-y-2 flex-1 overflow-y-auto">
            {receitasMes.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{r.descricao}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(r.data + 'T12:00:00'), 'dd/MM/yyyy')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-success font-mono">{formatarMoeda(r.valor)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editarReceita(r.id)}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removerReceita(r.id)}>×</Button>
                </div>
              </div>
            ))}
            {receitasMes.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">Nenhuma receita</p>}
          </div>
          <div className="border-t pt-3 space-y-2 shrink-0">
            <p className="text-xs font-medium">{editReceitaId ? 'Editar' : 'Nova'} Receita</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Descrição" value={novaReceitaForm.descricao} onChange={e => setNovaReceitaForm(f => ({ ...f, descricao: e.target.value }))} className="h-8 text-sm" />
              <Input placeholder="Valor" value={novaReceitaForm.valor} onChange={e => setNovaReceitaForm(f => ({ ...f, valor: e.target.value }))} inputMode="decimal" className="h-8 text-sm" />
            </div>
            <Button onClick={adicionarReceita} size="sm" className="w-full h-8">{editReceitaId ? 'Atualizar' : 'Adicionar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category detail */}
      <Dialog open={!!catDetailId} onOpenChange={() => setCatDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle className="text-base">{catDetail?.icone} {catDetail?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-1 flex-1 overflow-y-auto">
            {catTransacoes.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">Sem lançamentos</p>
            ) : catTransacoes.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => handleCatTransacaoClick(t)}>
                <div>
                  <p className="text-sm font-medium">{t.descricao}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{format(new Date(t.data + 'T12:00:00'), 'dd/MM')}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1">{t.formaPagamento === 'cartao' ? 'Cartão' : t.formaPagamento === 'pix' ? 'PIX' : t.formaPagamento === 'boleto' ? 'Boleto' : 'Dinheiro'}</Badge>
                    {t.parcela && <Badge variant="secondary" className="text-[10px] h-4 px-1">{t.parcela.atual}/{t.parcela.total}</Badge>}
                  </div>
                </div>
                <span className="font-semibold text-sm text-destructive font-mono">{formatarMoeda(t.valor)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-2 text-xs text-muted-foreground">
            Total: <span className="font-semibold text-foreground font-mono">{formatarMoeda(catTransacoes.reduce((s, t) => s + t.valor, 0))}</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Orcamento edit */}
      <Dialog open={!!orcEditCat} onOpenChange={() => setOrcEditCat(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Editar Orçamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Limite para {dados.categorias.find(c => c.id === orcEditCat)?.nome} — {mesLabel}</Label>
              <Input value={orcEditValor} onChange={e => setOrcEditValor(e.target.value)} inputMode="decimal" />
            </div>
            <Button onClick={salvarOrcamentoMes} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <NovoLancamentoDialog open={novoDialogOpen} onOpenChange={setNovoDialogOpen} tipo={novoDialogTipo} defaultCartao={true} mesRef={mesAtual} />
      <LancamentoDetailDialog transacao={detailTransacao} open={!!detailTransacao} onOpenChange={(v) => { if (!v) setDetailTransacao(null); }} mesKey={mesAtual} />
    </div>
  );
}
