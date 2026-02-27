// Global types used across the project

export type ImageBlock = { type: "image"; src: string; alt?: string };
export type VideoBlock = { type: "video"; src: string; poster?: string };
export type HtmlBlock = { type: "html"; html: string };
export type Block = ImageBlock | VideoBlock | HtmlBlock;

export interface ExtractResult {
  title: string;
  blocks: Block[];
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
