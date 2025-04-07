import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 1800 }); // 30분 동안 캐싱

export const maxDuration = 10; // Vercel 서버리스 함수 최대 실행 시간 설정 (9초)

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

  try {
    // 타임아웃 설정으로 fetch 요청 (8초 타임아웃)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);
    
    const response = await fetch(decodedUrl, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);
    
    const text = await response.text();
    const $ = cheerio.load(text);

    // board_main_view 태그 안의 이미지 URL을 절대 경로로 변환
    $(".board_main_view img").each((_, img) => {
      const src = $(img).attr("src");
      if (src && !src.startsWith("http")) {
        const absoluteSrc = new URL(src, decodedUrl).href;
        $(img).attr("src", absoluteSrc);
      }
    });

    // 불필요한 요소 먼저 제거하여 처리 속도 향상
    $(".board_main_view .row.relative").remove();
    $(".board_main_view script").remove();

    // 처리 속도 개선을 위해 필요한 데이터만 추출
    const title = $(".subject_inner_text").text().trim();
    const content = $(".board_main_view").html() || "";

    // 댓글은 최대 20개만 수집하여 처리 시간 단축
    const filteredComments = $(".comment_view_wrapper.row .text")
      .slice(0, 20)
      .map(function () {
        return $(this).html();
      })
      .get();

    const data = { title, content, comments: filteredComments };

    // 캐시에 데이터 저장
    cache.set(decodedUrl, data);

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: "Request timed out" },
        { status: 408 },
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch post content" },
      { status: 500 },
    );
  }
}

// 캐시 지우기 엔드포인트 추가
export async function DELETE() {
  cache.flushAll();
  return NextResponse.json({ message: "Cache cleared" });
}
