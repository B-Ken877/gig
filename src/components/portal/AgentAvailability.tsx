'use client';

import React, { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import type { Agent, AvailabilitySlot } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CalendarDays,
  Plus,
  Clock,
  XCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AgentAvailability() {
  const { currentUser, addToast } = useAppStore();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar state
  const [viewDate, setViewDate] = useState(new Date());

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [slotDate, setSlotDate] = useState('');
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('17:00');
  const [slotAvailable, setSlotAvailable] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    fetch(`/api/agents?userId=${currentUser.id}`)
      .then((r) => r.json())
      .then((data) => {
        const a = Array.isArray(data) ? data[0] : data;
        if (a) {
          setAgent(a);
          return fetch(`/api/availability?agentId=${a.id}`);
        }
        return null;
      })
      .then((r) => {
        if (r) return r.json();
      })
      .then((s) => {
        if (Array.isArray(s)) setSlots(s);
      })
      .catch(() => {
        addToast({ title: 'Error loading availability', variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }, [currentUser, addToast]);

  // Calendar helpers
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const getSlotForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return slots.find((s) => s.date === dateStr);
  };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleSaveSlot = async () => {
    if (!agent || !slotDate) return;
    setSaving(true);
    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agent.id,
          date: slotDate,
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: slotAvailable,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const newSlot = await res.json();
      setSlots((prev) => [...prev, newSlot]);
      setDialogOpen(false);
      setSlotDate('');
      addToast({ title: 'Availability saved', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      const res = await fetch(`/api/availability/${slotId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      addToast({ title: 'Slot removed', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to remove slot', variant: 'destructive' });
    }
  };

  const availableSlots = slots.filter((s) => s.isAvailable).sort((a, b) => a.date.localeCompare(b.date));
  const unavailableSlots = slots.filter((s) => !s.isAvailable).sort((a, b) => a.date.localeCompare(b.date));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Availability</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your schedule and availability for placements.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Availability
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Availability Slot</DialogTitle>
              <DialogDescription>Set a date and time when you&apos;re available to work.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  min={today}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                <Label>Available</Label>
                <Switch checked={slotAvailable} onCheckedChange={setSlotAvailable} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSlot} disabled={saving || !slotDate} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Preferred Shift */}
      {agent?.preferredShift && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Preferred Shift</p>
              <p className="text-sm text-gray-500">{agent.preferredShift}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold">{monthName}</span>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100">
                <ChevronRight className="h-4 w-4" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d} className="text-[11px] font-medium text-gray-400 py-1">
                  {d}
                </div>
              ))}
              {calendarDays.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} />;
                }
                const slot = getSlotForDate(day);
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = dateStr === today;
                return (
                  <div
                    key={day}
                    className={cn(
                      'relative h-9 flex flex-col items-center justify-center text-xs rounded-md',
                      isToday && 'bg-green-50 font-bold text-green-700',
                      slot?.isAvailable && 'bg-green-50 text-green-700',
                      slot && !slot.isAvailable && 'bg-red-50 text-red-600',
                      !slot && !isToday && 'hover:bg-gray-50'
                    )}
                  >
                    {day}
                    {slot?.isAvailable && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-green-500" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-3 px-1">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <div className="h-2.5 w-2.5 rounded bg-green-100 border border-green-300" />
                Available
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <div className="h-2.5 w-2.5 rounded bg-red-100 border border-red-300" />
                Unavailable
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Slots List */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Availability Slots</CardTitle>
          </CardHeader>
          <CardContent>
            {availableSlots.length === 0 && unavailableSlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <CalendarDays className="h-12 w-12 mb-3" />
                <p className="text-sm font-medium">No availability slots set</p>
                <p className="text-xs mt-1">Click &quot;Add Availability&quot; to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Start</TableHead>
                      <TableHead>End</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...availableSlots, ...unavailableSlots].map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium text-sm">{s.date}</TableCell>
                        <TableCell className="text-sm text-gray-500">{s.startTime || '—'}</TableCell>
                        <TableCell className="text-sm text-gray-500">{s.endTime || '—'}</TableCell>
                        <TableCell>
                          {s.isAvailable ? (
                            <Badge className="bg-green-100 text-green-800 border border-green-200 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Available
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 border border-red-200 text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Unavailable
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
                            onClick={() => handleDeleteSlot(s.id)}
                          >
                            Remove
                          </Button>
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
    </div>
  );
}