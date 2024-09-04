import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, MessageCircle, MessageCircleMore } from "lucide-react";
import FlickPage from "@/components/flick-page";
import Image from "next/image";

interface ContentBodyProps {
  loading: boolean;
  selectedPost: {
    title: string;
    href: string;
  } | null;
  currentPage: number;
  setSelectedPost: (post: { title: string; href: string } | null) => void;
  setCurrentPage: (page: number) => void;
  titles: { title: string; href: string }[];
  postContent: string | null;
  comments: string[];
  handleRuliwebClick: (post: { title: string; href: string }) => void;
}

export default function ContentBody({
  loading,
  selectedPost,
  currentPage,
  setSelectedPost,
  setCurrentPage,
  titles,
  postContent,
  comments,
  handleRuliwebClick,
}: ContentBodyProps) {
  return (
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
          <FlickPage
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
          <ScrollArea className="h-[77.2vh] p-4">
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
                  onClick={() => handleRuliwebClick(post)}
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
              <h3 className="flex text-xl font-semibold mb-4 items-center border-b-2 border-primary pb-2">
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
                      className="bg-secondary p-3 rounded-lg mb-2 flex items-center border border-primary"
                    >
                      <Image
                        key={index}
                        src={"/flick.svg"}
                        alt={`flick`}
                        width={30}
                        height={30}
                        className="mr-4"
                      />
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
  );
}
