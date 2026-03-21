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

  useEffect(() => {
    garantirTransacoesMes(mesAtual);
  }, [mesAtual, garantirTransacoesMes]);

  const resumo = calcularSaldoMes(dados.transacoes, mesAtual, dados);
  const gastosPorCategoria = calcularGastoPorCategoria(dados.transacoes, mesAtual, dados);

  // Receitas dialog
  const [receitasDialog, setReceitasDialog] = useState(false);
  const receitasMes = useMemo(() => dados.transacoes.filter(t => t.tipo === 'receita' && t.data.startsWith(mesAtual)), [dados.transacoes, mesAtual]);
  const [novaReceitaForm, setNovaReceitaForm] = useState({ descricao: '', valor: '' });
  const [editReceitaId, setEditReceitaId] = useState<string | null>(null);

  // Categoria detail dialog
  const [catDetailId, setCatDetailId] = useState<string | null>(null);
  const catDetail = catDetailId ? dados.categorias.find(c => c.id === catDetailId) : null;
  const catTransacoes = catDetailId ? getDespesasDoMesPorCategoria(dados.transacoes, mesAtual, catDetailId, dados) : [];

  // Orcamento edit dialog
  const [orcEditCat, setOrcEditCat] = useState<string | null>(null);
  const [orcEditValor, setOrcEditValor] = useState('');

  // Novo lançamento dialog (inline)
  const [novoDialogOpen, setNovoDialogOpen] = useState(false);
  const [novoDialogTipo, setNovoDialogTipo] = useState<'avista' | 'parcelado'>('avista');

  // Transaction detail from category view
  const [detailTransacao, setDetailTransacao] = useState<Transacao | null>(null);

  const adicionarReceita = () => {
    const valor = parseFloat(novaReceitaForm.valor.replace(',', '.'));
    if (!novaReceitaForm.descricao || isNaN(valor) || valor <= 0) { toast.error('Preencha corretamente'); return; }
    if (editReceitaId) {
      const novas = dados.transacoes.map(t => t.id === editReceitaId ? { ...t, descricao: novaReceitaForm.descricao, valor } : t);
      atualizarDados({ ...dados, transacoes: novas });
      toast.success('Receita atualizada!');
      setEditReceitaId(null);
    } else {
      const nova = { id: crypto.randomUUID(), data: `${mesAtual}-01`, valor, descricao: novaReceitaForm.descricao, categoriaId: dados.categorias[0]?.id || '', tipo: 'receita' as const, formaPagamento: 'pix' as const, status: 'pago' as const };
      atualizarDados({ ...dados, transacoes: [...dados.transacoes, nova] });
      toast.success('Receita adicionada!');
    }
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
    toast.success('Receita removida');
  };

  const salvarOrcamentoMes = () => {
    if (!orcEditCat) return;
    const valor = parseFloat(orcEditValor.replace(',', '.'));
    if (isNaN(valor) || valor < 0) { toast.error('Valor inválido'); return; }
    const newOverrides = { ...dados.orcamentoMes.overridesMes };
    if (!newOverrides[mesAtual]) newOverrides[mesAtual] = {};
    newOverrides[mesAtual] = { ...newOverrides[mesAtual], [orcEditCat]: valor };
    atualizarDados({ ...dados, orcamentoMes: { ...dados.orcamentoMes, overridesMes: newOverrides } });
    toast.success('Orçamento do mês atualizado!');
    setOrcEditCat(null);
  };

  const handleCatTransacaoClick = (t: Transacao) => {
    setCatDetailId(null);
    if (t.parcela) {
      const primeiraParcela = dados.transacoes
        .filter(x => x.parcela?.grupoId === t.parcela!.grupoId)
        .sort((a, b) => (a.parcela!.atual) - (b.parcela!.atual))[0];
      setDetailTransacao(primeiraParcela || t);
    } else {
      setDetailTransacao(t);
    }
  };

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setMesRef(subMonths(mesRef, 1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm capitalize">{mesLabel}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMesRef(addMonths(mesRef, 1))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Saldo do Mês</p>
                <p className={`text-2xl font-bold mt-1 ${resumo.saldo >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                  {formatarMoeda(resumo.saldo)}
                </p>
              </div>
              <div className={`p-2.5 rounded-xl ${resumo.saldo >= 0 ? 'bg-[hsl(var(--success)/0.1)]' : 'bg-destructive/10'}`}>
                <Wallet className={`h-5 w-5 ${resumo.saldo >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:ring-2 ring-primary/30 transition-all" onClick={() => setReceitasDialog(true)}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Receitas ▸</p>
                <p className="text-2xl font-bold mt-1 text-[hsl(var(--success))]">{formatarMoeda(resumo.receitas)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-[hsl(var(--success)/0.1)]">
                <ArrowUpRight className="h-5 w-5 text-[hsl(var(--success))]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Despesas</p>
                <p className="text-2xl font-bold mt-1 text-destructive">{formatarMoeda(resumo.despesas)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-destructive/10">
                <ArrowDownRight className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Patrimônio</p>
                <p className="text-2xl font-bold mt-1">{formatarMoeda(dados.investimento.saldo)}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget by category */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Orçamento por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {dados.categorias.map(cat => {
            const gasto = gastosPorCategoria[cat.id] || 0;
            const limite = getLimiteMesCategoria(dados, cat.id, mesAtual);
            const saldo = limite - gasto;
            const pct = limite > 0 ? Math.min((gasto / limite) * 100, 100) : 0;

            return (
              <div
                key={cat.id}
                className="space-y-1.5 cursor-pointer rounded-lg p-3 -mx-3 hover:bg-muted/50 transition-colors"
                onClick={() => setCatDetailId(cat.id)}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{cat.icone} {cat.nome}</span>
                  <div className="flex items-center gap-2">
                    <span className={gasto > limite ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                      {formatarMoeda(gasto)} / {formatarMoeda(limite)}
                    </span>
                    <span className={`text-xs ${saldo >= 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                      Saldo: {formatarMoeda(saldo)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setOrcEditCat(cat.id); setOrcEditValor(limite.toString()); }}
                      className="p-1 rounded hover:bg-muted"
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                </div>
                <div className="relative h-2 w-full rounded-full bg-[hsl(var(--success)/0.3)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-destructive transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Quick action buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button size="lg" className="h-auto py-4 flex-col gap-2" onClick={() => { setNovoDialogTipo('avista'); setNovoDialogOpen(true); }}>
          <MinusCircle className="h-5 w-5" />
          Nova Despesa
        </Button>
        <Button variant="outline" size="lg" className="h-auto py-4 flex-col gap-2 border-primary/30 text-primary" onClick={() => { setNovoDialogTipo('avista'); setNovoDialogOpen(true); }}>
          <CreditCard className="h-5 w-5" />
          + Créd. À Vista
        </Button>
        <Button variant="outline" size="lg" className="h-auto py-4 flex-col gap-2 border-primary/30 text-primary" onClick={() => { setNovoDialogTipo('parcelado'); setNovoDialogOpen(true); }}>
          <Layers className="h-5 w-5" />
          + Créd. Parcelado
        </Button>
      </div>

      {resumo.despesasPendentes > 0 && (
        <Card className="border-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.05)]">
          <CardContent className="p-5">
            <p className="text-sm font-medium text-[hsl(var(--warning))]">
              ⚠️ Você tem {formatarMoeda(resumo.despesasPendentes)} em despesas pendentes este mês
            </p>
          </CardContent>
        </Card>
      )}

      {/* Receitas detail dialog */}
      <Dialog open={receitasDialog} onOpenChange={setReceitasDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Receitas - {mesLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {receitasMes.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">{r.descricao}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(r.data + 'T12:00:00'), 'dd/MM/yyyy')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[hsl(var(--success))]">{formatarMoeda(r.valor)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => editarReceita(r.id)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removerReceita(r.id)}>
                    ×
                  </Button>
                </div>
              </div>
            ))}
            {receitasMes.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">Nenhuma receita neste mês</p>}
          </div>
          <div className="border-t pt-3 space-y-2 shrink-0">
            <p className="text-sm font-medium">{editReceitaId ? 'Editar Receita' : 'Adicionar Receita'}</p>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Descrição" value={novaReceitaForm.descricao} onChange={e => setNovaReceitaForm(f => ({ ...f, descricao: e.target.value }))} />
              <Input placeholder="Valor" value={novaReceitaForm.valor} onChange={e => setNovaReceitaForm(f => ({ ...f, valor: e.target.value }))} inputMode="decimal" />
            </div>
            <Button onClick={adicionarReceita} size="sm" className="w-full">{editReceitaId ? 'Atualizar' : 'Adicionar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category detail dialog */}
      <Dialog open={!!catDetailId} onOpenChange={() => setCatDetailId(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{catDetail?.icone} {catDetail?.nome} - Detalhamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 flex-1 overflow-y-auto">
            {catTransacoes.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-4">Nenhum lançamento nesta categoria</p>
            ) : catTransacoes.map(t => (
              <div
                key={t.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleCatTransacaoClick(t)}
              >
                <div>
                  <p className="text-sm font-medium">{t.descricao}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{format(new Date(t.data + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {t.formaPagamento === 'cartao' ? 'Cartão' : t.formaPagamento === 'pix' ? 'PIX' : t.formaPagamento === 'boleto' ? 'Boleto' : 'Dinheiro'}
                    </Badge>
                    {t.parcela && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t.parcela.atual}/{t.parcela.total}</Badge>}
                    {t.origemMensalidade && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Mensalidade</Badge>}
                  </div>
                </div>
                <span className="font-semibold text-sm text-destructive">{formatarMoeda(t.valor)}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-2 text-sm text-muted-foreground shrink-0">
            Total: <span className="font-semibold text-foreground">{formatarMoeda(catTransacoes.reduce((s, t) => s + t.valor, 0))}</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Orcamento edit dialog */}
      <Dialog open={!!orcEditCat} onOpenChange={() => setOrcEditCat(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Orçamento - {mesLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Limite para {dados.categorias.find(c => c.id === orcEditCat)?.nome} neste mês (R$)</Label>
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
