import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatarMoeda } from '@/utils/financialCalculations';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, CreditCard, DollarSign, Receipt, Layers } from 'lucide-react';

const DIA_FECHAMENTO_FATURA = 4;

function mesFaturaCartao(dataTransacao: string): string {
  const d = new Date(dataTransacao + 'T12:00:00');
  const dia = d.getDate();
  if (dia > DIA_FECHAMENTO_FATURA) {
    const prox = addMonths(d, 1);
    return format(prox, 'yyyy-MM');
  }
  return format(d, 'yyyy-MM');
}

export default function Lancamentos() {
  const { dados, atualizarDados } = useFinance();
  const [mesRef, setMesRef] = useState(new Date());
  const [filtroCartao, setFiltroCartao] = useState(false);
  const mesKey = format(mesRef, 'yyyy-MM');
  const mesLabel = format(mesRef, "MMMM 'de' yyyy", { locale: ptBR });

  const lancamentosMes = useMemo(() => {
    return dados.transacoes
      .filter(t => {
        if (t.tipo === 'receita') return false;
        if (filtroCartao && t.formaPagamento !== 'cartao') return false;
        if (t.formaPagamento === 'cartao') {
          return mesFaturaCartao(t.data) === mesKey;
        }
        return t.data.startsWith(mesKey);
      })
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [dados.transacoes, mesKey, filtroCartao]);

  const aVista = lancamentosMes.filter(t => !t.parcela);
  const parcelados = lancamentosMes.filter(t => !!t.parcela);

  const totalGeral = lancamentosMes.reduce((s, t) => s + t.valor, 0);
  const totalAVista = aVista.reduce((s, t) => s + t.valor, 0);
  const totalParcelado = parcelados.reduce((s, t) => s + t.valor, 0);

  const toggleStatus = (id: string) => {
    const novas = dados.transacoes.map(t =>
      t.id === id ? { ...t, status: t.status === 'pago' ? 'pendente' as const : 'pago' as const } : t
    );
    atualizarDados({ ...dados, transacoes: novas });
  };

  const excluir = (id: string) => {
    atualizarDados({ ...dados, transacoes: dados.transacoes.filter(t => t.id !== id) });
  };

  const renderItem = (t: typeof lancamentosMes[0]) => {
    const cat = dados.categorias.find(c => c.id === t.categoriaId);
    return (
      <Card key={t.id} className="group">
        <CardContent className="p-4 flex items-center gap-3">
          <Checkbox
            checked={t.status === 'pago'}
            onCheckedChange={() => toggleStatus(t.id)}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{t.descricao}</span>
              {t.parcela && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {t.parcela.atual}/{t.parcela.total}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {cat?.icone} {cat?.nome}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(t.data + 'T12:00:00'), 'dd/MM')}
              </span>
              {t.formaPagamento === 'cartao' && (
                <CreditCard className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-sm text-destructive">
              -{formatarMoeda(t.valor)}
            </p>
            <Badge
              variant={t.status === 'pago' ? 'default' : 'outline'}
              className={`text-[10px] ${t.status === 'pago' ? 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]' : ''}`}
            >
              {t.status === 'pago' ? 'Pago' : 'Pendente'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 text-destructive h-8 w-8 p-0"
            onClick={() => excluir(t.id)}
          >
            ×
          </Button>
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
        <Button variant="ghost" size="icon" onClick={() => setMesRef(subMonths(mesRef, 1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="font-semibold capitalize">{mesLabel}</span>
        <Button variant="ghost" size="icon" onClick={() => setMesRef(addMonths(mesRef, 1))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Switch checked={filtroCartao} onCheckedChange={setFiltroCartao} id="filtro-cartao" />
        <Label htmlFor="filtro-cartao" className="flex items-center gap-1.5 text-sm cursor-pointer">
          <CreditCard className="h-4 w-4" />
          Somente Cartão de Crédito
        </Label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-bold text-sm">{formatarMoeda(totalGeral)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Receipt className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">À Vista</p>
              <p className="font-bold text-sm">{formatarMoeda(totalAVista)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Layers className="h-5 w-5 text-accent-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Parcelado</p>
              <p className="font-bold text-sm">{formatarMoeda(totalParcelado)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {lancamentosMes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhum lançamento neste mês
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {aVista.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                À Vista ({aVista.length})
              </h2>
              {aVista.map(renderItem)}
            </div>
          )}
          {parcelados.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Parcelados ({parcelados.length})
              </h2>
              {parcelados.map(renderItem)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
