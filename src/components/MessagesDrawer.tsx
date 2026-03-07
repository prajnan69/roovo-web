import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import ConversationList from './ConversationList';
import type { Conversation } from './ConversationList';

interface MessagesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  guestConversations: Conversation[];
  hostConversations: Conversation[];
  onConversationSelect?: (conversation: Conversation) => void;
}

const MessagesDrawer: React.FC<MessagesDrawerProps> = ({
  isOpen,
  onClose,
  guestConversations,
  hostConversations,
  onConversationSelect
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[9999] backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 w-full h-full bg-white z-[10000] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 pt-[calc(env(safe-area-inset-top)+1rem)]">
              <h2 className="text-xl font-bold">Messages</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <ConversationList
                isDrawerMode={true}
                guestConversations={guestConversations}
                hostConversations={hostConversations}
                onConversationClick={(conversation) => {
                  if (onConversationSelect) {
                    onConversationSelect(conversation);
                  }
                  onClose();
                }}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default MessagesDrawer;
