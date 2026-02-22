'use client';

import Modal from '@/components/ui/Modal';
import DecisionLinkEditor from '@/components/decisions/DecisionLinkEditor';

interface DecisionLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  decisionId: number;
  projectId?: number | null;
  selfSeq?: number | null;
  onSaved?: () => void;
}

const DecisionLinkModal = ({
  isOpen,
  onClose,
  projectId,
  selfSeq,
  onSaved,
}: DecisionLinkModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <DecisionLinkEditor
        projectId={projectId ?? null}
        selfSeq={selfSeq}
        onSaved={onSaved}
        onClose={onClose}
        isActive={isOpen}
      />
    </Modal>
  );
};

export default DecisionLinkModal;
