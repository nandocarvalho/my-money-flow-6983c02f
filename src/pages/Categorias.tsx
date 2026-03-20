import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { formatarMoeda, calcularGastoPorCategoria } from '@/utils/financialCalculations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const CORES_DISPONIVEIS = [
  '142 71% 45%', '0 84% 60%', '221 83% 53%', '38 92% 50%',
  '270 70% 60%', '200 70% 50%', '330 70% 50%', '170 60% 40%',
];

const ICONES = ['🛒', '🏥', '📚', '🚗', '🎮', '🏠', '👕', '💡', '🍽️', '✈️', '💊', '📱'];

export default function Categorias() {
  const { dados, atualizarDados } = useFinance();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: '', limite: '', cor: CORES_DISPONIVEIS[0], icone: '🛒' });

  const mesAtual = format(new Date(), 'yyyy-MM');
  const gastos = calcularGastoPorCategoria(dados.transacoes, mesAtual);

  const abrirEditar = (id: string) => {
    const cat = dados.categorias.find(c => c.id === id);
    if (!cat) return;
    setForm({ nome: cat.nome, limite: cat.limite.toString(), cor: cat.cor, icone: cat.icone });
    setEditId(id);
    setDialogOpen(true);
  };

  const abrirNova = () => {
    setForm({ nome: '', limite: '', cor: CORES_DISPONIVEIS[0], icone: '🛒' });
    setEditId(null);
    setDialogOpen(true);
  };

  const salvar = () => {
    if (!form.nome || !form.limite) {
      toast.error('Preencha todos os campos');
      return;
    }
    const limite = parseFloat(form.limite);
    if (isNaN(limite) || limite <= 0) {
      toast.error('Limite inválido');
      return;
    }

    let novasCategorias;
    if (editId) {
      novasCategorias = dados.categorias.map(c =>
        c.id === editId ? { ...c, nome: form.nome, limite, cor: form.cor, icone: form.icone } : c
      );
      toast.success('Categoria atualizada!');
    } else {
      novasCategorias = [...dados.categorias, {
        id: `cat-${crypto.randomUUID().slice(0, 8)}`,
        nome: form.nome,
        limite,
        cor: form.cor,
        icone: form.icone,
      }];
      toast.success('Categoria criada!');
    }

    atualizarDados({ ...dados, categorias: novasCategorias });
    setDialogOpen(false);
  };

  const excluir = (id: string) => {
    atualizarDados({ ...dados, categorias: dados.categorias.filter(c => c.id !== id) });
    toast.success('Categoria removida');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground text-sm">Gerencie categorias e limites</p>
        </div>
        <Button onClick={abrirNova} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova
        </Button>
      </div>

      <div className="grid gap-3">
        {dados.categorias.map(cat => {
          const gasto = gastos[cat.id] || 0;
          const pct = cat.limite > 0 ? Math.min((gasto / cat.limite) * 100, 100) : 0;

          return (
            <Card key={cat.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{ backgroundColor: `hsl(${cat.cor} / 0.15)` }}
                    >
                      {cat.icone}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{cat.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatarMoeda(gasto)} / {formatarMoeda(cat.limite)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrirEditar(cat.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => excluir(cat.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <Progress value={pct} className="h-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar' : 'Nova'} Categoria</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Alimentação" />
            </div>
            <div className="space-y-2">
              <Label>Limite Mensal (R$)</Label>
              <Input value={form.limite} onChange={e => setForm(f => ({ ...f, limite: e.target.value }))} placeholder="0,00" type="number" />
            </div>
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2">
                {ICONES.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, icone: ic }))}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg border-2 transition-colors ${form.icone === ic ? 'border-primary bg-primary/10' : 'border-transparent hover:border-border'}`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2">
                {CORES_DISPONIVEIS.map(cor => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, cor }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${form.cor === cor ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: `hsl(${cor})` }}
                  />
                ))}
              </div>
            </div>
            <Button onClick={salvar} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
