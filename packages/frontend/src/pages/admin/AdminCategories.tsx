import React, { useEffect, useState } from 'react';
import { Tags, Trash2, Plus, Search } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import api from '@/services/api';

export const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [newCategory, setNewCategory] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const [deleteCat, setDeleteCat] = useState<{ id: string, name: string } | null>(null);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/admin/categories');
      setCategories(res.data);
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    
    setIsAdding(true);
    try {
      await api.post('/admin/categories', { name: newCategory });
      toast.success('Category created');
      setNewCategory('');
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create category');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success('Category deleted');
      setDeleteCat(null);
      fetchCategories();
    } catch (err) {
      toast.error('Failed to delete category. Ensure no challenges are using it.');
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground font-mono animate-pulse">Loading Categories...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-border">
            <Tags className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground uppercase font-outfit">Custom Categories</h1>
            <p className="text-muted-foreground mt-1">Manage categories for challenges</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search categories..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      <div className="bg-black/40 border border-border rounded-lg p-6 mb-6">
        <h3 className="font-outfit font-bold mb-4 text-primary uppercase">Add New Category</h3>
        <form onSubmit={handleAddCategory} className="flex gap-4">
          <Input 
            placeholder="e.g. OSINT, HARDWARE, CLOUD" 
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value.toUpperCase())}
            className="max-w-xs"
            required
          />
          <Button type="submit" variant="cyber" disabled={isAdding || !newCategory.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            {isAdding ? 'Adding...' : 'Add Category'}
          </Button>
        </form>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category Name</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCategories.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-bold text-white tracking-widest">{c.name}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="destructive" size="icon" onClick={() => setDeleteCat({ id: c.id, name: c.name })} className="h-8 w-8">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {filteredCategories.length === 0 && (
            <TableRow>
              <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                No categories found. Create one above!
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={!!deleteCat} onOpenChange={(open) => !open && setDeleteCat(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the category <strong>{deleteCat?.name}</strong>? Challenges using this category might break!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCat(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteCat && handleDelete(deleteCat.id)}>Delete Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
