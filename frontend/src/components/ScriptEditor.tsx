import { useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface ScriptEditorProps {
  script: string;
  currentLine?: number;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function ScriptEditor({ script, currentLine, onChange, readOnly }: ScriptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (currentLine !== undefined && textareaRef.current) {
      const lines = script.split('\n');
      let charCount = 0;
      for (let i = 0; i < currentLine && i < lines.length; i++) {
        charCount += lines[i].length + 1;
      }
      textareaRef.current.setSelectionRange(charCount, charCount + (lines[currentLine]?.length || 0));
      textareaRef.current.focus();
    }
  }, [currentLine, script]);

  const lines = script.split('\n');

  return (
    <div className="relative font-mono text-sm">
      <div className="flex">
        <div className="bg-muted px-3 py-2 text-muted-foreground select-none border-r">
          {lines.map((_, index) => (
            <div
              key={index}
              className={`text-right ${
                index === currentLine ? 'bg-yellow-200 dark:bg-yellow-900' : ''
              }`}
            >
              {index + 1}
            </div>
          ))}
        </div>
        <Textarea
          ref={textareaRef}
          value={script}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className="font-mono border-0 rounded-none resize-none min-h-[400px] focus-visible:ring-0"
          style={{
            lineHeight: '1.5rem',
            padding: '0.5rem',
          }}
        />
      </div>
    </div>
  );
}
