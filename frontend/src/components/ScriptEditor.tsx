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
    <div className="relative border border-border rounded-md overflow-hidden bg-muted/30">
      <div className="flex">
        <div className="bg-muted px-4 py-3 text-muted-foreground select-none border-r border-border font-mono text-sm">
          {lines.map((_, index) => (
            <div
              key={index}
              className={`text-right leading-6 ${
                index === currentLine 
                  ? 'bg-[hsl(var(--status-running))]/20 text-[hsl(var(--status-running))] font-semibold' 
                  : ''
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
          className="font-mono text-sm border-0 rounded-none resize-none min-h-[400px] focus-visible:ring-0 bg-transparent"
          style={{
            lineHeight: '1.5rem',
            padding: '0.75rem 1rem',
            fontFamily: '"JetBrains Mono", monospace',
          }}
        />
      </div>
    </div>
  );
}
