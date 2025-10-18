import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus } from 'lucide-react';
import type { MetaTag } from '@/store/appStore';

interface MetadataBoxProps {
  tags: MetaTag[];
  onTagsChange: (tags: MetaTag[]) => void;
  editable?: boolean;
}

export function MetadataBox({ tags, onTagsChange, editable = true }: MetadataBoxProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const addTag = () => {
    if (newKey.trim() && newValue.trim()) {
      onTagsChange([...tags, { key: newKey.trim(), value: newValue.trim() }]);
      setNewKey('');
      setNewValue('');
    }
  };

  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  const updateTag = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...tags];
    updated[index] = { ...updated[index], [field]: value };
    onTagsChange(updated);
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Metadata Tags</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded text-xs font-mono"
            >
              {editable ? (
                <>
                  <span className="font-semibold">#</span>
                  <input
                    type="text"
                    value={tag.key}
                    onChange={(e) => updateTag(index, 'key', e.target.value)}
                    className="bg-transparent border-none outline-none w-16 uppercase"
                  />
                  <span>=</span>
                  <input
                    type="text"
                    value={tag.value}
                    onChange={(e) => updateTag(index, 'value', e.target.value)}
                    className="bg-transparent border-none outline-none w-16"
                  />
                  <button
                    onClick={() => removeTag(index)}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <span>
                  #{tag.key}={tag.value}
                </span>
              )}
            </div>
          ))}
        </div>

        {editable && (
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="Key (e.g., EXP)"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              className="h-8 text-xs font-mono flex-1"
            />
            <Input
              placeholder="Value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
              className="h-8 text-xs font-mono flex-1"
            />
            <Button onClick={addTag} size="sm" className="h-8 px-3">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}

        {tags.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No metadata tags. {editable && 'Add tags to organize your experiments.'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
