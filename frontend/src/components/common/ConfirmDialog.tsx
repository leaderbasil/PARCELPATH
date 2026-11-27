import { useUI } from "@/i18n";
import { Button } from "./Button";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ui = useUI();
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {ui.common.cancel}
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {ui.common.confirm}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-muted">{message}</p>
    </Modal>
  );
}
