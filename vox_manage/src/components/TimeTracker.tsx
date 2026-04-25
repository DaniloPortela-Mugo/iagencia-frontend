import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Square, Clock } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

interface TimeEntry {
  id: string;
  briefId: string;
  briefTitle: string;
  teamMember: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  isActive: boolean;
}

const TimeTracker: React.FC = () => {
  const { briefs, teamMembers } = useApp();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [selectedBrief, setSelectedBrief] = useState('');
  const [selectedMember, setSelectedMember] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTimer) {
        setTimeEntries(entries => 
          entries.map(entry => 
            entry.id === activeTimer && entry.isActive
              ? { ...entry, duration: Date.now() - entry.startTime.getTime() }
              : entry
          )
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  const startTimer = () => {
    if (!selectedBrief || !selectedMember) return;

    const newEntry: TimeEntry = {
      id: Date.now().toString(),
      briefId: selectedBrief,
      briefTitle: briefs.find(b => b.id === selectedBrief)?.title || '',
      teamMember: selectedMember,
      startTime: new Date(),
      duration: 0,
      isActive: true
    };

    setTimeEntries([...timeEntries, newEntry]);
    setActiveTimer(newEntry.id);
  };

  const pauseTimer = (entryId: string) => {
    setTimeEntries(entries =>
      entries.map(entry =>
        entry.id === entryId
          ? { ...entry, isActive: false }
          : entry
      )
    );
    setActiveTimer(null);
  };

  const resumeTimer = (entryId: string) => {
    setTimeEntries(entries =>
      entries.map(entry =>
        entry.id === entryId
          ? { 
              ...entry, 
              isActive: true,
              startTime: new Date(Date.now() - entry.duration)
            }
          : entry
      )
    );
    setActiveTimer(entryId);
  };

  const stopTimer = (entryId: string) => {
    setTimeEntries(entries =>
      entries.map(entry =>
        entry.id === entryId
          ? { 
              ...entry, 
              isActive: false,
              endTime: new Date()
            }
          : entry
      )
    );
    setActiveTimer(null);
  };

  const formatDuration = (duration: number) => {
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((duration % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTotalTime = () => {
    return timeEntries.reduce((total, entry) => total + entry.duration, 0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Controle de Tempo</h2>
        <p className="text-muted-foreground">Acompanhe o tempo gasto em cada projeto</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Iniciar Cronômetro</CardTitle>
          <CardDescription>Selecione um projeto e membro da equipe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={selectedBrief} onValueChange={setSelectedBrief}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar projeto" />
              </SelectTrigger>
              <SelectContent>
                {briefs.map((brief) => (
                  <SelectItem key={brief.id} value={brief.id}>
                    {brief.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar membro" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((member) => (
                  <SelectItem key={member} value={member}>
                    {member}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={startTimer} 
            disabled={!selectedBrief || !selectedMember || !!activeTimer}
            className="w-full"
          >
            <Play className="w-4 h-4 mr-2" />
            Iniciar Cronômetro
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Tempo Total: {formatDuration(getTotalTime())}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">{entry.briefTitle}</h4>
                  <p className="text-sm text-muted-foreground">{entry.teamMember}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant={entry.isActive ? "default" : "secondary"}>
                    {formatDuration(entry.duration)}
                  </Badge>
                  <div className="flex space-x-2">
                    {entry.isActive ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => pauseTimer(entry.id)}
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    ) : !entry.endTime ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => resumeTimer(entry.id)}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    ) : null}
                    {!entry.endTime && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => stopTimer(entry.id)}
                      >
                        <Square className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeTracker;