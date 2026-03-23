import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  MoreHorizontal, Pencil, Trash2, Copy,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Story {
  id: string;
  title: string;
  genre: string | null;
  tone: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  premise: string | null;
}

interface Props {
  story: Story;
  index: number;
  onDelete: (id: string) => void;
  onDuplicate: (story: Story) => void;
  onRename: (id: string, title: string) => void;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

function InlineEditTitle({ title, onSave }: { title: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(title); }, [title]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== title) onSave(trimmed);
    else setValue(title);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setValue(title); setEditing(false); } }}
        onClick={(e) => e.stopPropagation()}
        className="font-medium text-foreground bg-transparent border-b border-primary/40 outline-none w-full truncate"
      />
    );
  }

  return (
    <h3
      className="font-medium text-foreground line-clamp-1 cursor-text hover:border-b hover:border-muted-foreground/30 transition-colors"
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      title="Click to rename"
    >
      {title}
    </h3>
  );
}

export function StoryGridCard({ story, index, onDelete, onDuplicate, onRename, getStatusColor, getStatusLabel }: Props) {
  const navigate = useNavigate();

  return (
    <div
      className="group p-5 rounded-xl border border-border bg-card hover:border-primary/20 transition-all duration-300 cursor-pointer hover:shadow-[0_4px_20px_-8px_hsl(var(--primary)/0.1)] animate-fade-up"
      style={{ animationDelay: `${index * 60}ms`, opacity: 0 }}
      onClick={() => navigate(`/story/${story.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1 mr-2">
          <InlineEditTitle title={story.title} onSave={(t) => onRename(story.id, t)} />
          <div className="flex items-center gap-2 mt-1">
            {story.genre && <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md">{story.genre}</span>}
            <span className={`text-xs font-medium ${getStatusColor(story.status)}`}>{getStatusLabel(story.status)}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => navigate(`/story/${story.id}`)}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Continue
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(story)}>
              <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(story.id)} className="text-destructive">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {story.premise && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{story.premise}</p>}
      <div className="mt-3 text-xs text-muted-foreground">
        {new Date(story.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
      </div>
    </div>
  );
}

export function StoryListCard({ story, index, onDelete, onDuplicate, onRename, getStatusColor, getStatusLabel }: Props) {
  const navigate = useNavigate();

  return (
    <div
      className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/20 transition-all cursor-pointer animate-fade-up"
      style={{ animationDelay: `${index * 40}ms`, opacity: 0 }}
      onClick={() => navigate(`/story/${story.id}`)}
    >
      <div className="flex-1 min-w-0">
        <InlineEditTitle title={story.title} onSave={(t) => onRename(story.id, t)} />
        {story.premise && <p className="text-xs text-muted-foreground truncate mt-0.5">{story.premise}</p>}
      </div>
      {story.genre && <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md shrink-0">{story.genre}</span>}
      <span className={`text-xs font-medium shrink-0 ${getStatusColor(story.status)}`}>{getStatusLabel(story.status)}</span>
      <span className="text-xs text-muted-foreground shrink-0">{new Date(story.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <button className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all">
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => navigate(`/story/${story.id}`)}>
            <Pencil className="w-3.5 h-3.5 mr-2" /> Continue
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate(story)}>
            <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(story.id)} className="text-destructive">
            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
