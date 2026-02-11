import { useCallback, useEffect, useState } from 'react';
import { useVaultStore } from '@/store/vaultStore';
import { tagsAPI } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Tag as TagIcon } from 'lucide-react';

export function TagsSidebar() {
  const { tags, setTags, activeTags, toggleActiveTag } = useVaultStore();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');

  const loadTags = useCallback(async () => {
    try {
      const response = await tagsAPI.list();
      setTags(response.data);
    } catch {
      // silently fail
    }
  }, [setTags]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const response = await tagsAPI.create({ name: newName, color: newColor });
      setTags([...tags, response.data]);
      setNewName('');
      setCreating(false);
    } catch {
      // silently fail
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await tagsAPI.delete(id);
      setTags(tags.filter((t) => t.id !== id));
    } catch {
      // silently fail
    }
  };

  const colors = ['#6366f1', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
          <TagIcon className="h-3 w-3" />
          Tags
        </h4>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setCreating(true)}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {creating && (
        <div className="space-y-2 p-2 border rounded-md">
          <Input
            placeholder="Tag name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <div className="flex gap-1">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`h-5 w-5 rounded-full border-2 ${newColor === c ? 'border-foreground' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-1">
            <Button size="sm" className="flex-1" onClick={handleCreate}>Add</Button>
            <Button size="sm" variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {tags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => toggleActiveTag(tag.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors group ${
              activeTags.includes(tag.id) ? 'bg-accent font-medium' : 'hover:bg-accent/50'
            }`}
          >
            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
            <span className="truncate flex-1 text-left">{tag.name}</span>
            <X
              className="h-3 w-3 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); handleDelete(tag.id); }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
