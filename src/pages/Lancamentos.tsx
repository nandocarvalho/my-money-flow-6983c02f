import { useState, useMemo, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatarMoeda } from '@/utils/financialCalculations';
import { mesFaturaCartao } from '@/utils/fechamentoFatura';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, CreditCard, DollarSign, Receipt, Layers, Plus, Upload, ChevronDown, CalendarDays } from 'lucide-react';
import NovoLancamentoDialog from '@/components/NovoLancamentoDialog';
import CsvImportDialog from '@/components/CsvImportDialog';
import LancamentoDetailDialog from '@/components/LancamentoDetailDialog';
import NovaMensalidadeDialog from '@/components/NovaMensalidadeDialog';
import { Transacao } from '@/types/finance';

type Ordenacao = 'data' | 'valor' | 'categoria' | 'status';

export default function Lancamentos() {
  const { dados, atualizarDados, garantirTransacoesMes } = useFinance();
  const [mesRef, setMesRef] = useState(new Date());
  const [filtroCartao, setFiltroCartao] = useState(false);
  const [filtroMensalidade, setFiltroMensalidade] = useState(false);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('data');
  const [novoDialogOpen, setNovoDialogOpen] = useState(false);
  const [novoDialogTipo, setNovoDialogTipo] = useState<'avista' | 'parcelado'>('avista');
  const [novoDialogCartao, setNovoDialogCartao] = useState(false);
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [detailTransacao, setDetailTransacao] = useState<Transacao | null>(null);
  const [novaMensalidadeDialog, setNovaMensalidadeDialog] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['ac', 'pc', 'ms', 'an', 'pn']));

  const mesKey = format(mesRef, 'yyyy-MM');
  const mesLabel = format(mesRef, "MMMM 'de' yyyy", { locale: ptBR });

  useEffect(() => { garantirTransacoesMes(mesKey); }, [mesKey, garantirTransacoesMes]);

  const mensalidadesInativadasMes = useMemo(() => dados.mensalidades.filter(m => m.mesesInativos?.includes(mesKey)), [dados.mensalidades, mesKey]);

  const lancamentosMes = useMemo(() => {
    let filtered = dados.transacoes.filter(t => {
      if (t.tipo === 'receita') return false;
      if (filtroCartao && t.formaPagamento !== 'cartao') return false;
      if (filtroMensalidade && !t.origemMensalidade) return false;
      if (t.formaPagamento === 'cartao') return mesFaturaCartao(t.data, dados.fechamentoFatura) === mesKey;
      return t.data.startsWith(mesKey);
    });
    filtered.sort((a, b) => {
      switch (ordenacao) {
        case 'valor': return b.valor - a.valor;
        case 'categoria': return a.categoriaId.localeCompare(b.categoriaId);
        case 'status': return a.status.localeCompare(b.status);
        default: return a.data.localeCompare(b.data);
      }
    });
    return filtered;
  }, [dados.transacoes, mesKey, filtroCartao, filtroMensalidade, ordenacao, dados.fechamentoFatura]);

  const avistaCredito = lancamentosMes.filter(t => !t.parcela && !t.origemMensalidade && t.formaPagamento === 'cartao');
  const parceladoCredito = lancamentosMes.filter(t => !!t.parcela && t.formaPagamento === 'cartao');
  const mensalidades = lancamentosMes.filter(t => !!t.origemMensalidade);
  const avistaNaoCredito = lancamentosMes.filter(t => !t.parcela && !t.origemMensalidade && t.formaPagamento !== 'cartao');
  const parceladoNaoCredito = lancamentosMes.filter(t => !!t.parcela && t.formaPagamento !== 'cartao');

  const grupos = [
    { key: 'ac', label: '💳 À Vista Crédito', items: avistaCredito, color: 'text-primary', addTipo: 'avista' as const, addCartao: true },
    { key: 'pc', label: '💳 Parcelado Crédito', items: parceladoCredito, color: 'text-primary', addTipo: 'parcelado' as const, addCartao: true },
    { key: 'ms', label: '📅 Mensalidades', items: mensalidades, color: 'text-warning', isMensalidade: true },
    { key: 'an', label: '💰 À Vista', items: avistaNaoCredito, color: 'text-success', addTipo: 'avista' as const, addCartao: false },
    { key: 'pn', label: '📦 Parcelado', items: parceladoNaoCredito, color: 'text-muted-foreground', addTipo: 'parcelado' as const, addCartao: false },
  ];

  // Show all groups, even empty ones
  const totalGeral = lancamentosMes.reduce((s, t) => s + t.valor, 0);

  const toggleStatus = (id: string) => {
    const novas = dados.transacoes.map(t => t.id === id ? { ...t, status: t.status === 'pago' ? 'pendente' as const : 'pago' as const } : t);
    atualizarDados({ ...dados, transacoes: novas });
  };

  const handleTransacaoClick = (t: Transacao) => {
    if (t.parcela) {
      const p = dados.transacoes.filter(x => x.parcela?.grupoId === t.parcela!.grupoId).sort((a, b) => a.parcela!.atual - b.parcela!.atual)[0];
      setDetailTransacao(p || t);
    } else {
      setDetailTransacao(t);
    }
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const openAddForGroup = (g: typeof grupos[0]) => {
    if (g.isMensalidade) {
      setNovaMensalidadeDialog(true);
    } else {
      setNovoDialogTipo(g.addTipo!);
      setNovoDialogCartao(g.addCartao!);
      setNovoDialogOpen(true);
    }
  };

  const isCartao = (t: Transacao) => t.formaPagamento === 'cartao';

  const renderItem = (t: Transacao) => {
    const cat = dados.categorias.find(c => c.id === t.categoriaId);
    const showCheckbox = !isCartao(t); // Credit card items don't show pago toggle
    return (
      <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group" onClick={() => handleTransacaoClick(t)}>
        {showCheckbox ? (
          <Checkbox checked={t.status === 'pago'} onCheckedChange={() => toggleStatus(t.id)} onClick={(e) => e.stopPropagation()} className="shrink-0" />
        ) : (
          <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{t.descricao}</span>
            {t.parcela && <Badge variant="secondary" className="text-[10px] h-4 px-1">{t.parcela.atual}/{t.parcela.total}</Badge>}
            {t.origemMensalidade && <Badge variant="outline" className="text-[10px] h-4 px-1">Mensal</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-muted-foreground">{cat?.icone} {cat?.nome}</span>
            <span className="text-[11px] text-muted-foreground">{format(new Date(t.data + 'T12:00:00'), 'dd/MM')}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-destructive font-mono">-{formatarMoeda(t.valor)}</p>
          {!isCartao(t) && (
            <Badge variant={t.status === 'pago' ? 'default' : 'outline'} className={`text-[10px] h-4 px-1 ${t.status === 'pago' ? 'bg-success text-success-foreground' : ''}`}>
              {t.status === 'pago' ? 'Pago' : 'Pendente'}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Despesas</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus pagamentos</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMesRef(subMonths(mesRef, 1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-medium capitalize min-w-[120px] text-center">{format(mesRef, "MMM yyyy", { locale: ptBR })}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMesRef(addMonths(mesRef, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Switch checked={filtroCartao} onCheckedChange={v => { setFiltroCartao(v); if (v) setFiltroMensalidade(false); }} id="fc" className="scale-75" />
          <Label htmlFor="fc" className="text-xs cursor-pointer">Cartão</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <Switch checked={filtroMensalidade} onCheckedChange={v => { setFiltroMensalidade(v); if (v) setFiltroCartao(false); }} id="fm" className="scale-75" />
          <Label htmlFor="fm" className="text-xs cursor-pointer">Mensalidades</Label>
        </div>
        <Select value={ordenacao} onValueChange={v => setOrdenacao(v as Ordenacao)}>
          <SelectTrigger className="h-7 w-24 text-[11px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="data">Data</SelectItem>
            <SelectItem value="valor">Valor</SelectItem>
            <SelectItem value="categoria">Categoria</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Card><CardContent className="p-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-destructive shrink-0" />
          <div><p className="text-[10px] text-muted-foreground">Total</p><p className="font-bold text-xs font-mono">{formatarMoeda(totalGeral)}</p></div>
        </CardContent></Card>
        <Card className="cursor-pointer hover:ring-1 ring-primary/30" onClick={() => { setNovoDialogTipo('avista'); setNovoDialogCartao(false); setNovoDialogOpen(true); }}>
          <CardContent className="p-3 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1"><p className="text-[10px] text-muted-foreground">À Vista</p><p className="font-bold text-xs font-mono">{formatarMoeda(avistaCredito.reduce((s, t) => s + t.valor, 0) + avistaNaoCredito.reduce((s, t) => s + t.valor, 0))}</p></div>
            <Plus className="h-3 w-3 text-primary" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 ring-primary/30" onClick={() => { setNovoDialogTipo('parcelado'); setNovoDialogCartao(true); setNovoDialogOpen(true); }}>
          <CardContent className="p-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent-foreground shrink-0" />
            <div className="flex-1"><p className="text-[10px] text-muted-foreground">Parcelado</p><p className="font-bold text-xs font-mono">{formatarMoeda(parceladoCredito.reduce((s, t) => s + t.valor, 0) + parceladoNaoCredito.reduce((s, t) => s + t.valor, 0))}</p></div>
            <Plus className="h-3 w-3 text-primary" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 ring-primary/30" onClick={() => setNovaMensalidadeDialog(true)}>
          <CardContent className="p-3 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-warning shrink-0" />
            <div className="flex-1"><p className="text-[10px] text-muted-foreground">Mensalidades</p><p className="font-bold text-xs font-mono">{formatarMoeda(mensalidades.reduce((s, t) => s + t.valor, 0))}</p></div>
            <Plus className="h-3 w-3 text-primary" />
          </CardContent>
        </Card>
      </div>

      <Button variant="outline" size="sm" onClick={() => setCsvDialogOpen(true)} className="gap-1.5 h-7 text-xs">
        <Upload className="h-3 w-3" /> Importar Lctos Cred a Vista
      </Button>

      {/* Grouped items as collapsible */}
      <div className="space-y-3">
        {grupos.map(g => {
          const total = g.items.reduce((s, t) => s + t.valor, 0);
          const isOpen = expandedGroups.has(g.key);
          return (
            <Card key={g.key}>
              <CardContent className="p-0">
                <Collapsible open={isOpen} onOpenChange={() => toggleGroup(g.key)}>
                  <CollapsibleTrigger className="w-full">
                    <div className="px-4 py-2.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                        <span className={`text-xs font-semibold uppercase tracking-wider ${g.color}`}>{g.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{g.items.length}</Badge>
                        <span className="text-xs font-mono font-semibold text-destructive">{formatarMoeda(total)}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e) => { e.stopPropagation(); openAddForGroup(g); }}>
                          <Plus className="h-3.5 w-3.5 text-primary" />
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {g.items.length > 0 ? (
                      <div className="divide-y divide-border/50 border-t border-border">
                        {g.items.map(renderItem)}
                        {/* Add button at bottom */}
                        <div className="p-2">
                          <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground hover:text-primary gap-1" onClick={() => openAddForGroup(g)}>
                            <Plus className="h-3 w-3" /> Adicionar {g.isMensalidade ? 'Mensalidade' : 'Despesa'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-t border-border p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-2">Nenhum lançamento</p>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openAddForGroup(g)}>
                          <Plus className="h-3 w-3" /> Adicionar
                        </Button>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          );
        })}

        {mensalidadesInativadasMes.length > 0 && (
          <Card className="opacity-50">
            <CardContent className="p-0">
              <div className="px-4 py-2.5 border-b border-border">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">📅 Inativadas</span>
              </div>
              {mensalidadesInativadasMes.map(m => {
                const cat = dados.categorias.find(c => c.id === m.categoriaId);
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3">
                    <div className="flex-1">
                      <span className="text-sm line-through">{m.descricao}</span>
                      <span className="text-[11px] text-muted-foreground ml-2">{cat?.icone} {cat?.nome}</span>
                    </div>
                    <span className="text-sm text-muted-foreground line-through font-mono">{formatarMoeda(m.valorPadrao)}</span>
                    <Button variant="ghost" size="sm" className="text-[11px] h-6" onClick={() => {
                      const novas = dados.mensalidades.map(x => x.id !== m.id ? x : { ...x, mesesInativos: (x.mesesInativos || []).filter(mi => mi !== mesKey) });
                      atualizarDados({ ...dados, mensalidades: novas });
                      toast.success('Reativada');
                    }}>Reativar</Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      <NovoLancamentoDialog open={novoDialogOpen} onOpenChange={setNovoDialogOpen} tipo={novoDialogTipo} defaultCartao={novoDialogCartao} mesRef={mesKey} />
      <CsvImportDialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen} />
      <LancamentoDetailDialog transacao={detailTransacao} open={!!detailTransacao} onOpenChange={(v) => { if (!v) setDetailTransacao(null); }} mesKey={mesKey} />
      <NovaMensalidadeDialog open={novaMensalidadeDialog} onOpenChange={setNovaMensalidadeDialog} />
    </div>
  );
}
