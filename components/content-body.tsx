import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircleMore } from "lucide-react";
import FlickPage from "@/components/flick-page";
import Link from "next/link";

interface ContentBodyProps {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  titles: { title: string; href: string }[];
}

export default function ContentBody({
  currentPage,
  setCurrentPage,
  titles,
}: ContentBodyProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="titles"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
      >
        <FlickPage currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <ScrollArea className="h-full p-4">
          {titles.map((post, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/${post.href}`}>
                <Button
                  variant="ghost"
                  className="w-full justify-start mb-4 text-left hover:bg-secondary rounded-lg border-2 border-secondary hover:border-primary transition-all duration-300 overflow-hidden group"
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
              </Link>
            </motion.div>
          ))}
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}
