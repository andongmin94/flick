import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 600 }); // 10분 동안 캐싱

const ruliweb = 'https://bbs.ruliweb.com/best/humor_only';
const fmkorea = 'https://www.fmkorea.com/best2';

// 루리웹 스크래핑 함수
async function scrapeRuliweb() {
  const cachedData = cache.get(ruliweb);
  if (cachedData) {
    return cachedData;
  }

  const response = await fetch(ruliweb);
  const text = await response.text();
  const $ = cheerio.load(text);
  const titles: { title: string, href: string }[] = [];

  $('div.col_9.text_wrapper a.title_wrapper').each((index, element) => {
    let textContent = '';
    $(element).contents().each((_, node) => {
      if (node.type === 'text') {
        textContent += $(node).text().trim();
      }
    });
    const href = $(element).attr('href');
    if (textContent && href) {
      titles.push({ title: textContent, href });
    }
  });

  const data = { titles };
  cache.set(ruliweb, data);
  return data;
}

// 펨코 스크래핑 함수
async function scrapeFmkorea() {
  const cachedData = cache.get(fmkorea);
  if (cachedData) {
    return cachedData;
  }

  const response = await fetch(fmkorea);
  const text = await response.text();
  const $ = cheerio.load(text);
  const titles: { title: string, href: string }[] = [];

  // fmkorea의 스크래핑 로직을 추가합니다.
  $('h3.title a.hotdeal_var8').each((index, element) => {
    let textContent = '';
    $(element).contents().each((_, node) => {
      if (node.type === 'text') {
        textContent += $(node).text().trim();
      }
    });
    const href = $(element).attr('href');
    if (textContent && href) {
      titles.push({ title: textContent, href });
    }
  });

  const data = { titles };
  cache.set(fmkorea, data);
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const ruliwebData = await scrapeRuliweb();
    const fmkoreaData = await scrapeFmkorea();

    return NextResponse.json({ ruliweb: ruliwebData, fmkorea: fmkoreaData });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to scrape data' }, { status: 500 });
  }
}

// 캐시 지우기 엔드포인트 추가
export async function DELETE() {
  cache.flushAll();
  return NextResponse.json({ message: 'Cache cleared' });
}