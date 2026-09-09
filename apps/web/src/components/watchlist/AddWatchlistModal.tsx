"use client";

import * as React from "react";
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter, Button, Input } from "@sih/ui";
import { normalizePlate } from "@/lib/plates";

export interface AddWatchlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { plateText: string; reason: string; addedBy: string; expiresAt?: string }) => Promise<void>;
}

export function AddWatchlistModal({ open, onOpenChange, onSubmit }: AddWatchlistModalProps) {
  const [plateText, setPlateText] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plateText.trim() || !reason.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        plateText: normalizePlate(plateText),
        reason: reason.trim(),
        addedBy: "operator",
        expiresAt: expiresAt || undefined,
      });
      setPlateText("");
      setReason("");
      setExpiresAt("");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>Add to Watchlist</ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <div>
              <label className="mb-1 block font-mono text-xs text-text-muted">Plate number</label>
              <Input
                value={plateText}
                onChange={(e) => setPlateText(e.target.value.toUpperCase())}
                placeholder="WB 20 AB 1234"
                required
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-xs text-text-muted">Reason</label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reported stolen — FIR #..."
                required
              />
            </div>
            <div>
              <label className="mb-1 block font-mono text-xs text-text-muted">Expires (optional)</label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "Adding…" : "Add to Watchlist"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
