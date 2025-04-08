"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, HTMLMotionProps, motion } from "framer-motion";
// import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";

interface WordRotateProps {
  words: string[];
  duration?: number;
  framerProps?: HTMLMotionProps<"h1">;
  className?: string;
}

export default function WordRotate({
  words,
  duration = 3000,
  framerProps = {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 },
    transition: { duration: 0.25, ease: "easeOut" },
  },
  className,
}: WordRotateProps) {
  const [index, setIndex] = useState(0);
  const [filteredWords, setFilteredWords] = useState<string[]>([]);

  useEffect(() => {
    // 25자 이하인 단어만 필터링
    const filtered = words.filter(word => word.length <= 25);
    setFilteredWords(filtered);
  }, [words]);

  useEffect(() => {
    if (filteredWords.length === 0) return;
    
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % filteredWords.length);
    }, duration);

    return () => clearInterval(interval);
  }, [filteredWords, duration]);

  if (filteredWords.length === 0) return null;

  return (
    <div className="pt-6 max-w-[400px]">
      <AnimatePresence mode="wait">
        <motion.h1
          key={filteredWords[index]}
          className={cn(className)}
          {...framerProps}
        >
          <p className="text-xl" style={{ lineHeight: "1.5" }}>
            {/* <MessageCircle className="mb-1 mr-2 inline size-6" /> */}
            {filteredWords[index]}
          </p>
        </motion.h1>
      </AnimatePresence>
    </div>
  );
}
