'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FolderNode {
  id: string;
  name: string;
  color?: string;
  children: FolderNode[];
  _count: { documents: number };
}

interface FolderTreeProps {
  folders: FolderNode[];
  selectedFolderId?: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (parentId?: string) => void;
  onEditFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  canEdit?: boolean;
}

function FolderTreeNode({
  folder,
  level = 0,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  canEdit,
}: {
  folder: FolderNode;
  level?: number;
  selectedFolderId?: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (parentId?: string) => void;
  onEditFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  canEdit?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const isSelected = selectedFolderId === folder.id;
  const hasChildren = folder.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
          isSelected && 'bg-primary/10',
          !isSelected && isHovered && 'bg-muted',
        )}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onSelectFolder(folder.id)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
        {!hasChildren && <div className="w-5" />}

        {isExpanded ? (
          <FolderOpen className="h-4 w-4" style={{ color: folder.color || undefined }} />
        ) : (
          <Folder className="h-4 w-4" style={{ color: folder.color || undefined }} />
        )}

        <span className="flex-1 text-sm truncate">{folder.name}</span>

        <span className="text-xs text-muted-foreground">
          {folder._count.documents}
        </span>

        {canEdit && isHovered && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => onCreateFolder(folder.id)}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => onEditFolder(folder.id)}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={() => onDeleteFolder(folder.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {folder.children.map((child) => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onCreateFolder={onCreateFolder}
              onEditFolder={onEditFolder}
              onDeleteFolder={onDeleteFolder}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  canEdit = false,
}: FolderTreeProps) {
  return (
    <div className="space-y-1">
      {/* Root folder */}
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
          selectedFolderId === null && 'bg-primary/10',
          selectedFolderId !== null && 'hover:bg-muted',
        )}
        onClick={() => onSelectFolder(null)}
      >
        <Folder className="h-4 w-4" />
        <span className="flex-1 text-sm font-medium">All Documents</span>
        {canEdit && (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onCreateFolder();
            }}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Folder tree */}
      {folders.map((folder) => (
        <FolderTreeNode
          key={folder.id}
          folder={folder}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          onCreateFolder={onCreateFolder}
          onEditFolder={onEditFolder}
          onDeleteFolder={onDeleteFolder}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}
