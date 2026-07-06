import { useState } from "react";
import { Dialog } from "./Dialog";
import { formSubmit } from "@/utils/enterSubmit";

interface AddSeasonDialogProps {
  onCancel: () => void;
  onCreate: (name: string) => void;
}

export function AddSeasonDialog({ onCancel, onCreate }: AddSeasonDialogProps) {
  const [name, setName] = useState("");

  return (
    <Dialog title="Thêm mùa">
      <form
        onSubmit={(e) =>
          formSubmit(e, () => {
            if (!name.trim()) return;
            onCreate(name.trim());
          })
        }
      >
        <div className="field">
          <label htmlFor="new-season-name">Tên mùa</label>
          <input
            id="new-season-name"
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
            Tạo
          </button>
        </div>
      </form>
    </Dialog>
  );
}
