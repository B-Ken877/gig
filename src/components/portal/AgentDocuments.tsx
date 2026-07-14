'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { Agent, Document as AgentDocument } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Upload, Download, Trash2, FileText, FolderOpen, Loader2 } from 'lucide-react';

const DOC_TYPES = ['Resume', 'ID', 'Certificate', 'Proof of Address', 'Contract', 'Other'];

function getDocTypeBadge(type: string) {
  const map: Record<string, string> = {
    Resume: 'bg-blue-100 text-blue-800',
    ID: 'bg-purple-100 text-purple-800',
    Certificate: 'bg-emerald-100 text-emerald-800',
    'Proof of Address': 'bg-green-100 text-green-800',
    Contract: 'bg-gray-100 text-gray-800',
    Other: 'bg-gray-100 text-gray-600',
  };
  return map[type] || 'bg-gray-100 text-gray-600';
}

export default function AgentDocuments() {
  const { currentUser, addToast } = useAppStore();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [documents, setDocuments] = useState<AgentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Upload form
  const [docType, setDocType] = useState('');
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    if (!currentUser) return;
    fetch(`/api/agents?userId=${currentUser.id}`)
      .then((r) => r.json())
      .then((data) => {
        const a = Array.isArray(data) ? data[0] : data;
        if (a) {
          setAgent(a);
          return fetch(`/api/documents?agentId=${a.id}`);
        }
        return null;
      })
      .then((r) => {
        if (r) return r.json();
      })
      .then((docs) => {
        if (Array.isArray(docs)) setDocuments(docs);
      })
      .catch(() => {
        addToast({ title: 'Error loading documents', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, [currentUser, addToast]);

  const handleUpload = async () => {
    if (!agent || !docType || !fileName.trim()) {
      addToast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          type: docType,
          fileName: fileName.trim(),
          fileUrl: `https://gig-solutions.s3.amazonaws.com/documents/${agent.id}/${fileName.trim()}`,
        }),
      });
      if (!res.ok) throw new Error('Upload failed');
      const newDoc = await res.json();
      setDocuments((prev) => [...prev, newDoc]);
      setFileName('');
      setDocType('');
      addToast({ title: 'Document uploaded', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to upload document', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      addToast({ title: 'Document deleted', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to delete document', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
        <p className="text-sm text-gray-500 mt-1">Upload and manage your documents for the recruitment process.</p>
      </div>

      {/* Upload Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Document
          </CardTitle>
          <CardDescription>Provide the document type and file name to register it.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-48">
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Input
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Enter file name (e.g., resume_john_doe.pdf)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpload();
                }}
              />
            </div>
            <Button onClick={handleUpload} disabled={uploading} className="gap-2 shrink-0">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">My Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <FolderOpen className="h-12 w-12 mb-3" />
              <p className="text-sm font-medium">No documents uploaded yet</p>
              <p className="text-xs mt-1">Use the form above to upload your first document.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead className="text-center">Version</TableHead>
                    <TableHead className="text-center">Downloads</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Badge className={getDocTypeBadge(doc.type)}>{doc.type}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{doc.fileName}</TableCell>
                      <TableCell className="text-center text-sm text-gray-500">v{doc.version}</TableCell>
                      <TableCell className="text-center text-sm text-gray-500">{doc.downloadCount}</TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Download"
                            onClick={() => {
                              setDocuments((prev) =>
                                prev.map((d) => (d.id === doc.id ? { ...d, downloadCount: d.downloadCount + 1 } : d))
                              );
                              addToast({ title: 'Download started', variant: 'success' });
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Delete"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}