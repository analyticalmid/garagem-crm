import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { PrevendaLead } from '@/types/prevendaLead';
import { PrevendaLeadCard } from './PrevendaLeadCard';

interface PrevendaKanbanColumnProps {
  id: string;
  title: string;
  color: string;
  leads: PrevendaLead[];
  onLeadClick?: (lead: PrevendaLead) => void;
}

export const PrevendaKanbanColumn: React.FC<PrevendaKanbanColumnProps> = ({
  id,
  title,
  color,
  leads,
  onLeadClick,
}) => {
  return (
    <div className="flex h-full w-[356px] min-w-[356px] shrink-0 flex-col rounded-[24px] overflow-hidden border border-white/[0.05]"
      style={{ background: 'linear-gradient(180deg, hsl(225, 30%, 9%), hsl(228, 40%, 7%))' }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.04]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full pulse-dot" style={{ backgroundColor: color }} />
            <h3 className="font-semibold text-sm text-foreground">{title}</h3>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground bg-white/[0.04] border border-white/[0.06] px-2.5 py-0.5 rounded-full tabular-nums">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              flex-1 overflow-y-auto px-4 py-4 space-y-3.5 min-h-[200px] transition-colors duration-200
              ${snapshot.isDraggingOver ? 'bg-primary/[0.03]' : ''}
            `}
          >
            {leads.map((lead, index) => (
              <PrevendaLeadCard key={lead.id} lead={lead} index={index} columnColor={color} onClick={() => onLeadClick?.(lead)} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};
