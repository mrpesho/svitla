import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive' | 'info'
  onConfirm: () => void
  onCancel?: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const isInfoMode = variant === 'info'
  const handleBackdropClick = () => {
    if (isInfoMode) {
      onConfirm()
    } else if (onCancel) {
      onCancel()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleBackdropClick}
      />

      {/* Dialog */}
      <div className="relative bg-background rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-6">{message}</p>

        <div className="flex justify-end gap-3">
          {!isInfoMode && onCancel && (
            <Button variant="outline" onClick={onCancel}>
              {cancelLabel}
            </Button>
          )}
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
          >
            {isInfoMode ? 'OK' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
