'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Mail, 
  Phone, 
  Calendar, 
  Trash2, 
  Archive, 
  ChevronRight,
  Tag,
  Building
} from 'lucide-react';
import { type Contact } from '@/lib/api/contacts';
import { Button } from '@/components/ui/button';

type SwipeDirection = 'left' | 'right' | null;

interface ContactsMobileListProps {
  contacts: Contact[];
  onDelete?: (contactId: string) => Promise<void>;
  onArchive?: (contactId: string) => Promise<void>;
  onTag?: (contactId: string) => Promise<void>;
}

export default function ContactsMobileList({ 
  contacts, 
  onDelete, 
  onArchive, 
  onTag 
}: ContactsMobileListProps) {
  const router = useRouter();
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [activeSwipe, setActiveSwipe] = useState<SwipeDirection>(null);
  const touchThreshold = 50;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-slate-100 text-slate-800';
      case 'lead': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };
  
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };
  
  const handleTouchStart = (e: React.TouchEvent, contactId: string) => {
    if (swipedItemId && swipedItemId !== contactId) {
      setSwipedItemId(null);
      setSwipeOffset(0);
      setActiveSwipe(null);
    }
    setTouchStartX(e.touches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent, contactId: string) => {
    const currentX = e.touches[0].clientX;
    const diff = touchStartX - currentX;
    
    if (swipedItemId === contactId) {
      setSwipeOffset(Math.max(-120, Math.min(120, diff)));
    } else if (Math.abs(diff) > touchThreshold && !swipedItemId) {
      setSwipedItemId(contactId);
      setSwipeOffset(diff);
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent, contactId: string) => {
    const currentX = e.changedTouches[0].clientX;
    const diff = touchStartX - currentX;
    
    if (Math.abs(diff) > touchThreshold) {
      if (diff > 0) {
        // Swiped left - show actions
        setSwipeOffset(-120);
        setActiveSwipe('left');
      } else {
        // Swiped right
        setSwipeOffset(120);
        setActiveSwipe('right');
      }
    } else {
      // Tap - navigate to contact detail
      if (!swipedItemId) {
        router.push(`/contacts/${contactId}`);
      } else {
        // Reset if swiped too little
        setSwipedItemId(null);
        setSwipeOffset(0);
        setActiveSwipe(null);
      }
    }
  };
  
  const handleActionButtonClick = async (
    e: React.MouseEvent, 
    contactId: string, 
    action: () => Promise<void> | void
  ) => {
    e.stopPropagation();
    await action();
    setSwipedItemId(null);
    setSwipeOffset(0);
    setActiveSwipe(null);
  };
  
  const resetSwipe = () => {
    setSwipedItemId(null);
    setSwipeOffset(0);
    setActiveSwipe(null);
  };
  
  // Close swipe when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (swipedItemId && !(e.target as Element).closest('.swipe-item')) {
        resetSwipe();
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [swipedItemId]);
  
  if (contacts.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-slate-400 mb-2">No contacts found</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-2 p-2">
      {contacts.map((contact) => {
        const isSwiped = swipedItemId === contact.id;
        const isLeftSwipe = activeSwipe === 'left' && isSwiped;
        
        return (
          <div 
            key={contact.id} 
            className="relative swipe-item"
            onTouchStart={(e) => handleTouchStart(e, contact.id)}
            onTouchMove={(e) => handleTouchMove(e, contact.id)}
            onTouchEnd={(e) => handleTouchEnd(e, contact.id)}
          >
            {/* Action buttons (revealed on swipe) */}
            <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2 transition-opacity duration-200"
                 style={{ opacity: isLeftSwipe ? 1 : 0 }}>
              {onArchive && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 w-10 p-0 rounded-full"
                  onClick={(e) => handleActionButtonClick(e, contact.id, () => onArchive(contact.id))}
                >
                  <Archive size={16} className="text-slate-600" />
                </Button>
              )}
              
              {onTag && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 w-10 p-0 rounded-full"
                  onClick={(e) => handleActionButtonClick(e, contact.id, () => onTag(contact.id))}
                >
                  <Tag size={16} className="text-indigo-600" />
                </Button>
              )}
              
              {onDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-10 w-10 p-0 rounded-full"
                  onClick={(e) => handleActionButtonClick(e, contact.id, () => onDelete(contact.id))}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
            
            {/* Contact card */}
            <div 
              className={`bg-white rounded-lg border border-slate-200 p-4 transition-transform duration-200 ${
                isSwiped ? 'shadow-lg' : ''
              }`}
              style={{
                transform: `translateX(${swipeOffset}px)`,
                transition: isSwiped ? 'transform 0.2s ease-out' : 'none'
              }}
            >
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => {
                  if (!isSwiped) {
                    router.push(`/contacts/${contact.id}`);
                  }
                }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {contact.avatar_url ? (
                      <div className="h-12 w-12 rounded-full overflow-hidden relative">
                        <Image 
                          className="object-cover" 
                          src={contact.avatar_url} 
                          alt={`${contact.first_name} ${contact.last_name}`}
                          fill
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-800 font-medium">
                          {getInitials(contact.first_name, contact.last_name)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Contact info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-slate-900 truncate">
                        {contact.first_name} {contact.last_name}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(contact.status)}`}>
                        {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      {contact.email && (
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Mail size={12} />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                      
                      {contact.phone && (
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Phone size={12} />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                      
                      {contact.company_id && (
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <Building size={12} />
                          <span>Company</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar size={12} />
                        <span>Added {formatDate(contact.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Chevron */}
                  <ChevronRight className="text-slate-400 flex-shrink-0" size={18} />
                </div>
              </div>
              
              {/* Swipe hint for mobile */}
              <div className="text-xs text-slate-400 text-center mt-2 md:hidden">
                Swipe left for actions • Tap to view details
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
