import path from "path";
import { writeFileSync } from "fs";
import { Feed } from "feed";
import { createContentLoader, type SiteConfig } from "vitepress";

const siteUrl = "https://flick.andongmin.com";
const blogUrl = `${siteUrl}/blog`;

export const buildEnd = async (config: SiteConfig) => {
  const feed = new Feed({
    title: "FLICK",
    description: "유머 게시글을 유튜브 쇼츠 포맷으로 변환하는 크롬 익스텐션",
    id: blogUrl,
    link: blogUrl,
    language: "ko",
    image: "https://flick.andongmin.com/logo.png",
    favicon: "https://flick.andongmin.com/logo.png",
    copyright: "Copyright © 2025 andongmin",
  });

  const posts = await createContentLoader("blog/*.md", {
    excerpt: true,
    render: true,
  }).load();

  posts.sort(
    (a, b) =>
      +new Date(b.frontmatter.date as string) -
      +new Date(a.frontmatter.date as string)
  );

  for (const { url, excerpt, frontmatter, html } of posts) {
    feed.addItem({
      title: frontmatter.title,
      id: `${siteUrl}${url}`,
      link: `${siteUrl}${url}`,
      description: excerpt,
      content: html,
      author: [
        {
          name: frontmatter.author.name,
        },
      ],
      date: frontmatter.date,
    });
  }

  writeFileSync(path.join(config.outDir, "blog.rss"), feed.rss2());
};
