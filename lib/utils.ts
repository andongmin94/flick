import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function encodeURL(url: string) {
  return Buffer.from(url).toString('base64');
}

export function decodeURL(encoded: string) {
  return Buffer.from(encoded, 'base64').toString('ascii');
}