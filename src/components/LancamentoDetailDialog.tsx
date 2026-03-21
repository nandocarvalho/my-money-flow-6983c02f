import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatarMoeda } from '@/utils/financialCalculations';
import { mesFaturaCartao } from '@/utils/fechamentoFatura';
import { Transacao } from '@/types/finance';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { CreditCard, CalendarDays, CheckCircle2, Clock, Pencil, Save, X } from 'lucide-react';

interface Props {
  transacao: Transacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mesKey: string;
}

export default function LancamentoDetailDialog({ transacao, open, onOpenChange, mesKey }: Props) {
  const { dados, atualizarDados } = useFinance();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ descricao: '', valor: '', data: '', categoriaId: '', formaPagamento: '' });

  // Edit mensalidade override for a specific month
  const [editMensMonth, setEditMensMonth] = useState<string | null>(null);
  const [editMensValor, setEditMensValor] = useState('');

  const cat = transacao ? dados.categorias.find(c => c.id === transacao.categoriaId) : null;
  const mensalidade = transacao?.origemMensalidade ? dados.mensalidades.find(m => m.id === transacao.origemMensalidade) : null;

  const parcelas = useMemo(() => {
    if (!transacao?.parcela) return [];
    return dados.transacoes
      .filter(t => t.parcela?.grupoId === transacao.parcela!.grupoId)
      .sort((a, b) => (a.parcela!.atual) - (b.parcela!.atual));
  }, [transacao, dados.transacoes]);

  // Mensalidade history: all transactions from this mensalidade
  const mensalidadeHistorico = useMemo(() => {
    if (!transacao?.origemMensalidade) return [];
    return dados.transacoes
      .filter(t => t.origemMensalidade === transacao.origemMensalidade)
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [transacao, dados.transacoes]);

  if (!transacao) return null;

  const isParcela = !!transacao.parcela;
  const isMensalidade = !!transacao.origemMensalidade;

  const startEditing = () => {
    setEditForm({
      descricao: transacao.descricao,
      valor: transacao.valor.toString(),
      data: transacao.data,
      categoriaId: transacao.categoriaId,
      formaPagamento: transacao.formaPagamento,
    });
    setEditing(true);
  };

  const saveEdit = () => {
    const valor = parseFloat(editForm.valor.replace(',', '.'));
    if (!editForm.descricao || isNaN(valor) || valor <= 0) {
      toast.error('Preencha corretamente');
      return;
    }

    if (isParcela) {
      // Edit all parcelas of this group
      const novas = dados.transacoes.map(t => {
        if (t.parcela?.grupoId !== transacao.parcela!.grupoId) return t;
        return {
          ...t,
          descricao: editForm.descricao,
          valor,
          categoriaId: editForm.categoriaId,
          formaPagamento: editForm.formaPagamento as any,
        };
      });
      atualizarDados({ ...dados, transacoes: novas });
    } else {
      const novas = dados.transacoes.map(t =>
        t.id === transacao.id
          ? { ...t, descricao: editForm.descricao, valor, data: editForm.data, categoriaId: editForm.categoriaId, formaPagamento: editForm.formaPagamento as any }
          : t
      );
      atualizarDados({ ...dados, transacoes: novas });
    }
    toast.success('Lançamento atualizado!');
    setEditing(false);
  };

  const toggleStatus = () => {
    const novas = dados.transacoes.map(t =>
      t.id === transacao.id ? { ...t, status: t.status === 'pago' ? 'pendente' as const : 'pago' as const } : t
    );
    atualizarDados({ ...dados, transacoes: novas });
    toast.success('Status atualizado');
  };

  const excluir = () => {
    atualizarDados({ ...dados, transacoes: dados.transacoes.filter(t => t.id !== transacao.id) });
    toast.success('Lançamento removido');
    onOpenChange(false);
  };

  const inativarMensalidadeMes = () => {
    if (!mensalidade) return;
    const novas = dados.mensalidades.map(m => {
      if (m.id !== mensalidade.id) return m;
      const mesesInativos = [...(m.mesesInativos || [])];
      if (!mesesInativos.includes(mesKey)) mesesInativos.push(mesKey);
      return { ...m, mesesInativos };
    });
    const transacoesSem = dados.transacoes.filter(t => t.id !== transacao.id);
    atualizarDados({ ...dados, mensalidades: novas, transacoes: transacoesSem });
    toast.success(`${mensalidade.descricao} inativada para ${mesKey}`);
    onOpenChange(false);
  };

  const excluirParcelamento = () => {
    if (!transacao.parcela) return;
    const ids = parcelas.map(p => p.id);
    atualizarDados({ ...dados, transacoes: dados.transacoes.filter(t => !ids.includes(t.id)) });
    toast.success('Parcelamento inteiro removido');
    onOpenChange(false);
  };

  const formaPgtoLabel = (fp: string) => fp === 'cartao' ? 'Cartão' : fp === 'pix' ? 'PIX' : fp === 'boleto' ? 'Boleto' : 'Dinheiro';

  const totalParcelamento = parcelas.reduce((s, p) => s + p.valor, 0);
  const parcelasPagas = parcelas.filter(p => p.status === 'pago');

  // Mensalidade: generate projected months
  const mensalidadeProjecao = useMemo(() => {
    if (!mensalidade) return [];
    const meses: { mes: string; valor: number; status: 'pago' | 'pendente' | 'inativo' | 'projecao'; transacaoId?: string }[] = [];
    const hoje = new Date();
    const mesAtualStr = format(hoje, 'yyyy-MM');

    // Show from mesInicio up to 12 months in the future
    let cursor = new Date(mensalidade.mesInicio + '-01');
    const limite = addMonths(hoje, 12);

    while (cursor <= limite) {
      const mesStr = format(cursor, 'yyyy-MM');
      if (mensalidade.mesFim && mesStr > mensalidade.mesFim) break;

      const override = mensalidade.overridesMes[mesStr];
      const valor = override?.valor ?? mensalidade.valorPadrao;
      const isInativo = mensalidade.mesesInativos?.includes(mesStr);
      const transacao = mensalidadeHistorico.find(t => t.data.startsWith(mesStr));

      meses.push({
        mes: mesStr,
        valor,
        status: isInativo ? 'inativo' : transacao ? transacao.status : (mesStr <= mesAtualStr ? 'pendente' : 'projecao'),
        transacaoId: transacao?.id,
      });
      cursor = addMonths(cursor, 1);
    }
    return meses;
  }, [mensalidade, mensalidadeHistorico]);

  // (editMensMonth/editMensValor moved to top of component)

  const saveMensOverride = () => {
    if (!editMensMonth || !mensalidade) return;
    const valor = parseFloat(editMensValor.replace(',', '.'));
    const novas = dados.mensalidades.map(m => {
      if (m.id !== mensalidade.id) return m;
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
    // Also update existing transaction if present
    const trans = mensalidadeHistorico.find(t => t.data.startsWith(editMensMonth!));
    let transacoes = dados.transacoes;
    if (trans && !isNaN(valor) && valor > 0) {
      transacoes = transacoes.map(t => t.id === trans.id ? { ...t, valor } : t);
    }
    atualizarDados({ ...dados, mensalidades: novas, transacoes });
    toast.success('Valor do mês atualizado');
    setEditMensMonth(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setEditing(false); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {cat?.icone} {transacao.descricao}
            {isParcela && <Badge variant="secondary">Parcelamento {parcelas.length}x</Badge>}
            {isMensalidade && <Badge variant="outline">Mensalidade</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 flex-1 overflow-y-auto">
          {/* Editing form */}
          {editing ? (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={editForm.descricao} onChange={e => setEditForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input value={editForm.valor} onChange={e => setEditForm(f => ({ ...f, valor: e.target.value }))} inputMode="decimal" />
                </div>
                {!isParcela && (
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" value={editForm.data} onChange={e => setEditForm(f => ({ ...f, data: e.target.value }))} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={editForm.categoriaId} onValueChange={v => setEditForm(f => ({ ...f, categoriaId: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {dados.categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.icone} {c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pagamento</Label>
                  <Select value={editForm.formaPagamento} onValueChange={v => setEditForm(f => ({ ...f, formaPagamento: v }))}>
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
              <div className="flex gap-2">
                <Button onClick={saveEdit} size="sm" className="gap-1"><Save className="h-3.5 w-3.5" /> Salvar</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="gap-1"><X className="h-3.5 w-3.5" /> Cancelar</Button>
              </div>
            </div>
          ) : (
            <>
              {/* Basic info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Valor {isParcela ? 'da Parcela' : ''}</p>
                  <p className="font-bold text-lg text-destructive">{formatarMoeda(transacao.valor)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">{isParcela && transacao.formaPagamento === 'cartao' ? 'Mês Fatura' : 'Data'}</p>
                  <p className="font-medium">
                    {isParcela && transacao.formaPagamento === 'cartao'
                      ? format(new Date(transacao.data + 'T12:00:00'), "MMM/yyyy", { locale: ptBR })
                      : format(new Date(transacao.data + 'T12:00:00'), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Categoria</p>
                  <p className="font-medium">{cat?.icone} {cat?.nome || 'Sem categoria'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">Pagamento</p>
                  <p className="font-medium flex items-center gap-1">
                    {transacao.formaPagamento === 'cartao' && <CreditCard className="h-3.5 w-3.5" />}
                    {formaPgtoLabel(transacao.formaPagamento)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={transacao.status === 'pago' ? 'default' : 'outline'} className={transacao.status === 'pago' ? 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]' : ''}>
                  {transacao.status === 'pago' ? 'Pago' : 'Pendente'}
                </Badge>
                <Button variant="outline" size="sm" onClick={toggleStatus}>
                  Marcar como {transacao.status === 'pago' ? 'Pendente' : 'Pago'}
                </Button>
                <Button variant="outline" size="sm" onClick={startEditing} className="gap-1">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
              </div>
            </>
          )}

          {/* Parcelamento details */}
          {isParcela && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
              <h4 className="text-sm font-semibold">Detalhamento do Parcelamento</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Total Parcelas</p>
                  <p className="font-semibold">{parcelas.length}x</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Valor Total</p>
                  <p className="font-semibold text-destructive">{formatarMoeda(totalParcelamento)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Primeira Parcela</p>
                  <p className="font-medium">{parcelas[0] ? format(new Date(parcelas[0].data + 'T12:00:00'), 'MMM/yyyy', { locale: ptBR }) : '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Última Parcela</p>
                  <p className="font-medium">{parcelas.length > 0 ? format(new Date(parcelas[parcelas.length - 1].data + 'T12:00:00'), 'MMM/yyyy', { locale: ptBR }) : '-'}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {parcelasPagas.length} de {parcelas.length} pagas · Restam {parcelas.length - parcelasPagas.length}
              </div>
              <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-[hsl(var(--success))] transition-all" style={{ width: `${(parcelasPagas.length / parcelas.length) * 100}%` }} />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {parcelas.map(p => {
                  const mesFatura = p.formaPagamento === 'cartao'
                    ? mesFaturaCartao(p.data, dados.fechamentoFatura)
                    : p.data.substring(0, 7);
                  return (
                    <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg text-sm ${p.id === transacao.id ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted/50'}`}>
                      <div className="flex items-center gap-3">
                        {p.status === 'pago'
                          ? <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))] shrink-0" />
                          : <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                        <div>
                          <span className="font-medium">{p.parcela!.atual}/{p.parcela!.total}</span>
                          <span className="text-muted-foreground ml-2 capitalize">
                            {format(new Date(mesFatura + '-01'), 'MMM/yy', { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatarMoeda(p.valor)}</span>
                        <Badge variant={p.status === 'pago' ? 'default' : 'outline'} className={`text-[10px] ${p.status === 'pago' ? 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]' : ''}`}>
                          {p.status === 'pago' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mensalidade history with edit per month */}
          {isMensalidade && mensalidade && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
              <h4 className="text-sm font-semibold">Histórico da Mensalidade</h4>
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <p className="text-muted-foreground text-xs">Valor Padrão</p>
                  <p className="font-medium">{formatarMoeda(mensalidade.valorPadrao)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Início → Fim</p>
                  <p className="font-medium">{mensalidade.mesInicio} → {mensalidade.mesFim || '∞'}</p>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {mensalidadeProjecao.map(item => (
                  <div key={item.mes} className={`flex items-center justify-between p-3 rounded-lg text-sm ${item.status === 'inativo' ? 'opacity-40' : item.status === 'projecao' ? 'opacity-60 border border-dashed' : 'bg-muted/50'}`}>
                    <div className="flex items-center gap-3">
                      {item.status === 'pago' && <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))] shrink-0" />}
                      {item.status === 'pendente' && <Clock className="h-4 w-4 text-[hsl(var(--warning))] shrink-0" />}
                      {item.status === 'inativo' && <X className="h-4 w-4 text-muted-foreground shrink-0" />}
                      {item.status === 'projecao' && <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />}
                      <span className="capitalize">{format(new Date(item.mes + '-01'), 'MMM/yy', { locale: ptBR })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatarMoeda(item.valor)}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.status === 'pago' ? 'Pago' : item.status === 'pendente' ? 'Pendente' : item.status === 'inativo' ? 'Inativo' : 'Projeção'}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                        e.stopPropagation();
                        setEditMensMonth(item.mes);
                        const ov = mensalidade.overridesMes[item.mes];
                        setEditMensValor(ov?.valor?.toString() || '');
                      }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Edit month override inline */}
              {editMensMonth && (
                <div className="flex items-end gap-2 pt-2 border-t">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Valor para {editMensMonth} (vazio = padrão)</Label>
                    <Input value={editMensValor} onChange={e => setEditMensValor(e.target.value)} placeholder={mensalidade.valorPadrao.toString()} inputMode="decimal" className="h-8" />
                  </div>
                  <Button size="sm" onClick={saveMensOverride} className="h-8">Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditMensMonth(null)} className="h-8">×</Button>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="border-t pt-3 space-y-2">
            {!isParcela && !isMensalidade && (
              <Button variant="destructive" size="sm" onClick={excluir} className="w-full">
                Remover Lançamento
              </Button>
            )}
            {isParcela && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Para remover, é necessário excluir o parcelamento inteiro.</p>
                <Button variant="destructive" size="sm" onClick={excluirParcelamento} className="w-full">
                  Excluir Parcelamento Inteiro ({parcelas.length} parcelas)
                </Button>
              </div>
            )}
            {isMensalidade && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Mensalidades não podem ser removidas individualmente. Inative para este mês.</p>
                <Button variant="outline" size="sm" onClick={inativarMensalidadeMes} className="w-full">
                  <CalendarDays className="h-4 w-4 mr-1" /> Inativar para {mesKey}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
