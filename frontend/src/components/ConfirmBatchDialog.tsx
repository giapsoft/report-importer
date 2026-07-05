import { useEffect, useRef, useState } from "react";
import { Volume2, Square, Plus } from "lucide-react";
import { toThousandSeparatorString } from "@/domain/format";
import {
  getNumberAudioPlaybackRate,
  isAudioPlaybackSupported,
  playNumberListAudio,
  setNumberAudioPlaybackRate,
  unlockNumberAudio,
} from "@/domain/numberAudio";
import { formSubmit } from "@/utils/enterSubmit";
import { Dialog } from "./Dialog";
import { DateStepper } from "./DateStepper";

interface ConfirmBatchDialogProps {
  initialNumbers: number[];
  initialDate: string | null;
  hasDateColumn: boolean;
  /** Khi chỉ chọn đúng 1 dòng: hiện nút chèn dưới dòng đó (index 0-based). */
  insertAfterRowIndex?: number | null;
  onCancel: () => void;
  onConfirm: (
    numbers: number[],
    date: string | null,
    insertAfterRowIndex?: number | null,
  ) => void;
}

export function ConfirmBatchDialog({
  initialNumbers,
  initialDate,
  hasDateColumn,
  insertAfterRowIndex = null,
  onCancel,
  onConfirm,
}: ConfirmBatchDialogProps) {
  const [numbers, setNumbers] = useState<string[]>(
    initialNumbers.map(String),
  );
  const [date, setDate] = useState(initialDate ?? "");
  const [speaking, setSpeaking] = useState(false);
  const [listenSpeed, setListenSpeed] = useState(getNumberAudioPlaybackRate);
  const [listenError, setListenError] = useState<string | null>(null);
  const stopSpeechRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      stopSpeechRef.current?.();
      stopSpeechRef.current = null;
    };
  }, []);

  const toggleListen = () => {
    if (speaking) {
      stopSpeechRef.current?.();
      stopSpeechRef.current = null;
      setSpeaking(false);
      return;
    }

    const values = numbers.map((s) => s.trim()).filter(Boolean);
    if (values.length === 0) return;

    unlockNumberAudio();
    setListenError(null);
    stopSpeechRef.current?.();
    const { stop } = playNumberListAudio(values, {
      onStart: () => setSpeaking(true),
      onEnd: () => {
        setSpeaking(false);
        stopSpeechRef.current = null;
      },
      onError: (message) => {
        setListenError(message);
        setSpeaking(false);
        stopSpeechRef.current = null;
      },
    });
    stopSpeechRef.current = stop;
  };

  const listenAvailable = isAudioPlaybackSupported();

  const updateAt = (index: number, value: string) => {
    setNumbers((prev) => prev.map((n, i) => (i === index ? value : n)));
  };

  const removeAt = (index: number) => {
    setNumbers((prev) => prev.filter((_, i) => i !== index));
  };

  const insertAfter = (index: number) => {
    setNumbers((prev) => [
      ...prev.slice(0, index + 1),
      "0",
      ...prev.slice(index + 1),
    ]);
  };

  const addNumber = () => setNumbers((prev) => [...prev, "0"]);

  const parseNumbers = () =>
    numbers
      .map((s) => Number(String(s).replace(/\./g, "")))
      .filter((n) => Number.isFinite(n));

  const submitAppend = () => {
    onConfirm(parseNumbers(), hasDateColumn && date ? date : null, null);
  };

  const submitInsert = () => {
    onConfirm(
      parseNumbers(),
      hasDateColumn && date ? date : null,
      insertAfterRowIndex,
    );
  };

  const showInsert =
    insertAfterRowIndex != null && insertAfterRowIndex >= 0;

  return (
    <Dialog
      title="Xác nhận danh sách số"
      fullscreen
      headerAction={
        <button type="button" className="btn" onClick={onCancel}>
          Hủy
        </button>
      }
    >
      <form
        className="dialog-fullscreen-form"
        onSubmit={(e) => formSubmit(e, submitAppend)}
      >
        {hasDateColumn && date && (
          <div className="dialog-fullscreen-top field">
            <DateStepper value={date} onChange={setDate} />
          </div>
        )}

        <div className="dialog-fullscreen-body">
          <div className="batch-numbers">
            {numbers.map((n, i) => (
              <div className="batch-number-row" key={i}>
                <input
                  inputMode="numeric"
                  enterKeyHint="done"
                  value={n}
                  onChange={(e) => updateAt(i, e.target.value)}
                  aria-label={`Số ${i + 1}: ${toThousandSeparatorString(Number(n) || 0)}`}
                />
                <button
                  type="button"
                  className="btn batch-insert-btn"
                  onClick={() => insertAfter(i)}
                  title="Chèn số bên dưới"
                  aria-label={`Chèn số bên dưới số ${i + 1}`}
                >
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  className="btn danger"
                  onClick={() => removeAt(i)}
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
        </div>

        <footer className="dialog-fullscreen-footer">
          <button type="button" className="btn" onClick={addNumber}>
            + Thêm số
          </button>

          {listenError && (
            <p className="batch-listen-error" role="alert">
              {listenError}
            </p>
          )}

          <div className="dialog-footer dialog-footer-batch">
            {listenAvailable && (
              <>
                <button
                  type="button"
                  className={`btn batch-listen-btn${speaking ? " speaking" : ""}`}
                  onClick={toggleListen}
                  disabled={numbers.every((n) => !n.trim())}
                  title={
                    speaking
                      ? "Dừng đọc"
                      : "Đọc lại danh sách số theo thứ tự (từng chữ số tiếng Việt)"
                  }
                >
                  {speaking ? <Square size={16} /> : <Volume2 size={16} />}
                </button>
                <label className="batch-listen-speed" htmlFor="batch-listen-speed">
                  <input
                    id="batch-listen-speed"
                    type="range"
                    min={0.75}
                    max={2}
                    step={0.05}
                    value={listenSpeed}
                    disabled={speaking}
                    onChange={(e) => {
                      const rate = Number(e.target.value);
                      setListenSpeed(rate);
                      setNumberAudioPlaybackRate(rate);
                    }}
                  />
                  <span className="batch-listen-speed-value">
                    {listenSpeed.toFixed(2)}
                  </span>
                </label>
              </>
            )}
            <div className="dialog-footer-batch-actions">
              {showInsert && (
                <button type="button" className="btn" onClick={submitInsert}>
                  Chèn vào {insertAfterRowIndex! + 1}
                </button>
              )}
              <button type="submit" className="btn primary">
                OK
              </button>
            </div>
          </div>
        </footer>
      </form>
    </Dialog>
  );
}
