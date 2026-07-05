import { useEffect, useRef, useState } from "react";
import {
  Volume2,
  Square,
  Minus,
  Plus,
  Trash2,
  Delete,
  CornerDownLeft,
} from "lucide-react";
import { toThousandSeparatorString } from "@/domain/format";
import {
  getNumberAudioPlaybackRate,
  isAudioPlaybackSupported,
  MAX_PLAYBACK_RATE,
  MIN_PLAYBACK_RATE,
  playDigitKeySound,
  playNumberListAudio,
  playTingKeySound,
  PLAYBACK_RATE_STEP,
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

const NUMPAD_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

function formatChipValue(raw: string, editing: boolean): string {
  if (editing) return raw;
  const n = Number(String(raw).replace(/\./g, ""));
  return toThousandSeparatorString(Number.isFinite(n) ? n : 0);
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [listenSpeed, setListenSpeed] = useState(getNumberAudioPlaybackRate);
  const [listenError, setListenError] = useState<string | null>(null);
  const stopSpeechRef = useRef<(() => void) | null>(null);
  const chipRefs = useRef<(HTMLDivElement | null)[]>([]);
  const keepListenSelectionRef = useRef(false);
  const activeChipValue =
    selectedIndex !== null ? numbers[selectedIndex] ?? "" : "";

  useEffect(() => {
    return () => {
      stopSpeechRef.current?.();
      stopSpeechRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (selectedIndex === null) return;
    chipRefs.current[selectedIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedIndex, activeChipValue]);

  const toggleSelect = (index: number) => {
    setSelectedIndex((prev) => (prev === index ? null : index));
  };

  const removeAt = (index: number) => {
    setNumbers((prev) => prev.filter((_, i) => i !== index));
    setSelectedIndex((prev) => {
      if (prev === null) return null;
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  };

  const appendDigit = (digit: string) => {
    unlockNumberAudio();
    playDigitKeySound(digit);
    if (selectedIndex !== null) {
      setNumbers((prev) =>
        prev.map((n, i) => (i === selectedIndex ? n + digit : n)),
      );
      return;
    }
    setNumbers((prev) => {
      const nextIndex = prev.length;
      setSelectedIndex(nextIndex);
      return [...prev, digit];
    });
  };

  const backspaceInput = () => {
    if (selectedIndex === null) return;
    setNumbers((prev) =>
      prev.map((n, i) => (i === selectedIndex ? n.slice(0, -1) : n)),
    );
  };

  const handleEnter = () => {
    if (selectedIndex === null) return;
    unlockNumberAudio();
    playTingKeySound();
    setSelectedIndex(null);
  };

  const insertChipAfterSelected = () => {
    if (selectedIndex === null) return;
    const insertAt = selectedIndex + 1;
    setNumbers((prev) => [
      ...prev.slice(0, insertAt),
      "",
      ...prev.slice(insertAt),
    ]);
    setSelectedIndex(insertAt);
  };

  const adjustListenSpeed = (delta: number) => {
    if (speaking) return;
    const next = Math.min(
      MAX_PLAYBACK_RATE,
      Math.max(MIN_PLAYBACK_RATE, listenSpeed + delta),
    );
    setListenSpeed(next);
    setNumberAudioPlaybackRate(next);
  };

  const finishListening = () => {
    setSpeaking(false);
    stopSpeechRef.current = null;
    if (!keepListenSelectionRef.current) {
      setSelectedIndex(null);
    }
    keepListenSelectionRef.current = false;
  };

  const toggleListen = () => {
    if (speaking) {
      keepListenSelectionRef.current = true;
      stopSpeechRef.current?.();
      return;
    }

    const listenableEntries = numbers
      .map((s, index) => ({ value: s.trim(), index }))
      .filter((entry) => entry.value.length > 0);
    if (listenableEntries.length === 0) return;

    const values = listenableEntries.map((entry) => entry.value);
    let startAtIndex = 0;
    if (selectedIndex !== null) {
      const fromSelected = listenableEntries.findIndex(
        (entry) => entry.index === selectedIndex,
      );
      if (fromSelected >= 0) startAtIndex = fromSelected;
    }

    unlockNumberAudio();
    setListenError(null);
    stopSpeechRef.current?.();
    const { stop } = playNumberListAudio(values, {
      startAtIndex,
      onStart: () => setSpeaking(true),
      onItemStart: (valueIndex) => {
        setSelectedIndex(listenableEntries[valueIndex].index);
      },
      onEnd: () => {
        finishListening();
      },
      onError: (message) => {
        setListenError(message);
        finishListening();
      },
    });
    stopSpeechRef.current = stop;
  };

  const listenAvailable = isAudioPlaybackSupported();
  const enterDisabled = selectedIndex === null;

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
            {numbers.map((n, i) => {
              const selected = selectedIndex === i;
              return (
                <div
                  key={i}
                  ref={(el) => {
                    chipRefs.current[i] = el;
                  }}
                  className={`batch-number-chip${selected ? " selected" : ""}${speaking && selected ? " speaking" : ""}`}
                >
                  <button
                    type="button"
                    className="batch-number-chip-main"
                    onClick={() => toggleSelect(i)}
                    aria-pressed={selected}
                    aria-label={`Số ${i + 1}: ${formatChipValue(n, selected)}`}
                  >
                    {formatChipValue(n, selected)}
                  </button>
                  <button
                    type="button"
                    className="batch-number-chip-delete"
                    onClick={() => removeAt(i)}
                    title="Xóa"
                    aria-label={`Xóa số ${i + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="dialog-fullscreen-footer">
          {listenError && (
            <p className="batch-listen-error" role="alert">
              {listenError}
            </p>
          )}

          <div className="dialog-footer dialog-footer-batch">
            {listenAvailable && (
              <div
                className={`batch-listen-group${speaking ? " speaking" : ""}`}
              >
                {!speaking && (
                  <>
                    <button
                      type="button"
                      className="btn batch-listen-speed-btn"
                      onClick={() => adjustListenSpeed(-PLAYBACK_RATE_STEP)}
                      disabled={listenSpeed <= MIN_PLAYBACK_RATE + 1e-9}
                      title="Giảm tốc độ đọc"
                      aria-label="Giảm tốc độ đọc"
                    >
                      <Minus size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn batch-listen-btn"
                      onClick={toggleListen}
                      disabled={numbers.every((n) => !n.trim())}
                      title="Đọc lại danh sách số theo thứ tự (từng chữ số tiếng Việt)"
                    >
                      <Volume2 size={16} />
                      <span className="batch-listen-speed-value">
                        {listenSpeed.toFixed(2)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn batch-listen-speed-btn"
                      onClick={() => adjustListenSpeed(PLAYBACK_RATE_STEP)}
                      disabled={listenSpeed >= MAX_PLAYBACK_RATE - 1e-9}
                      title="Tăng tốc độ đọc"
                      aria-label="Tăng tốc độ đọc"
                    >
                      <Plus size={16} />
                    </button>
                  </>
                )}
                {speaking && (
                  <button
                    type="button"
                    className="btn batch-listen-btn speaking batch-listen-stop"
                    onClick={toggleListen}
                    title="Dừng đọc"
                  >
                    <Square size={16} />
                    <span>Dừng</span>
                  </button>
                )}
              </div>
            )}
            <div className="dialog-footer-batch-actions">
              {showInsert && (
                <button type="button" className="btn" onClick={submitInsert}>
                  Chèn vào {insertAfterRowIndex! + 1}
                </button>
              )}
              <button
                type="button"
                className="btn"
                disabled={selectedIndex === null}
                onClick={insertChipAfterSelected}
              >
                Chèn chip
              </button>
              <button type="submit" className="btn primary">
                OK
              </button>
            </div>
          </div>

          <div className="batch-numpad" aria-label="Bàn phím số">
            {NUMPAD_KEYS.map((digit) => (
              <button
                key={digit}
                type="button"
                className="btn batch-numpad-key"
                onClick={() => appendDigit(digit)}
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              className="btn batch-numpad-key"
              onClick={backspaceInput}
              title="Xóa một chữ số"
              aria-label="Xóa một chữ số"
            >
              <Delete size={20} />
            </button>
            <button
              type="button"
              className="btn batch-numpad-key"
              onClick={() => appendDigit("0")}
            >
              0
            </button>
            <button
              type="button"
              className="btn batch-numpad-key batch-numpad-enter"
              disabled={enterDisabled}
              onClick={handleEnter}
              title="Hoàn tất nhập số đang chọn"
              aria-label="Hoàn tất nhập số đang chọn"
            >
              <CornerDownLeft size={20} />
            </button>
          </div>
        </footer>
      </form>
    </Dialog>
  );
}
