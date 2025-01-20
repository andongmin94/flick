import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

// 캐시 태그 생성 함수
function createCacheTag(url: string) {
  // URL을 해싱하여 태그로 사용 (URL이 길 수 있으므로)
  return `ruliweb-content-${Buffer.from(url).toString("base64").substring(0, 32)}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const decodedUrl = decodeURIComponent(url);
  const cacheTag = createCacheTag(decodedUrl);

  // CORS 프록시 URL
  const proxyOptions = [
    "https://api.allorigins.win/raw?url=", // All Origins
    "https://thingproxy.freeboard.io/fetch/", // ThingProxy
    "https://corsproxy.io/?", // CORS Proxy
    "https://cors-anywhere.herokuapp.com/", // CORS Anywhere (요청 제한이 있을 수 있음)
    "https://api.codetabs.com/v1/proxy?quest=", // CodeTabs Proxy
    "https://cors-proxy.htmldriven.com/?url=", // CORS Proxy by HTMLDriven
    "https://proxy.cors.sh/", // CORS.SH
    "https://cors.bridged.cc/", // Bridged CORS Proxy
    "https://crossorigin.me/", // CrossOrigin.me
    "https://yacdn.org/proxy/", // YaCDN
  ];

  // 모든 프록시를 순차적으로 시도
  for (const proxyUrl of proxyOptions) {
    try {
      // 프록시를 통해 요청
      const url = proxyUrl + encodeURIComponent(decodedUrl);
      const response = await fetch(url, {
        next: {
          revalidate: 1800,
          tags: [cacheTag],
        },
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

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

      // class가 row relative인 요소 제거
      $(".board_main_view .row.relative").remove();

      // class가 text인 요소만 필터링하여 HTML을 배열로 수집
      const filteredComments = $(".comment_view_wrapper.row .text")
        .map(function () {
          return $(this).html();
        })
        .get();

      const title = $(".subject_inner_text").text();
      const content = $(".board_main_view").html();
      const data = { title, content, comments: filteredComments };

      // 캐시 헤더를 포함한 응답 반환
      return NextResponse.json(data, {
        headers: {
          "Cache-Control":
            "max-age=1800, s-maxage=1800, stale-while-revalidate=3600",
        },
      });
    } catch (error) {
      console.error("Error fetching post content:", error);
      return NextResponse.json(
        { error: "Failed to fetch post content" },
        { status: 500 },
      );
    }
  }
}

// 캐시 지우기 엔드포인트 추가 (태그 기반 무효화)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (url) {
    // 특정 URL 캐시만 무효화
    const decodedUrl = decodeURIComponent(url);
    const cacheTag = createCacheTag(decodedUrl);
    await revalidateTag(cacheTag);
    return NextResponse.json({ message: `Cache for specific URL cleared` });
  } else {
    // 프론트엔드에서 최근 조회한 URL 목록을 유지하고,
    // 필요할 때 해당 목록에 있는 URL들의 캐시를 모두 무효화하는 것이 좋습니다.
    // 이 예제에서는 간단히 응답만 반환합니다.
    return NextResponse.json({
      message: "Please provide a URL to clear specific cache",
      info: "For clearing all cache, implement specific revalidation logic based on your app needs",
    });
  }
}
