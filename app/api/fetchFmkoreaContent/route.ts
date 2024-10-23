import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10분 동안 캐싱

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = "https://www.fmkorea.com/" + searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const decodedUrl = decodeURIComponent(url);

  // 캐시에서 데이터 확인
  const cachedData = cache.get(decodedUrl);
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  try {
    const response = await fetch(decodedUrl);
    const text = await response.text();
    const $ = cheerio.load(text);

    // rd.rd_nav_style2.clear 태그 안의 이미지 URL을 절대 경로로 변환
    $('.rd.rd_nav_style2.clear img').each((_, img) => {
      const src = $(img).attr('src');
      if (src && !src.startsWith('http')) {
        const absoluteSrc = new URL(src, decodedUrl).href;
        $(img).attr('src', absoluteSrc);
      }
    });

    // class가 row relative인 요소 제거
    $('.level').remove();

    $('.mb-2').remove();

    // class가 nick_link인 요소의 텍스트를 '익명'으로 변경
    $('.member_plate').text('익명');

    // class가 text인 요소만 필터링하여 HTML을 배열로 수집
    const filteredComments = $('.bd_capture').map(function() {
      return $(this).html();
    }).get();

    const content = $('.rd.rd_nav_style2.clear').html();
    const data = { content, comments: filteredComments };

    // 캐시에 데이터 저장
    cache.set(decodedUrl, data);

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch post content' }, { status: 500 });
  }
}

// 캐시 지우기 엔드포인트 추가
export async function DELETE() {
  cache.flushAll();
  return NextResponse.json({ message: 'Cache cleared' });
}