import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { differenceInDays, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock3, Instagram, MessageCircleMore } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PrevendaLead } from '@/types/prevendaLead';

interface PrevendaLeadCardProps {
  lead: PrevendaLead;
  index: number;
  onClick?: () => void;
}

const statusAccentMap = {
  novo_lead: '#60A5FA',
  negociando: '#FB923C',
  em_analise: '#FACC15',
  comprado: '#2DD4BF',
  standby: '#94A3B8',
} as const;

function formatPhone(phone: string | null): string {
  if (!phone) return '';
  // Remove @s.whatsapp.net and similar suffixes
  let cleaned = phone.replace(/@.*$/, '');
  // Keep only digits
  cleaned = cleaned.replace(/\D/g, '');
  // Format as Brazilian phone
  if (cleaned.length === 13 && cleaned.startsWith('55')) {
    const ddd = cleaned.slice(2, 4);
    const part1 = cleaned.slice(4, 9);
    const part2 = cleaned.slice(9);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('55')) {
    const ddd = cleaned.slice(2, 4);
    const part1 = cleaned.slice(4, 8);
    const part2 = cleaned.slice(8);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }
  return phone;
}

const PrevendaLeadCardComponent: React.FC<PrevendaLeadCardProps> = ({ lead, index, onClick }) => {
  let isDragging = false;
  const referenceDate = lead.updated_at || lead.created_at;
  const daysIdle = differenceInDays(new Date(), new Date(referenceDate));
  const initials = (lead.nome || 'Sem nome')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join('') || 'SL';
  const accentColor = statusAccentMap[lead.status];
  const timeAgo = formatDistanceToNow(new Date(referenceDate), {
    addSuffix: true,
    locale: ptBR,
  });
  const typeLabel = lead.veiculo_nome || 'Lead';
  const ChannelIcon = lead.telefone_whatsapp ? MessageCircleMore : Instagram;
  const channelLabel = lead.telefone_whatsapp ? 'WhatsApp' : 'Instagram';
  const channelClass = lead.telefone_whatsapp
    ? 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20'
    : 'text-pink-300 bg-pink-500/10 border-pink-400/20';

  const handleMouseDown = () => {
    isDragging = false;
  };

  const handleMouseMove = () => {
    isDragging = true;
  };

  const handleClick = () => {
    if (!isDragging) {
      onClick?.();
    }
  };

  return (
    <Draggable draggableId={String(lead.id)} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          className={cn(
            'group relative min-h-[168px] overflow-hidden rounded-[20px] px-4 py-4 cursor-pointer transition-all duration-200 hover:-translate-y-0.5',
            snapshot.isDragging && 'shadow-lg shadow-black/30 scale-[1.02] ring-2 ring-primary/20',
          )}
          style={{
            ...provided.draggableProps.style,
            willChange: snapshot.isDragging ? 'transform' : 'auto',
            background: 'linear-gradient(135deg, hsl(225, 30%, 12%), hsl(225, 30%, 9%))',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 10px 30px rgba(3, 8, 20, 0.22)',
          }}
        >
          <div
            className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
            style={{
              background: accentColor,
              boxShadow: `0 0 18px ${accentColor}66`,
            }}
          />

          <div className="flex h-full flex-col gap-4 pl-3">
            <div className="flex items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-foreground"
                style={{
                  background: `${accentColor}1f`,
                  border: `1px solid ${accentColor}33`,
                }}
              >
                {initials}
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="text-[15px] font-semibold text-foreground leading-tight truncate pr-2">
                  {lead.nome || 'Sem nome'}
                </p>

                <div className="flex items-center gap-2 text-xs text-muted-foreground/90">
                  <ChannelIcon className={cn('h-3.5 w-3.5 shrink-0', lead.telefone_whatsapp ? 'text-emerald-400' : 'text-pink-300')} />
                  <span className="truncate">{formatPhone(lead.telefone_whatsapp) || 'Sem telefone'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap',
                channelClass,
              )}>
                <ChannelIcon className="h-3 w-3" />
                {channelLabel}
              </span>

              <span className="inline-flex max-w-full items-center rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[11px] font-medium text-slate-200">
                {lead.assignedUserName || 'Sem responsável'}
              </span>

              <span
                className="inline-flex max-w-full items-center truncate rounded-full border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[11px] font-medium text-slate-300"
                title={typeLabel}
              >
                {typeLabel}
              </span>
            </div>

            <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/[0.05] pt-3">
              <span className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium whitespace-nowrap',
                daysIdle >= 5 ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' : 'text-muted-foreground bg-white/[0.04] border-white/[0.06]',
              )}>
                {daysIdle === 0 ? 'Hoje' : `${daysIdle} dias`}
              </span>

              <span className="inline-flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground/90 text-right">
                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{timeAgo}</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export const PrevendaLeadCard = React.memo(PrevendaLeadCardComponent);
