import type { ExtractResult } from "../types/global";
import {
  createBackgroundSection,
  createStyleSection,
} from "./control-panel-sections";
import { makeButton } from "./dom";

type ControlPanelArgs = {
  data: ExtractResult;
  stage: HTMLElement;
  wrap: HTMLElement;
  header: HTMLElement;
  footer: HTMLElement;
  title: HTMLElement;
  body: HTMLElement;
  onClose: () => void;
};

function createTopRow(data: ExtractResult, onClose: () => void) {
  const topRow = document.createElement("div");
  topRow.className = "flick-control-row flick-control-row-main";

  const sourceButton = makeButton("flick-tool-btn", "↗", "원본 글 열기");
  const closeButton = makeButton(
    "flick-tool-btn flick-tool-btn-close",
    "×",
    "닫기",
  );

  sourceButton.addEventListener("click", () => {
    window.open(
      data.sourceUrl || location.href,
      "_blank",
      "noopener,noreferrer",
    );
  });
  closeButton.addEventListener("click", onClose);

  topRow.appendChild(sourceButton);
  topRow.appendChild(closeButton);
  return topRow;
}

export function createControlPanel(args: ControlPanelArgs) {
  const { data, stage, wrap, header, footer, title, body, onClose } = args;
  const panel = document.createElement("div");
  panel.className = "flick-control-panel";

  panel.appendChild(createTopRow(data, onClose));
  panel.appendChild(createStyleSection({ stage, header, footer, title, body }));
  panel.appendChild(createBackgroundSection({ stage, wrap, body }));

  return { panel };
}
