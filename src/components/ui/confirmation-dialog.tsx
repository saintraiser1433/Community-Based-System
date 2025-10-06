import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Trash2, Edit, Plus } from "lucide-react"

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: string
  description: string
  action: 'create' | 'update' | 'delete'
  itemName?: string
  loading?: boolean
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  action,
  itemName,
  loading = false
}: ConfirmationDialogProps) {
  const getIcon = () => {
    switch (action) {
      case 'create':
        return <Plus className="h-5 w-5 text-green-600" />
      case 'update':
        return <Edit className="h-5 w-5 text-blue-600" />
      case 'delete':
        return <Trash2 className="h-5 w-5 text-red-600" />
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    }
  }

  const getButtonVariant = () => {
    switch (action) {
      case 'create':
        return 'default'
      case 'update':
        return 'default'
      case 'delete':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const getButtonText = () => {
    switch (action) {
      case 'create':
        return 'Create'
      case 'update':
        return 'Update'
      case 'delete':
        return 'Delete'
      default:
        return 'Confirm'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant={getButtonVariant()}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : getButtonText()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}



