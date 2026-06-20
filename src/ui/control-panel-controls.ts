import { setRangePercent } from "./dom";
import { setFontSelectOptions } from "./fonts";

export type RangeControl = {
  group: HTMLLabelElement;
  input: HTMLInputElement;
  valueEl: HTMLSpanElement;
};

export function createRangeControl(
  labelText: string,
  value: number,
  min: number,
  max: number,
  suffix: string,
): RangeControl {
  const group = document.createElement("label");
  group.className = "flick-range-group";

  const label = document.createElement("span");
  label.textContent = labelText;

  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = "1";
  input.className = "flick-fontsize-input";
  input.value = String(value);

  const valueEl = document.createElement("span");
  valueEl.className = "flick-fontsize-val";
  valueEl.textContent = value + suffix;

  group.appendChild(label);
  group.appendChild(input);
  group.appendChild(valueEl);
  setRangePercent(input);

  return { group, input, valueEl };
}

export function createFontField(
  labelText: string,
  titleText: string,
  ariaLabel: string,
  selectedValue: string,
) {
  const field = document.createElement("label");
  field.className = "flick-font-field";

  const label = document.createElement("span");
  label.textContent = labelText;

  const select = document.createElement("select");
  select.className = "flick-font-select";
  select.title = titleText;
  select.setAttribute("aria-label", ariaLabel);
  setFontSelectOptions(select, selectedValue);

  field.appendChild(label);
  field.appendChild(select);
  return { field, select };
}

export function createColorPicker(value: string, title: string) {
  const input = document.createElement("input");
  input.type = "color";
  input.className = "flick-hl-picker-main";
  input.value = value;
  input.title = title;
  input.setAttribute("aria-label", title);
  return input;
}

export function createSandboxColorLabel(
  labelText: string,
  input: HTMLInputElement,
) {
  const label = document.createElement("label");
  label.className = "flick-color-label";

  const text = document.createElement("span");
  text.textContent = labelText;

  label.appendChild(text);
  label.appendChild(input);
  return label;
}

export function clearTitleHighlight(title: HTMLElement) {
  title.querySelectorAll("[data-flick-hl]").forEach((span) => {
    const parent = span.parentNode as HTMLElement | null;
    if (!parent) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    (span as HTMLElement).remove();
  });
}
