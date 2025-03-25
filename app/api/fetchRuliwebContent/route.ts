import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 1800 }); // 30분 동안 캐싱

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const decodedUrl = decodeURIComponent(url);

  // 캐시에서 데이터 확인
  const cachedData = cache.get(decodedUrl);
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  // 빠르게 응답 보내기
  fetchAndCache(decodedUrl); // 비동기 처리
  return NextResponse.json({ message: "Fetching in background, try again later" });
}

async function fetchAndCache(url: string) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const $ = cheerio.load(text);

    const title = $(".subject_inner_text").text();
    const content = $(".board_main_view").html();
    const comments = $(".comment_view_wrapper.row .text")
      .map((_, el) => $(el).html())
      .get();

    const data = { title, content, comments };
    cache.set(url, data);
  } catch (error) {
    console.error("크롤링 실패:", error);
  }
}

// 캐시 지우기 엔드포인트 추가
export async function DELETE() {
  cache.flushAll();
  return NextResponse.json({ message: "Cache cleared" });
}
