import { useRef } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Lead, LeadStatus } from "@/types/lead";
import { LeadCard } from "./LeadCard";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: LeadStatus;
  title: string;
  leads: Lead[];
  colorClass: string;
  onLeadClick?: (lead: Lead) => void;
}

const colorMap: Record<string, { dot: string }> = {
  "kanban-novo": {
    dot: "bg-[hsl(var(--kanban-novo))]",
  },
  "kanban-negociando": {
    dot: "bg-[hsl(var(--kanban-negociando))]",
  },
  "kanban-vendido": {
    dot: "bg-[hsl(var(--kanban-vendido))]",
  },
  "kanban-perdido": {
    dot: "bg-[hsl(var(--kanban-perdido))]",
  },
};

export function KanbanColumn({ id, title, leads, colorClass, onLeadClick }: KanbanColumnProps) {
  const colors = colorMap[colorClass];
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleCardClick = (lead: Lead, e: React.MouseEvent) => {
    if (dragStartPos.current) {
      const dx = Math.abs(e.clientX - dragStartPos.current.x);
      const dy = Math.abs(e.clientY - dragStartPos.current.y);
      if (dx < 5 && dy < 5) {
        onLeadClick?.(lead);
      }
    }
    dragStartPos.current = null;
  };

  return (
    <div className="flex h-full w-[356px] min-w-[356px] shrink-0 flex-col rounded-[24px] overflow-hidden border border-white/[0.05]"
      style={{ background: 'linear-gradient(180deg, hsl(225, 30%, 9%), hsl(228, 40%, 7%))' }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.04]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={cn("w-2 h-2 rounded-full pulse-dot", colors.dot)} />
            <h3 className="font-semibold text-sm text-foreground">{title}</h3>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-muted-foreground tabular-nums">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-y-auto px-4 py-4 space-y-3.5 min-h-[200px] transition-colors duration-200",
              snapshot.isDraggingOver && "bg-primary/[0.03]"
            )}
          >
            {leads.map((lead, index) => (
              <Draggable key={lead.id} draggableId={String(lead.id)} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onMouseDown={handleMouseDown}
                    onMouseUp={(e) => handleCardClick(lead, e)}
                    style={{
                      ...provided.draggableProps.style,
                      willChange: snapshot.isDragging ? 'transform' : 'auto',
                    }}
                    className={cn(
                      "transition-transform duration-150",
                      snapshot.isDragging && "opacity-90 scale-[1.01] cursor-grabbing"
                    )}
                  >
                    <LeadCard lead={lead} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            
            {leads.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                Nenhum lead
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
