import { defineConfig } from "vitepress";

const ogTitle = "FLICK";
const ogDescription = "유머 게시글을 유튜브 쇼츠 포맷으로 변환하는 크롬 익스텐션";
const ogUrl = "https://flick.andongmin.com";
const ogImage = "https://flick.andongmin.com/logo.png";

export default defineConfig({
    title: "FLICK",
    description: "유머 게시글을 유튜브 쇼츠 포맷으로 변환하는 크롬 익스텐션",

    head: [
      ["link", { rel: "icon", type: "image/png", href: "/logo.png" }],
      ["link", { rel: "organization", href: "https://github.com/andongmin94" }],
      ["meta", { property: "og:type", content: "website" }],
      ["meta", { property: "og:title", content: ogTitle }],
      ["meta", { property: "og:description", content: ogDescription }],
      ["meta", { property: "og:url", content: ogUrl }],
      ["meta", { property: "og:image", content: ogImage }],
      ["meta", { name: "theme-color", content: "#FF3F15" }],
      [
        "script",
        {
          src: "https://cdn.usefathom.com/script.js",
          "data-site": "CBDFBSLI",
          "data-spa": "auto",
          defer: "",
        },
      ],
    ],

    vite: {
      server: {
        port: 3000,
        host: "0.0.0.0",
      },
    },

    themeConfig: {
      logo: "/logo.svg",

      editLink: {
        pattern: "https://mail.google.com/mail/?view=cm&fs=1&to=andongmin94@gmail.com&su=FLICK%20문의&body=",
        text: "Gmail로 문의하기",
      },

      socialLinks: [
      { icon: "github", link: "https://github.com/andongmin94/flick" },
      ],

      sidebarMenuLabel: "메뉴",

      returnToTopLabel: "위로 가기",

      darkModeSwitchLabel: "다크 모드",

      docFooter: {
        prev: "이전 페이지",
        next: "다음 페이지",
      },

      footer: {
        message: `Released under the EULA License`,
        copyright: "Copyright © 2025 안동민",
      },

      nav: [
        { text: "FLICK 가이드", link: "/guide", activeMatch: "/guide" },
        { text: "FLICK 개발자", link: "/maintainer" },
      ],

      sidebar: {
        "/guide/": [
          {
            text: "FLICK 가이드",
            items: [
              {
                text: "FLICK 시작하기",
                link: "/guide/",
              },
              {
                text: "에펨코리아",
                link: "/guide/fmkorea",
              },
              {
                text: "디시인사이드",
                link: "/guide/dcinside",
              },
              {
                text: "개드립",
                link: "/guide/dogdrip",
              },
              {
                text: "네이버 카페",
                link: "/guide/naverCafe",
              },
            ],
          },
          {
            items: [
              {
                text: "개인정보처리방침",
                link: "/guide/policy",
              }
            ],
          },
        ],
      },

      outline: {
        level: [2, 3],
        label: "목차"    // ← 추가: 원하는 한글로 변경
      },
    },
    transformPageData(pageData: any) {
      const canonicalUrl = `${ogUrl}/${pageData.relativePath}`
        .replace(/\/index\.md$/, "/")
        .replace(/\.md$/, "/");
      pageData.frontmatter.head ??= [];
      pageData.frontmatter.head.unshift([
        "link",
        { rel: "canonical", href: canonicalUrl },
      ]);
      return pageData;
    }
});
