import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatarMoeda } from '@/utils/financialCalculations';
import { mesFaturaCartao } from '@/utils/fechamentoFatura';
import { CartaoCredito as CartaoCreditoType, Transacao } from '@/types/finance';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { CreditCard, Plus, Pencil, Trash2, ChevronRight, Receipt, Layers, History } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CartaoCreditoPage() {
  const { dados, atualizarDados, garantirTransacoesMes } = useFinance();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(dados.cartoes[0]?.id || null);
  const [cardDialog, setCardDialog] = useState(false);
  const [editCardId, setEditCardId] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState({ nome: '', limite: '', diaFechamento: '4', diaVencimento: '15', cor: '221 83% 53%' });
  const [faturaDetailMes, setFaturaDetailMes] = useState<string | null>(null);

  const selectedCard = dados.cartoes.find(c => c.id === selectedCardId);

  const hoje = new Date();
  const mesAtual = format(hoje, 'yyyy-MM');

  // Get all transactions for selected card
  const cardTransacoes = useMemo(() => {
    if (!selectedCardId) return [];
    return dados.transacoes.filter(t => t.formaPagamento === 'cartao' && (t.cartaoId === selectedCardId || (!t.cartaoId && selectedCardId === dados.cartoes[0]?.id)));
  }, [dados.transacoes, selectedCardId, dados.cartoes]);

  // Histórico: purchases by purchase date (for installments, show the group, not each parcela)
  const historicoPurchases = useMemo(() => {
    const seen = new Set<string>();
    const result: Transacao[] = [];
    cardTransacoes.forEach(t => {
      if (t.tipo !== 'despesa') return;
      if (t.parcela) {
        if (seen.has(t.parcela.grupoId)) return;
        seen.add(t.parcela.grupoId);
        // Get first parcela of group
        const first = dados.transacoes.filter(x => x.parcela?.grupoId === t.parcela!.grupoId).sort((a, b) => a.parcela!.atual - b.parcela!.atual)[0];
        result.push(first || t);
      } else {
        result.push(t);
      }
    });
    return result.sort((a, b) => b.data.localeCompare(a.data));
  }, [cardTransacoes, dados.transacoes]);

  // Faturas: group by fatura month
  const faturas = useMemo(() => {
    const meses: string[] = [];
    for (let i = -6; i <= 6; i++) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      meses.push(format(d, 'yyyy-MM'));
    }
    // Ensure transactions generate for future months
    meses.forEach(m => garantirTransacoesMes(m));

    return meses.map(mes => {
      const lctos = cardTransacoes.filter(t => t.tipo === 'despesa' && mesFaturaCartao(t.data, dados.fechamentoFatura) === mes);
      const avista = lctos.filter(t => !t.parcela);
      const parcelado = lctos.filter(t => !!t.parcela);
      const total = lctos.reduce((s, t) => s + t.valor, 0);
      return { mes, total, avista, parcelado, totalAvista: avista.reduce((s, t) => s + t.valor, 0), totalParcelado: parcelado.reduce((s, t) => s + t.valor, 0), isProjecao: mes > mesAtual, isAtual: mes === mesAtual };
    });
  }, [cardTransacoes, dados.fechamentoFatura, mesAtual, garantirTransacoesMes]);

  // Parcelamentos do cartão
  const parcelamentos = useMemo(() => {
    const grupos = new Map<string, Transacao[]>();
    cardTransacoes.filter(t => t.parcela).forEach(t => {
      const key = t.parcela!.grupoId;
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key)!.push(t);
    });
    return Array.from(grupos.entries()).map(([grupoId, parcelas]) => {
      const sorted = parcelas.sort((a, b) => a.parcela!.atual - b.parcela!.atual);
      const pagas = sorted.filter(p => p.status === 'pago').length;
      const total = sorted.reduce((s, p) => s + p.valor, 0);
      return { grupoId, descricao: sorted[0].descricao, parcelas: sorted, totalParcelas: sorted[0].parcela!.total, pagas, pendentes: sorted.length - pagas, valorTotal: total, valorParcela: sorted[0].valor, primeiraFatura: sorted[0].data, ultimaFatura: sorted[sorted.length - 1].data, encerrado: pagas === sorted.length };
    }).sort((a, b) => b.primeiraFatura.localeCompare(a.primeiraFatura));
  }, [cardTransacoes]);

  const abrirNovoCartao = () => {
    setCardForm({ nome: '', limite: '', diaFechamento: '4', diaVencimento: '15', cor: '221 83% 53%' });
    setEditCardId(null);
    setCardDialog(true);
  };

  const abrirEditarCartao = (c: CartaoCreditoType) => {
    setCardForm({ nome: c.nome, limite: c.limite.toString(), diaFechamento: c.diaFechamento.toString(), diaVencimento: c.diaVencimento.toString(), cor: c.cor });
    setEditCardId(c.id);
    setCardDialog(true);
  };

  const salvarCartao = () => {
    const limite = parseFloat(cardForm.limite.replace(',', '.'));
    const diaF = parseInt(cardForm.diaFechamento);
    const diaV = parseInt(cardForm.diaVencimento);
    if (!cardForm.nome || isNaN(limite) || isNaN(diaF) || isNaN(diaV) || diaF < 1 || diaF > 28 || diaV < 1 || diaV > 28) {
      toast.error('Preencha corretamente'); return;
    }
    const card: CartaoCreditoType = { id: editCardId || crypto.randomUUID(), nome: cardForm.nome, limite, diaFechamento: diaF, diaVencimento: diaV, cor: cardForm.cor };
    const novas = editCardId ? dados.cartoes.map(c => c.id === editCardId ? card : c) : [...dados.cartoes, card];

    // If editing, also update fechamentoFatura if it's the first card
    let fechamento = dados.fechamentoFatura;
    if (editCardId === dados.cartoes[0]?.id || (!editCardId && dados.cartoes.length === 0)) {
      fechamento = { ...fechamento, diaPadrao: diaF, diaVencimento: diaV };
    }

    atualizarDados({ ...dados, cartoes: novas, fechamentoFatura: fechamento });
    if (!selectedCardId || !editCardId) setSelectedCardId(card.id);
    toast.success(editCardId ? 'Cartão atualizado!' : 'Cartão criado!');
    setCardDialog(false);
  };

  const excluirCartao = (id: string) => {
    if (dados.cartoes.length <= 1) { toast.error('Mantenha pelo menos um cartão'); return; }
    atualizarDados({ ...dados, cartoes: dados.cartoes.filter(c => c.id !== id) });
    if (selectedCardId === id) setSelectedCardId(dados.cartoes.find(c => c.id !== id)?.id || null);
    toast.success('Cartão removido');
  };

  // Fatura detail
  const faturaDetail = faturaDetailMes ? faturas.find(f => f.mes === faturaDetailMes) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><CreditCard className="h-5 w-5" /> Cartão de Crédito</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus cartões e faturas</p>
        </div>
        <Button onClick={abrirNovoCartao} size="sm" className="gap-1.5 h-8 text-xs"><Plus className="h-3.5 w-3.5" /> Novo Cartão</Button>
      </div>

      {/* Card selector */}
      <div className="flex gap-2 flex-wrap">
        {dados.cartoes.map(c => (
          <Card key={c.id} className={`cursor-pointer transition-all ${selectedCardId === c.id ? 'ring-2 ring-primary' : 'hover:ring-1 ring-primary/30'}`} onClick={() => setSelectedCardId(c.id)}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `hsl(${c.cor} / 0.15)` }}>
                <CreditCard className="h-4 w-4" style={{ color: `hsl(${c.cor})` }} />
              </div>
              <div>
                <p className="text-sm font-medium">{c.nome}</p>
                <p className="text-[10px] text-muted-foreground">Limite: {formatarMoeda(c.limite)} · Fech: {c.diaFechamento} · Venc: {c.diaVencimento}</p>
              </div>
              <div className="flex gap-1 ml-2">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={e => { e.stopPropagation(); abrirEditarCartao(c); }}><Pencil className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={e => { e.stopPropagation(); excluirCartao(c.id); }}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedCard && (
        <Tabs defaultValue="faturas" className="space-y-4">
          <TabsList>
            <TabsTrigger value="faturas" className="gap-1.5 text-xs"><Receipt className="h-3.5 w-3.5" /> Faturas</TabsTrigger>
            <TabsTrigger value="historico" className="gap-1.5 text-xs"><History className="h-3.5 w-3.5" /> Histórico</TabsTrigger>
            <TabsTrigger value="parcelamentos" className="gap-1.5 text-xs"><Layers className="h-3.5 w-3.5" /> Parcelamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="faturas">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px]">Fatura</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                      <TableHead className="text-right text-[11px]">À Vista</TableHead>
                      <TableHead className="text-right text-[11px]">Parcelado</TableHead>
                      <TableHead className="text-right text-[11px]">Total</TableHead>
                      <TableHead className="text-[11px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faturas.map(f => (
                      <TableRow key={f.mes} className={f.isAtual ? 'bg-primary/5' : f.isProjecao ? 'opacity-60' : ''}>
                        <TableCell className="capitalize text-xs font-medium">{format(new Date(f.mes + '-01'), 'MMM/yy', { locale: ptBR })}</TableCell>
                        <TableCell>
                          {f.isAtual ? <Badge className="text-[9px] h-4 bg-primary">Atual</Badge>
                            : f.isProjecao ? <Badge variant="outline" className="text-[9px] h-4">Projeção</Badge>
                            : <Badge variant="secondary" className="text-[9px] h-4">Fechada</Badge>}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">{formatarMoeda(f.totalAvista)}</TableCell>
                        <TableCell className="text-right text-xs font-mono">{formatarMoeda(f.totalParcelado)}</TableCell>
                        <TableCell className="text-right text-xs font-mono font-semibold">{formatarMoeda(f.total)}</TableCell>
                        <TableCell>
                          {f.total > 0 && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFaturaDetailMes(f.mes)}>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico">
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {historicoPurchases.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm p-8">Nenhuma compra registrada</p>
                  ) : historicoPurchases.map(t => {
                    const cat = dados.categorias.find(c => c.id === t.categoriaId);
                    const totalParc = t.parcela ? dados.transacoes.filter(x => x.parcela?.grupoId === t.parcela!.grupoId).reduce((s, x) => s + x.valor, 0) : t.valor;
                    return (
                      <div key={t.id} className="flex items-center gap-3 p-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{t.descricao}</span>
                            {t.parcela && <Badge variant="secondary" className="text-[10px] h-4 px-1">{t.parcela.total}x</Badge>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-muted-foreground">{cat?.icone} {cat?.nome}</span>
                            <span className="text-[11px] text-muted-foreground">Compra em {format(new Date(t.data + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-destructive font-mono">{formatarMoeda(totalParc)}</p>
                          {t.parcela && <p className="text-[10px] text-muted-foreground font-mono">{t.parcela.total}x {formatarMoeda(t.valor)}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parcelamentos">
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {parcelamentos.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm p-8">Nenhum parcelamento</p>
                  ) : parcelamentos.map(p => (
                    <div key={p.grupoId} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">{p.descricao}</span>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                            <span>{p.totalParcelas}x {formatarMoeda(p.valorParcela)}</span>
                            <span>· {p.pagas} pagas, {p.pendentes} restantes</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold font-mono">{formatarMoeda(p.valorTotal)}</p>
                          <Badge variant={p.encerrado ? 'secondary' : 'outline'} className="text-[9px] h-4">{p.encerrado ? 'Encerrado' : 'Em aberto'}</Badge>
                        </div>
                      </div>
                      <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden mt-2">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(p.pagas / p.totalParcelas) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Card form dialog */}
      <Dialog open={cardDialog} onOpenChange={setCardDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">{editCardId ? 'Editar' : 'Novo'} Cartão</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Nome</Label><Input value={cardForm.nome} onChange={e => setCardForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Nubank" className="h-8" /></div>
            <div className="space-y-1"><Label className="text-xs">Limite (R$)</Label><Input value={cardForm.limite} onChange={e => setCardForm(f => ({ ...f, limite: e.target.value }))} inputMode="decimal" className="h-8" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-xs">Dia Fechamento</Label><Input type="number" min={1} max={28} value={cardForm.diaFechamento} onChange={e => setCardForm(f => ({ ...f, diaFechamento: e.target.value }))} className="h-8" /></div>
              <div className="space-y-1"><Label className="text-xs">Dia Vencimento</Label><Input type="number" min={1} max={28} value={cardForm.diaVencimento} onChange={e => setCardForm(f => ({ ...f, diaVencimento: e.target.value }))} className="h-8" /></div>
            </div>
            <Button onClick={salvarCartao} className="w-full h-8 text-sm">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fatura detail dialog */}
      <Dialog open={!!faturaDetailMes} onOpenChange={() => setFaturaDetailMes(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base capitalize">
              Fatura — {faturaDetailMes && format(new Date(faturaDetailMes + '-01'), 'MMMM/yyyy', { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          {faturaDetail && (
            <div className="space-y-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Total</p><p className="font-bold text-sm font-mono">{formatarMoeda(faturaDetail.total)}</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground">À Vista</p><p className="font-bold text-sm font-mono">{formatarMoeda(faturaDetail.totalAvista)}</p></CardContent></Card>
                <Card><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground">Parcelado</p><p className="font-bold text-sm font-mono">{formatarMoeda(faturaDetail.totalParcelado)}</p></CardContent></Card>
              </div>

              {faturaDetail.avista.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">À Vista</p>
                  <div className="space-y-1">
                    {faturaDetail.avista.map(t => {
                      const cat = dados.categorias.find(c => c.id === t.categoriaId);
                      return (
                        <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                          <div>
                            <span className="font-medium">{t.descricao}</span>
                            <span className="text-[11px] text-muted-foreground ml-2">{cat?.icone} {format(new Date(t.data + 'T12:00:00'), 'dd/MM')}</span>
                          </div>
                          <span className="font-mono font-medium text-destructive">{formatarMoeda(t.valor)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {faturaDetail.parcelado.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Parcelado</p>
                  <div className="space-y-1">
                    {faturaDetail.parcelado.map(t => {
                      const cat = dados.categorias.find(c => c.id === t.categoriaId);
                      return (
                        <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                          <div>
                            <span className="font-medium">{t.descricao}</span>
                            <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1">{t.parcela!.atual}/{t.parcela!.total}</Badge>
                            <span className="text-[11px] text-muted-foreground ml-2">{cat?.icone}</span>
                          </div>
                          <span className="font-mono font-medium text-destructive">{formatarMoeda(t.valor)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
