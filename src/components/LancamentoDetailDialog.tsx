import { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatarMoeda } from '@/utils/financialCalculations';
import { mesFaturaCartao } from '@/utils/fechamentoFatura';
import { Transacao } from '@/types/finance';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { CreditCard, CalendarDays, CheckCircle2, Clock } from 'lucide-react';

interface Props {
  transacao: Transacao | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mesKey: string;
}

export default function LancamentoDetailDialog({ transacao, open, onOpenChange, mesKey }: Props) {
  const { dados, atualizarDados } = useFinance();

  const cat = transacao ? dados.categorias.find(c => c.id === transacao.categoriaId) : null;
  const mensalidade = transacao?.origemMensalidade ? dados.mensalidades.find(m => m.id === transacao.origemMensalidade) : null;

  // For parcelados, find all parcels
  const parcelas = useMemo(() => {
    if (!transacao?.parcela) return [];
    return dados.transacoes
      .filter(t => t.parcela?.grupoId === transacao.parcela!.grupoId)
      .sort((a, b) => (a.parcela!.atual) - (b.parcela!.atual));
  }, [transacao, dados.transacoes]);

  if (!transacao) return null;

  const isParcela = !!transacao.parcela;
  const isMensalidade = !!transacao.origemMensalidade;

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

  const formaPgtoLabel = transacao.formaPagamento === 'cartao' ? 'Cartão' : transacao.formaPagamento === 'pix' ? 'PIX' : transacao.formaPagamento === 'boleto' ? 'Boleto' : 'Dinheiro';

  const totalParcelamento = parcelas.reduce((s, p) => s + p.valor, 0);
  const parcelasPagas = parcelas.filter(p => p.status === 'pago');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {cat?.icone} {isParcela ? transacao.descricao : transacao.descricao}
            {isParcela && <Badge variant="secondary">Parcelamento {parcelas.length}x</Badge>}
            {isMensalidade && <Badge variant="outline">Mensalidade</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 flex-1 overflow-y-auto">
          {/* Basic info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Valor {isParcela ? 'da Parcela' : ''}</p>
              <p className="font-bold text-lg text-destructive">{formatarMoeda(transacao.valor)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Data</p>
              <p className="font-medium">{format(new Date(transacao.data + 'T12:00:00'), 'dd/MM/yyyy')}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Categoria</p>
              <p className="font-medium">{cat?.icone} {cat?.nome || 'Sem categoria'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground text-xs">Pagamento</p>
              <p className="font-medium flex items-center gap-1">
                {transacao.formaPagamento === 'cartao' && <CreditCard className="h-3.5 w-3.5" />}
                {formaPgtoLabel}
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
          </div>

          {/* Parcelamento details — full layout */}
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

              {/* Progress bar */}
              <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-[hsl(var(--success))] transition-all"
                  style={{ width: `${(parcelasPagas.length / parcelas.length) * 100}%` }}
                />
              </div>

              {/* Month-by-month list */}
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
                          <span className="text-muted-foreground ml-2">{format(new Date(p.data + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                          <span className="text-muted-foreground ml-2 text-xs">Fatura: {format(new Date(mesFatura + '-01'), 'MMM/yy', { locale: ptBR })}</span>
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

          {/* Mensalidade info */}
          {isMensalidade && mensalidade && (
            <div className="border rounded-lg p-4 bg-muted/20 space-y-2">
              <h4 className="text-sm font-semibold">Informações da Mensalidade</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Valor Padrão</p>
                  <p className="font-medium">{formatarMoeda(mensalidade.valorPadrao)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Dia Vencimento</p>
                  <p className="font-medium">{mensalidade.diaVencimento}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Início</p>
                  <p className="font-medium">{mensalidade.mesInicio}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fim</p>
                  <p className="font-medium">{mensalidade.mesFim || 'Indefinido'}</p>
                </div>
              </div>
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
                <p className="text-xs text-muted-foreground">
                  Para remover, é necessário excluir o parcelamento inteiro.
                </p>
                <Button variant="destructive" size="sm" onClick={excluirParcelamento} className="w-full">
                  Excluir Parcelamento Inteiro ({parcelas.length} parcelas)
                </Button>
              </div>
            )}
            {isMensalidade && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Mensalidades não podem ser removidas individualmente. Inative para este mês.
                </p>
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
