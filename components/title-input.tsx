import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

function AutoResizeTextarea(props: any) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [props.value]);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      rows={2}
      className={`${props.className} overflow-hidden`}
    />
  );
}

export function TitleInput({
  className,
  editableTitle,
  setEditableTitle,
}: {
  className?: string;
  editableTitle: string;
  setEditableTitle: (value: string) => void;
}) {
  const [inputValue, setInputValue] = useState(editableTitle);

  useEffect(() => {
    setInputValue(editableTitle);
  }, [editableTitle]);

  const handleSave = () => {
    setEditableTitle(inputValue);
  };

  return (
    <div className="absolute top-12 ml-[800px]">
      <Dialog>
        <DialogTrigger asChild>
          <Button className={cn("mt-2 h-full ", className)}>
            제목 수정하기
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>제목 수정</DialogTitle>
            <DialogDescription>
              새로운 제목을 입력하고 저장하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="title" className="sr-only">
              제목
            </Label>
            <AutoResizeTextarea
              value={inputValue}
              onChange={(e: any) => setInputValue(e.target.value)}
              className="w-full resize-none rounded-lg border border-primary text-center text-5xl font-bold focus:outline-none"
              placeholder="제목을 입력하세요"
              style={{ lineHeight: "1.1" }}
              spellCheck={false} // 맞춤법 검사 비활성화
            />
          </div>
          <DialogFooter>
            <DialogClose
              onClick={handleSave}
              className="rounded-lg bg-gray-700 px-4 py-3 font-bold text-white"
            >
              저장
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
