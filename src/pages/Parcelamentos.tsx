import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatarMoeda } from '@/utils/financialCalculations';
import { mesFaturaCartao } from '@/utils/fechamentoFatura';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Ordenacao = 'data' | 'valor';

export default function Parcelamentos() {
  const { dados } = useFinance();
  const [mostrarEncerrados, setMostrarEncerrados] = useState(false);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('data');

  const parcelamentos = useMemo(() => {
    const grupos = new Map<string, typeof dados.transacoes>();
    dados.transacoes.filter(t => t.parcela && t.tipo === 'despesa').forEach(t => {
      const key = t.parcela!.grupoId;
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key)!.push(t);
    });

    let result = Array.from(grupos.entries()).map(([grupoId, parcelas]) => {
      const sorted = parcelas.sort((a, b) => a.parcela!.atual - b.parcela!.atual);
      const pagas = sorted.filter(p => p.status === 'pago').length;
      const totalParcelas = sorted[0].parcela!.total;
      const valorTotal = sorted.reduce((s, p) => s + p.valor, 0);
      const valorParcela = sorted[0].valor;
      const encerrado = pagas === totalParcelas;
      const cat = dados.categorias.find(c => c.id === sorted[0].categoriaId);
      const isCartao = sorted[0].formaPagamento === 'cartao';

      // First and last fatura months
      const primeiraFatura = isCartao ? mesFaturaCartao(sorted[0].data, dados.fechamentoFatura) : sorted[0].data.substring(0, 7);
      const ultimaFatura = isCartao ? mesFaturaCartao(sorted[sorted.length - 1].data, dados.fechamentoFatura) : sorted[sorted.length - 1].data.substring(0, 7);

      return { grupoId, descricao: sorted[0].descricao, parcelas: sorted, totalParcelas, pagas, pendentes: totalParcelas - pagas, valorTotal, valorParcela, primeiraFatura, ultimaFatura, encerrado, cat, isCartao, formaPagamento: sorted[0].formaPagamento, data: sorted[0].data };
    });

    if (!mostrarEncerrados) {
      result = result.filter(p => !p.encerrado);
    }

    result.sort((a, b) => {
      if (ordenacao === 'valor') return b.valorTotal - a.valorTotal;
      return b.data.localeCompare(a.data);
    });

    return result;
  }, [dados, mostrarEncerrados, ordenacao]);

  const totalGeral = parcelamentos.reduce((s, p) => s + p.valorTotal, 0);
  const emAberto = parcelamentos.filter(p => !p.encerrado).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Layers className="h-5 w-5" /> Parcelamentos</h1>
          <p className="text-sm text-muted-foreground">Todos os parcelamentos cadastrados</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Switch checked={mostrarEncerrados} onCheckedChange={setMostrarEncerrados} id="enc" className="scale-75" />
          <Label htmlFor="enc" className="text-xs cursor-pointer">Mostrar encerrados</Label>
        </div>
        <Select value={ordenacao} onValueChange={v => setOrdenacao(v as Ordenacao)}>
          <SelectTrigger className="h-7 w-28 text-[11px]"><ArrowUpDown className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="data">Mais recente</SelectItem>
            <SelectItem value="valor">Maior valor</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>{parcelamentos.length} parcelamento(s)</span>
          <span className="font-mono font-medium text-foreground">{formatarMoeda(totalGeral)}</span>
        </div>
      </div>

      {parcelamentos.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Nenhum parcelamento {mostrarEncerrados ? '' : 'em aberto'}</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {parcelamentos.map(p => (
            <Card key={p.grupoId}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{p.cat?.icone || '📦'}</span>
                    <div>
                      <p className="text-sm font-medium">{p.descricao}</p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                        <span>{p.isCartao ? '💳 Cartão' : p.formaPagamento === 'pix' ? 'PIX' : p.formaPagamento === 'boleto' ? 'Boleto' : 'Dinheiro'}</span>
                        <span>· {p.totalParcelas}x {formatarMoeda(p.valorParcela)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono text-destructive">{formatarMoeda(p.valorTotal)}</p>
                    <Badge variant={p.encerrado ? 'secondary' : 'default'} className="text-[9px] h-4">{p.encerrado ? 'Encerrado' : 'Em aberto'}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted-foreground mb-2">
                  <span>Pagas: <span className="text-foreground font-medium">{p.pagas}/{p.totalParcelas}</span></span>
                  <span>Pendentes: <span className="text-foreground font-medium">{p.pendentes}</span></span>
                  <span className="capitalize">1ª: {format(new Date(p.primeiraFatura + '-01'), 'MMM/yy', { locale: ptBR })}</span>
                  <span className="capitalize">Última: {format(new Date(p.ultimaFatura + '-01'), 'MMM/yy', { locale: ptBR })}</span>
                </div>
                <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(p.pagas / p.totalParcelas) * 100}%` }} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
