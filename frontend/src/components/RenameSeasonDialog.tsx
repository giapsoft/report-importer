import { useState } from "react";
import { Dialog } from "./Dialog";
import { formSubmit } from "@/utils/enterSubmit";

interface RenameSeasonDialogProps {
  initialName: string;
  onCancel: () => void;
  onSave: (name: string) => void;
}

export function RenameSeasonDialog({
  initialName,
  onCancel,
  onSave,
}: RenameSeasonDialogProps) {
  const [name, setName] = useState(initialName);

  return (
    <Dialog title="Sửa mùa">
      <form
        onSubmit={(e) =>
          formSubmit(e, () => {
            if (!name.trim()) return;
            onSave(name.trim());
          })
        }
      >
        <div className="field">
          <label htmlFor="edit-season-name">Tên mùa</label>
          <input
            id="edit-season-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            enterKeyHint="done"
            autoFocus
          />
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel}>
            Hủy
          </button>
          <button type="submit" className="btn primary" disabled={!name.trim()}>
            Lưu
          </button>
        </div>
      </form>
    </Dialog>
  );
}
