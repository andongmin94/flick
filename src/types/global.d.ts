// Global types used across the project

export type BlockSpacing = { gapAfter?: boolean };
export type ImageBlock = {
  type: "image";
  src: string;
  alt?: string;
} & BlockSpacing;
export type VideoBlock = {
  type: "video";
  src: string;
  poster?: string;
} & BlockSpacing;
export type TextBlock = { type: "text"; text: string } & BlockSpacing;
export type TrustedHtmlBlock = {
  type: "trusted-html";
  html: string;
} & BlockSpacing;
export type LegacyHtmlBlock = {
  type: "html";
  html: string;
} & BlockSpacing;
export type Block =
  | ImageBlock
  | VideoBlock
  | TextBlock
  | TrustedHtmlBlock
  | LegacyHtmlBlock;

export interface ExtractResult {
  title: string;
  blocks: Block[];
  sourceUrl?: string;
  siteId?: string;
  status?: "ok" | "empty" | "error" | "unsupported";
  message?: string;
}

export interface Rule {
  id: string;
  match: RegExp;
  articleMatch?: RegExp;
  skipClosest?: string;
  extract: (cfg?: Rule) => ExtractResult;
  prePrepare?: () => void;
  postShortsMounted?: () => void;
}

declare global {
  interface Window {
    FLICK: {
      isSupportedArticle: () => boolean;
      getActiveSiteConfig: () => Rule | null;
      extractPost: () => ExtractResult;
      buildUI: (data: ExtractResult) => void;
      closeShorts: () => void;
    };
  }
}

declare module "*.css" {
  const content: string;
  export default content;
}

export {};
