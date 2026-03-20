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
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, CreditCard, DollarSign, Receipt, Layers, Plus, Upload, ArrowUpDown, CalendarDays } from 'lucide-react';
import NovoLancamentoDialog from '@/components/NovoLancamentoDialog';
import CsvImportDialog from '@/components/CsvImportDialog';
import LancamentoDetailDialog from '@/components/LancamentoDetailDialog';
import NovaMensalidadeDialog from '@/components/NovaMensalidadeDialog';
import { Transacao } from '@/types/finance';

type Ordenacao = 'data' | 'valor' | 'categoria' | 'status';
type Agrupamento = 'tipo' | 'categoria' | 'pagamento' | 'nenhum';

export default function Lancamentos() {
  const { dados, atualizarDados, garantirTransacoesMes } = useFinance();
  const [mesRef, setMesRef] = useState(new Date());
  const [filtroCartao, setFiltroCartao] = useState(false);
  const [filtroMensalidade, setFiltroMensalidade] = useState(false);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('data');
  const [agrupamento, setAgrupamento] = useState<Agrupamento>('tipo');
  const [novoDialogOpen, setNovoDialogOpen] = useState(false);
  const [novoDialogTipo, setNovoDialogTipo] = useState<'avista' | 'parcelado'>('avista');
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [detailTransacao, setDetailTransacao] = useState<Transacao | null>(null);
  const [novaMensalidadeDialog, setNovaMensalidadeDialog] = useState(false);

  const mesKey = format(mesRef, 'yyyy-MM');
  const mesLabel = format(mesRef, "MMMM 'de' yyyy", { locale: ptBR });

  useEffect(() => {
    garantirTransacoesMes(mesKey);
  }, [mesKey, garantirTransacoesMes]);

  // Get mensalidades inativadas no mês para mostrar no final
  const mensalidadesInativadasMes = useMemo(() => {
    return dados.mensalidades.filter(m => m.mesesInativos?.includes(mesKey));
  }, [dados.mensalidades, mesKey]);

  const lancamentosMes = useMemo(() => {
    let filtered = dados.transacoes.filter(t => {
      if (t.tipo === 'receita') return false;
      if (filtroCartao && t.formaPagamento !== 'cartao') return false;
      if (filtroMensalidade && !t.origemMensalidade) return false;
      if (t.formaPagamento === 'cartao') {
        return mesFaturaCartao(t.data, dados.fechamentoFatura) === mesKey;
      }
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

  const agrupar = (items: typeof lancamentosMes) => {
    if (agrupamento === 'nenhum') return { 'Todos': items };
    const groups: Record<string, typeof items> = {};
    items.forEach(t => {
      let key: string;
      switch (agrupamento) {
        case 'categoria':
          const cat = dados.categorias.find(c => c.id === t.categoriaId);
          key = cat ? `${cat.icone} ${cat.nome}` : 'Sem categoria';
          break;
        case 'pagamento':
          key = t.formaPagamento === 'cartao' ? '💳 Cartão' : t.formaPagamento === 'pix' ? '⚡ PIX' : t.formaPagamento === 'boleto' ? '📄 Boleto' : '💵 Dinheiro';
          break;
        default:
          key = t.origemMensalidade ? '📅 Mensalidades' : t.parcela ? '📦 Parcelados' : '💰 À Vista';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  };

  const grupos = agrupar(lancamentosMes);

  const totalGeral = lancamentosMes.reduce((s, t) => s + t.valor, 0);
  const aVista = lancamentosMes.filter(t => !t.parcela && !t.origemMensalidade);
  const parcelados = lancamentosMes.filter(t => !!t.parcela);
  const mensalidades = lancamentosMes.filter(t => !!t.origemMensalidade);
  const totalAVista = aVista.reduce((s, t) => s + t.valor, 0);
  const totalParcelado = parcelados.reduce((s, t) => s + t.valor, 0);
  const totalMensalidades = mensalidades.reduce((s, t) => s + t.valor, 0);

  const toggleStatus = (id: string) => {
    const novas = dados.transacoes.map(t =>
      t.id === id ? { ...t, status: t.status === 'pago' ? 'pendente' as const : 'pago' as const } : t
    );
    atualizarDados({ ...dados, transacoes: novas });
  };

  const renderItem = (t: typeof lancamentosMes[0]) => {
    const cat = dados.categorias.find(c => c.id === t.categoriaId);
    return (
      <Card key={t.id} className="group cursor-pointer hover:ring-1 ring-primary/20 transition-all" onClick={() => setDetailTransacao(t)}>
        <CardContent className="p-4 flex items-center gap-3">
          <Checkbox
            checked={t.status === 'pago'}
            onCheckedChange={(e) => { e && toggleStatus(t.id); }}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{t.descricao}</span>
              {t.parcela && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{t.parcela.atual}/{t.parcela.total}</Badge>}
              {t.origemMensalidade && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Mensalidade</Badge>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{cat?.icone} {cat?.nome}</span>
              <span className="text-xs text-muted-foreground">{format(new Date(t.data + 'T12:00:00'), 'dd/MM')}</span>
              {t.formaPagamento === 'cartao' && <CreditCard className="h-3 w-3 text-muted-foreground" />}
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-sm text-destructive">-{formatarMoeda(t.valor)}</p>
            <Badge variant={t.status === 'pago' ? 'default' : 'outline'} className={`text-[10px] ${t.status === 'pago' ? 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]' : ''}`}>
              {t.status === 'pago' ? 'Pago' : 'Pendente'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lançamentos</h1>
        <p className="text-muted-foreground text-sm">Gerencie seus pagamentos e despesas</p>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setMesRef(subMonths(mesRef, 1))}><ChevronLeft className="h-5 w-5" /></Button>
        <span className="font-semibold capitalize">{mesLabel}</span>
        <Button variant="ghost" size="icon" onClick={() => setMesRef(addMonths(mesRef, 1))}><ChevronRight className="h-5 w-5" /></Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={filtroCartao} onCheckedChange={v => { setFiltroCartao(v); if (v) setFiltroMensalidade(false); }} id="filtro-cartao" />
          <Label htmlFor="filtro-cartao" className="flex items-center gap-1.5 text-sm cursor-pointer"><CreditCard className="h-4 w-4" />Somente Cartão</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={filtroMensalidade} onCheckedChange={v => { setFiltroMensalidade(v); if (v) setFiltroCartao(false); }} id="filtro-mens" />
          <Label htmlFor="filtro-mens" className="flex items-center gap-1.5 text-sm cursor-pointer"><CalendarDays className="h-4 w-4" />Somente Mensalidades</Label>
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={ordenacao} onValueChange={v => setOrdenacao(v as Ordenacao)}>
            <SelectTrigger className="h-8 w-28 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="data">Data</SelectItem>
              <SelectItem value="valor">Valor</SelectItem>
              <SelectItem value="categoria">Categoria</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Select value={agrupamento} onValueChange={v => setAgrupamento(v as Agrupamento)}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tipo">Agrupar: Tipo</SelectItem>
              <SelectItem value="categoria">Agrupar: Categoria</SelectItem>
              <SelectItem value="pagamento">Agrupar: Pagamento</SelectItem>
              <SelectItem value="nenhum">Sem agrupamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Totals - 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-bold text-sm">{formatarMoeda(totalGeral)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 ring-primary/30" onClick={() => { setNovoDialogTipo('avista'); setNovoDialogOpen(true); }}>
          <CardContent className="p-4 flex items-center gap-3">
            <Receipt className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">À Vista</p>
              <p className="font-bold text-sm">{formatarMoeda(totalAVista)}</p>
            </div>
            <Plus className="h-4 w-4 text-primary" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 ring-primary/30" onClick={() => { setNovoDialogTipo('parcelado'); setNovoDialogOpen(true); }}>
          <CardContent className="p-4 flex items-center gap-3">
            <Layers className="h-5 w-5 text-accent-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Parcelado</p>
              <p className="font-bold text-sm">{formatarMoeda(totalParcelado)}</p>
            </div>
            <Plus className="h-4 w-4 text-primary" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 ring-primary/30" onClick={() => setNovaMensalidadeDialog(true)}>
          <CardContent className="p-4 flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Mensalidades</p>
              <p className="font-bold text-sm">{formatarMoeda(totalMensalidades)}</p>
            </div>
            <Plus className="h-4 w-4 text-primary" />
          </CardContent>
        </Card>
      </div>

      {/* CSV Import button */}
      <Button variant="outline" size="sm" onClick={() => setCsvDialogOpen(true)} className="gap-2">
        <Upload className="h-4 w-4" /> Importar Lctos Cred a Vista
      </Button>

      {/* Grouped items */}
      {lancamentosMes.length === 0 && mensalidadesInativadasMes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Nenhum lançamento neste mês</CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grupos).map(([group, items]) => (
            <div key={group} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{group} ({items.length})</h2>
              {items.map(renderItem)}
            </div>
          ))}

          {/* Mensalidades inativadas */}
          {mensalidadesInativadasMes.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">📅 Mensalidades Inativadas ({mensalidadesInativadasMes.length})</h2>
              {mensalidadesInativadasMes.map(m => {
                const cat = dados.categorias.find(c => c.id === m.categoriaId);
                return (
                  <Card key={m.id} className="opacity-40">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate line-through">{m.descricao}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inativa neste mês</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{cat?.icone} {cat?.nome}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-through">{formatarMoeda(m.valorPadrao)}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const novas = dados.mensalidades.map(x => {
                            if (x.id !== m.id) return x;
                            return { ...x, mesesInativos: (x.mesesInativos || []).filter(mi => mi !== mesKey) };
                          });
                          atualizarDados({ ...dados, mensalidades: novas });
                          toast.success('Mensalidade reativada para este mês');
                        }}
                      >
                        Reativar
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <NovoLancamentoDialog
        open={novoDialogOpen}
        onOpenChange={setNovoDialogOpen}
        tipo={novoDialogTipo}
        defaultCartao={filtroCartao}
        mesRef={mesKey}
      />

      <CsvImportDialog
        open={csvDialogOpen}
        onOpenChange={setCsvDialogOpen}
      />

      <LancamentoDetailDialog
        transacao={detailTransacao}
        open={!!detailTransacao}
        onOpenChange={(v) => { if (!v) setDetailTransacao(null); }}
        mesKey={mesKey}
      />

      {/* Nova Mensalidade dialog (inline simple version) */}
      <NovaMensalidadeInline open={novaMensalidadeDialog} onOpenChange={setNovaMensalidadeDialog} />
    </div>
  );
}

// Inline mensalidade creation dialog
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'; // re-import ok in same scope
import { Input } from '@/components/ui/input'; // re-import ok
import { Mensalidade } from '@/types/finance';

function NovaMensalidadeInline({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
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
