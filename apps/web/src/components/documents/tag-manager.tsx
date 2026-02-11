'use client';

import { useState } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagManagerProps {
  availableTags: Tag[];
  selectedTagIds: string[];
  onAddTag: (tagId: string) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateTag?: (data: { name: string; color: string }) => void;
  canCreate?: boolean;
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#64748b',
];

export function TagManager({
  availableTags,
  selectedTagIds,
  onAddTag,
  onRemoveTag,
  onCreateTag,
  canCreate = false,
}: TagManagerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedTags = availableTags.filter((tag) => selectedTagIds.includes(tag.id));
  const unselectedTags = availableTags.filter((tag) => !selectedTagIds.includes(tag.id));

  const filteredUnselectedTags = unselectedTags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTag = () => {
    if (onCreateTag && newTagName.trim()) {
      onCreateTag({ name: newTagName, color: newTagColor });
      setNewTagName('');
      setNewTagColor(PRESET_COLORS[0]);
      setCreateDialogOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="gap-1"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: tag.color }}
            >
              <TagIcon className="h-3 w-3" />
              {tag.name}
              <button
                onClick={() => onRemoveTag(tag.id)}
                className="ml-1 hover:bg-black/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add Tag Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          {canCreate && (
            <Button size="sm" variant="outline" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Tag
            </Button>
          )}
        </div>

        {filteredUnselectedTags.length > 0 ? (
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md">
            {filteredUnselectedTags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="cursor-pointer hover:bg-muted"
                style={{ borderColor: tag.color, color: tag.color }}
                onClick={() => onAddTag(tag.id)}
              >
                <TagIcon className="h-3 w-3 mr-1" />
                {tag.name}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {searchQuery ? 'No tags found' : 'All tags applied'}
          </p>
        )}
      </div>

      {/* Create Tag Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
            <DialogDescription>
              Create a tag to categorize and filter documents across your firm
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="tagName">Tag Name</Label>
              <Input
                id="tagName"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="e.g., Urgent, Reviewed, Final"
                autoFocus
              />
            </div>

            <div>
              <Label>Tag Color</Label>
              <div className="flex gap-2 mt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-all',
                      newTagColor === color && 'ring-2 ring-offset-2',
                    )}
                    style={{
                      backgroundColor: color,
                      borderColor: newTagColor === color ? '#000' : 'transparent',
                    }}
                    onClick={() => setNewTagColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTag} disabled={!newTagName.trim()}>
              Create Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
