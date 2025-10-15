import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, AlertCircle } from 'lucide-react';

export function Scripts() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Scripts</h1>
        <Button disabled>
          <Upload className="mr-2 h-4 w-4" />
          Upload Script
        </Button>
      </div>

      <Card className="border-yellow-500/50">
        <CardHeader>
          <div className="flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-1" />
            <div>
              <CardTitle>Backend Endpoints Not Implemented</CardTitle>
              <CardDescription className="mt-2">
                The script library management endpoints are not yet available in the backend API.
                This page will be functional once the following endpoints are implemented:
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• POST /scripts - Create/save script</li>
            <li>• GET /scripts - List all scripts</li>
            <li>• GET /scripts/:id - Get script content</li>
            <li>• DELETE /scripts/:id - Delete script</li>
            <li>• POST /devices/:serial/load-script/:id - Load script to device</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Script Library (Preview)</CardTitle>
          <CardDescription>
            Once implemented, you'll be able to manage your Lua scripts here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left text-sm font-medium">Name</th>
                  <th className="p-3 text-left text-sm font-medium">Size</th>
                  <th className="p-3 text-left text-sm font-medium">Uploaded</th>
                  <th className="p-3 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 text-sm font-mono">control_script_1.lua</td>
                  <td className="p-3 text-sm">1.2 KB</td>
                  <td className="p-3 text-sm text-muted-foreground">Coming soon</td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" disabled>
                      Load
                    </Button>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 text-sm font-mono">test_magnet.lua</td>
                  <td className="p-3 text-sm">856 B</td>
                  <td className="p-3 text-sm text-muted-foreground">Coming soon</td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" disabled>
                      Load
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
