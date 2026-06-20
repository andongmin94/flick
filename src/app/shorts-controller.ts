import type { ExtractResult } from "../types/global";
import {
  extractActive,
  getActiveSiteConfig,
  isSupportedArticle,
  runPostMountedHook,
  runPreHook,
} from "../rules/index";
import { buildUI, closeShorts } from "../ui";
import { setToggleState } from "./toggle-button";

export const API = {
  isSupportedArticle,
  getActiveSiteConfig,
  extractPost: extractActive,
  buildUI,
  closeShorts,
};

export { closeShorts };

export function openShorts() {
  if (!isSupportedArticle()) {
    setToggleState("unsupported", "게시글 아님");
    return;
  }

  setToggleState("loading", "불러오는 중");
  try {
    runPreHook();
    const data: ExtractResult = extractActive();
    buildUI(data);
    runPostMountedHook();
    setToggleState(
      data.status === "error"
        ? "error"
        : data.status === "empty"
          ? "empty"
          : "open",
    );
  } catch (error) {
    console.error("[FLICK open error]", error);
    setToggleState("error", "열기 실패");
  }
}
