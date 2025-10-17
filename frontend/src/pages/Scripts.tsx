import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Search,
  Trash2,
  Copy,
  Edit2,
  X,
  Check,
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { api } from '@/services/api';

/* ----------------------------- types ----------------------------- */

interface SavedScript {
  id: string;
  name: string;
  content: string;
  size: number;
  created: Date;
  modified: Date;
}

interface ParsedScript {
  id: string;
  name: string;
  content: string;
  size: number;
  created: string;
  modified: string;
}

interface ConnectedDevice {
  serial_number: string;
  com_port: string;
  status?: string;
}

interface UploadStatus {
  serial: string;
  status: 'uploading' | 'success' | 'error';
  message?: string;
}

/* ----------------------------- component ----------------------------- */

export function Scripts() {
  const [scripts, setScripts] = useState<SavedScript[]>([]);
  const [selectedScript, setSelectedScript] = useState<SavedScript | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [uploadStatuses, setUploadStatuses] = useState<Map<string, UploadStatus>>(new Map());
  const [isUploading, setIsUploading] = useState(false);

  // New script form
  const [newScriptName, setNewScriptName] = useState('');
  const [newScriptContent, setNewScriptContent] = useState('');

  // Editing mode
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [editingContent, setEditingContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /* ----------------------------- localStorage persistence ----------------------------- */

  useEffect(() => {
    loadScripts();
    loadConnectedDevices();
  }, []);

  const loadScripts = () => {
    try {
      const stored = localStorage.getItem('edx-scripts');
      if (stored) {
        const parsed = JSON.parse(stored) as ParsedScript[];
        const revived: SavedScript[] = parsed.map((s) => ({
          ...s,
          created: new Date(s.created),
          modified: new Date(s.modified),
        }));
        setScripts(revived);
      }
    } catch (error) {
      console.error('Failed to load scripts:', error);
    }
  };

  const saveScripts = (updatedScripts: SavedScript[]) => {
    try {
      localStorage.setItem('edx-scripts', JSON.stringify(updatedScripts));
      setScripts(updatedScripts);
    } catch (error) {
      console.error('Failed to save scripts:', error);
    }
  };

  const loadConnectedDevices = async () => {
    try {
      const devices = await api.getConnectedDevices();
      setConnectedDevices(devices);
    } catch (error) {
      console.error('Failed to load connected devices:', error);
    }
  };

  /* ----------------------------- script actions ----------------------------- */

  const handleCreateScript = () => {
    if (!newScriptName.trim() || !newScriptContent.trim()) return;

    const name = newScriptName.trim();
    const newScript: SavedScript = {
      id: crypto.randomUUID(),
      name,
      content: newScriptContent,
      size: new Blob([newScriptContent]).size,
      created: new Date(),
      modified: new Date(),
    };

    const updated = [...scripts, newScript];
    saveScripts(updated);
    setNewScriptName('');
    setNewScriptContent('');
    setShowUploadDialog(false);
  };

  const handleDeleteScript = (id: string) => {
    if (!confirm('Are you sure you want to delete this script?')) return;
    const updated = scripts.filter((s) => s.id !== id);
    saveScripts(updated);
    if (selectedScript?.id === id) {
      setSelectedScript(null);
    }
  };

  const handleDuplicateScript = (script: SavedScript) => {
    const duplicate: SavedScript = {
      ...script,
      id: crypto.randomUUID(),
      name: `${script.name} (copy)`,
      created: new Date(),
      modified: new Date(),
    };
    const updated = [...scripts, duplicate];
    saveScripts(updated);
  };

  const handleSelectScript = (script: SavedScript) => {
    if (hasUnsavedChanges && !confirm('You have unsaved changes. Discard them?')) {
      return;
    }
    setSelectedScript(script);
    setEditingName(script.name);
    setEditingContent(script.content);
    setHasUnsavedChanges(false);
    setIsEditingName(false);
  };

  const handleSaveChanges = () => {
    if (!selectedScript) return;

    const updated = scripts.map((s) =>
      s.id === selectedScript.id
        ? {
            ...s,
            name: editingName.trim() || s.name,
            content: editingContent,
            size: new Blob([editingContent]).size,
            modified: new Date(),
          }
        : s,
    );
    saveScripts(updated);
    setSelectedScript({
      ...selectedScript,
      name: editingName.trim() || selectedScript.name,
      content: editingContent,
      size: new Blob([editingContent]).size,
      modified: new Date(),
    });
    setHasUnsavedChanges(false);
  };

  const handleCancelChanges = () => {
    if (hasUnsavedChanges && !confirm('Discard unsaved changes?')) return;
    if (selectedScript) {
      setEditingName(selectedScript.name);
      setEditingContent(selectedScript.content);
      setHasUnsavedChanges(false);
      setIsEditingName(false);
    } else {
      setSelectedScript(null);
    }
  };

  /* ----------------------------- multi-device upload ----------------------------- */

  const toggleDeviceSelection = (serial: string) => {
    const updated = new Set(selectedDevices);
    if (updated.has(serial)) {
      updated.delete(serial);
    } else {
      updated.add(serial);
    }
    setSelectedDevices(updated);
  };

  const handleSelectAllDevices = () => {
    setSelectedDevices(new Set(connectedDevices.map((d) => d.serial_number)));
  };

  const handleDeselectAllDevices = () => {
    setSelectedDevices(new Set());
  };

  const handleUploadToDevices = async () => {
    if (!selectedScript || selectedDevices.size === 0) return;

    setIsUploading(true);
    const statusMap = new Map<string, UploadStatus>();

    // Initialize statuses
    selectedDevices.forEach((serial) => {
      statusMap.set(serial, { serial, status: 'uploading' });
    });
    setUploadStatuses(new Map(statusMap));

    // Upload in parallel
    const uploads = Array.from(selectedDevices).map(async (serial) => {
      try {
        await api.uploadScript(serial, selectedScript.content);
        statusMap.set(serial, { serial, status: 'success' });
      } catch (error) {
        statusMap.set(serial, {
          serial,
          status: 'error',
          message: error instanceof Error ? error.message : 'Upload failed',
        });
      }
      setUploadStatuses(new Map(statusMap));
    });

    await Promise.all(uploads);
    setIsUploading(false);
  };

  /* ----------------------------- filtering ----------------------------- */

  const filteredScripts = scripts.filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /* ----------------------------- rendering ----------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Script Library</h1>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Upload className="mr-2 h-4 w-4" />
          New Script
        </Button>
      </div>

      {/* New Script Dialog */}
      {showUploadDialog && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Create New Script</CardTitle>
            <CardDescription>Upload or write a new Lua script</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Script Name</label>
              <Input
                value={newScriptName}
                onChange={(e) => setNewScriptName(e.target.value)}
                placeholder="my_script"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Lua Code</label>
              <Textarea
                value={newScriptContent}
                onChange={(e) => setNewScriptContent(e.target.value)}
                placeholder="-- Enter your Lua code here..."
                className="font-mono text-sm min-h-[300px]"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateScript} disabled={!newScriptName.trim() || !newScriptContent.trim()}>
                <Check className="mr-2 h-4 w-4" />
                Create Script
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Layout: List + Detail */}
      <div className="grid gap-6 lg:grid-cols-[60%,40%]">
        {/* Left: Script List */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search scripts..."
              className="pl-9"
            />
          </div>

          {/* Empty State */}
          {scripts.length === 0 && (
            <Card className="border-2">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium">No scripts yet</p>
                <p className="text-sm text-muted-foreground mt-1">Upload your first Lua script to get started</p>
                <Button onClick={() => setShowUploadDialog(true)} className="mt-4">
                  <Upload className="mr-2 h-4 w-4" />
                  New Script
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Script Table */}
          {filteredScripts.length > 0 && (
            <Card className="border-2">
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left text-sm font-medium">Name</th>
                      <th className="p-3 text-left text-sm font-medium">Size</th>
                      <th className="p-3 text-left text-sm font-medium">Modified</th>
                      <th className="p-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScripts.map((script) => (
                      <tr
                        key={script.id}
                        className={`border-b cursor-pointer hover:bg-muted/30 ${
                          selectedScript?.id === script.id ? 'bg-muted/50' : ''
                        }`}
                        onClick={() => handleSelectScript(script)}
                      >
                        <td className="p-3 text-sm font-mono">{script.name}</td>
                        <td className="p-3 text-sm">{formatSize(script.size)}</td>
                        <td className="p-3 text-sm text-muted-foreground">{formatDate(script.modified)}</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateScript(script);
                              }}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteScript(script.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Right: Script Detail Panel */}
        {selectedScript && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <Card className="border-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex-1">
                  {isEditingName ? (
                    <Input
                      value={editingName}
                      onChange={(e) => {
                        setEditingName(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      onBlur={() => setIsEditingName(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setIsEditingName(false);
                      }}
                      autoFocus
                      className="font-mono"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-mono">{editingName}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingName(true)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  <CardDescription className="mt-1">
                    {formatSize(new Blob([editingContent]).size)} • Modified {formatDate(selectedScript.modified)}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedScript(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Script Editor */}
                <Textarea
                  value={editingContent}
                  onChange={(e) => {
                    setEditingContent(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="font-mono text-sm min-h-[400px]"
                />

                {/* Save/Cancel */}
                {hasUnsavedChanges && (
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={handleCancelChanges}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveChanges}>
                      <Check className="mr-2 h-4 w-4" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deploy to Devices */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-lg">Deploy to Devices</CardTitle>
                <CardDescription>Select devices to upload this script</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Device Selection */}
                {connectedDevices.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">No devices connected</span>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleSelectAllDevices}>
                        Select All
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleDeselectAllDevices}>
                        Deselect All
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {connectedDevices.map((device) => {
                        const uploadStatus = uploadStatuses.get(device.serial_number);
                        return (
                          <div
                            key={device.serial_number}
                            className="flex items-center justify-between p-3 bg-muted/30 rounded-md"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedDevices.has(device.serial_number)}
                                onChange={() => toggleDeviceSelection(device.serial_number)}
                                disabled={isUploading || uploadStatus?.status === 'uploading'}
                                className="h-4 w-4"
                              />
                              <div>
                                <p className="text-sm font-mono font-medium">{device.serial_number}</p>
                                <p className="text-xs text-muted-foreground">{device.com_port}</p>
                              </div>
                            </div>

                            {/* Upload Status */}
                            {uploadStatus && (
                              <div className="flex items-center gap-1">
                                {uploadStatus.status === 'uploading' && (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                    <span className="text-xs text-blue-600">Uploading…</span>
                                  </>
                                )}
                                {uploadStatus.status === 'success' && (
                                  <>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span className="text-xs text-green-600">Uploaded</span>
                                  </>
                                )}
                                {uploadStatus.status === 'error' && (
                                  <>
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    <span className="text-xs text-red-600">{uploadStatus.message || 'Error'}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <Button
                      onClick={handleUploadToDevices}
                      disabled={selectedDevices.size === 0 || isUploading}
                      className="w-full"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading to {uploadStatuses.size} device(s)...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload to {selectedDevices.size} Selected Device(s)
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Migration Note (for future API integration) */}
      {/* TODO: When backend endpoints are ready, replace localStorage with:
          - GET /scripts → loadScripts()
          - POST /scripts → handleCreateScript()
          - PUT /scripts/:id → handleSaveChanges()
          - DELETE /scripts/:id → handleDeleteScript()
          - POST /devices/:serial/load-script/:id → handleUploadToDevices()
      */}
    </div>
  );
}

export default Scripts;
