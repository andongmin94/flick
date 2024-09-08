"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, MessageCircle, MessageCircleMore } from "lucide-react";

export default function Component() {
  const [selectedPost, setSelectedPost] = useState<{
    title: string;
    href: string;
  } | null>(null);
  const [titles, setTitles] = useState<{ title: string; href: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [postContent, setPostContent] = useState<string | null>(null);
  const [comments, setComments] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/scrape");
        const data = await response.json();
        setTitles(data.ruliweb.titles);
        setLoading(false);
      } catch (error) {
        setError("데이터를 불러오는데 실패했습니다");
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handlePostClick = async (post: { title: string; href: string }) => {
    setSelectedPost(post);
    setLoading(true);
    try {
      const response = await fetch(
        `/api/fetchPostContent?url=${encodeURIComponent(post.href)}`
      );
      const data = await response.json();
      setPostContent(data.content);
      setComments(data.comments);
      setLoading(false);
    } catch (error) {
      setError("게시글 내용을 불러오는데 실패했습니다");
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        <Card className="border-4 border-red-500 shadow-lg">
          <CardContent className="pt-6 font-bold">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-background text-foreground p-4">
      <Card className="overflow-hidden border-4 border-primary shadow-xl">
        <CardHeader className="bg-primary text-primary-foreground">
          <CardTitle className="text-3xl font-bold text-center">
            커뮤니티 인기글 모음
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4"
              >
                <Skeleton className="w-full h-16 mb-4 rounded-lg" />
                <Skeleton className="w-full h-16 mb-4 rounded-lg" />
                <Skeleton className="w-full h-16 mb-4 rounded-lg" />
              </motion.div>
            ) : !selectedPost ? (
              <motion.div
                key="titles"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <ScrollArea className="h-[calc(100vh-150px)] p-4">
                  {titles.map((post, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Button
                        variant="ghost"
                        className="w-full justify-start mb-4 text-left hover:bg-secondary rounded-lg border-2 border-secondary hover:border-primary transition-all duration-300 overflow-hidden group"
                        onClick={() => handlePostClick(post)}
                      >
                        <div className="flex items-center w-full">
                          <div className="bg-primary text-primary-foreground rounded-full p-2 mr-3 group-hover:bg-secondary-foreground transition-colors duration-300">
                            <MessageCircleMore className="h-4 w-4" />
                          </div>
                          <div className="flex-grow truncate">{post.title}</div>
                          <div className="bg-secondary-foreground text-secondary rounded-full px-2 py-1 text-xs ml-2">
                            인기
                          </div>
                        </div>
                      </Button>
                    </motion.div>
                  ))}
                </ScrollArea>
              </motion.div>
            ) : (
              <motion.div
                key="post"
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="p-4"
              >
                <Button
                  variant="outline"
                  onClick={() => setSelectedPost(null)}
                  className="mb-4 border-2 hover:border-primary"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> 뒤로가기
                </Button>
                <h2 className="text-2xl font-semibold mb-4 pb-2 border-b-2 border-primary">
                  {selectedPost.title}
                </h2>
                {postContent && (
                  <div className="prose prose-sm max-w-none">
                    {postContent.split("\n").map((line, index) => {
                      const imgMatch = line.match(/<img[^>]+src="([^">]+)"/);
                      if (imgMatch) {
                        return (
                          <Image
                            key={index}
                            src={imgMatch[1]}
                            alt={`Image ${index}`}
                            width={500}
                            height={300}
                            className="rounded-lg shadow-md mb-4 w-full"
                          />
                        );
                      }
                      return (
                        <p
                          key={index}
                          dangerouslySetInnerHTML={{ __html: line }}
                          className="mb-2"
                        />
                      );
                    })}
                  </div>
                )}
                {comments && comments.length > 0 && (
                  <div className="mt-8">
                    <h3 className="flex text-xl font-semibold mb-4items-center border-b-2 border-primary pb-2">
                      <MessageCircle className="mr-2" /> 댓글
                    </h3>
                    <br />
                    {comments.map(
                      (comment, index) =>
                        comment.trim() !== "" && (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-secondary p-3 rounded-lg mb-2  flex items-center border border-primary"
                          >
                            <div className="bg-primary text-primary-foreground rounded-full p-2 mr-3 flex-shrink-0">
                              익명
                            </div>
                            <div
                              dangerouslySetInnerHTML={{ __html: comment }}
                              className="flex-1"
                            />
                          </motion.div>
                        )
                    )}
                    <br />
                    <Button
                      variant="outline"
                      onClick={() => setSelectedPost(null)}
                      className="mb-4 border-2 hover:border-primary"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" /> 뒤로가기
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
}
