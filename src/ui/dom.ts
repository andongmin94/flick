export function makeButton(className: string, label: string, title: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.title = title;
  button.setAttribute("aria-label", title);
  return button;
}

export function flashButtonText(
  button: HTMLButtonElement,
  text: string,
  restoreText: string
) {
  button.textContent = text;
  window.setTimeout(() => {
    button.textContent = restoreText;
  }, 1400);
}

export function setRangePercent(input: HTMLInputElement) {
  const min = parseFloat(input.min) || 0;
  const max = parseFloat(input.max) || 100;
  const value = parseFloat(input.value) || min;
  const percent = ((value - min) / (max - min)) * 100;
  input.style.setProperty("--_percent", percent + "%");
}
