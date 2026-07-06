import { useMemo, useState } from "react";
import { Dialog } from "./Dialog";
import { formSubmit } from "@/utils/enterSubmit";
import {
  isUnsetSeasonId,
  UNSET_SEASON_ID,
  UNSET_SEASON_NAME,
} from "@/domain/season";
import type { Season } from "@/domain/types";

interface ChangeSeasonDialogProps {
  seasons: Season[];
  currentSeasonId: number;
  reportCount: number;
  onCancel: () => void;
  onConfirm: (seasonId: number | null) => void;
}

export function ChangeSeasonDialog({
  seasons,
  currentSeasonId,
  reportCount,
  onCancel,
  onConfirm,
}: ChangeSeasonDialogProps) {
  const options = useMemo(
    () =>
      [
        ...seasons.map((season) => ({
          id: season.id,
          name: season.name,
        })),
        { id: UNSET_SEASON_ID, name: UNSET_SEASON_NAME },
      ].filter((option) => option.id !== currentSeasonId),
    [seasons, currentSeasonId],
  );

  const [targetSeasonId, setTargetSeasonId] = useState(
    () => options[0]?.id ?? UNSET_SEASON_ID,
  );

  const resolvedTarget = isUnsetSeasonId(targetSeasonId) ? null : targetSeasonId;

  return (
    <Dialog title="Đổi mùa">
      <form
        onSubmit={(e) =>
          formSubmit(e, () => {
            onConfirm(resolvedTarget);
          })
        }
      >
        <p style={{ marginTop: 0 }}>
          Chuyển {reportCount} báo cáo đã chọn sang mùa:
        </p>
        <div className="season-picker">
          {options.map((option) => (
            <label key={option.id} className="season-picker-item">
              <input
                type="radio"
                name="target-season"
                checked={targetSeasonId === option.id}
                onChange={() => setTargetSeasonId(option.id)}
              />
              <span>{option.name}</span>
            </label>
          ))}
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onCancel}>
            Hủy
          </button>
          <button
            type="submit"
            className="btn primary"
            disabled={options.length === 0}
          >
            Xác nhận
          </button>
        </div>
      </form>
    </Dialog>
  );
}
