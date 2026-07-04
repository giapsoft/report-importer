import type { FormEvent, KeyboardEvent } from "react";

/** Chặn submit mặc định của form, gọi callback. */
export function formSubmit(e: FormEvent, action: () => void) {
  e.preventDefault();
  action();
}

/** Enter trên input/textarea (không phải IME) = đồng ý / áp dụng. */
export function enterToSubmit(
  e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  action: () => void,
) {
  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
  e.preventDefault();
  action();
}
