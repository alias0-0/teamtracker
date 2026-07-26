import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from './supabase';

export interface IncomingMessageAlert {
  id: string;
  employeeId: string;
  employeeName: string;
  body: string;
  timestamp: string;
}

interface EmployeeLookup {
  id: string;
  name: string;
}

export function useIncomingMessages(employees: EmployeeLookup[]) {
  const [alerts, setAlerts] = useState<IncomingMessageAlert[]>([]);
  const employeesRef = useRef(employees);
  employeesRef.current = employees;

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('incoming-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new as {
            id: string;
            employee_id: string;
            sender_role: 'admin' | 'employee';
            body: string;
            created_at: string;
          };
          if (row.sender_role !== 'employee') return;

          const employeeName = employeesRef.current.find((e) => e.id === row.employee_id)?.name ?? 'Unknown employee';

          setAlerts((prev) => [
            ...prev,
            { id: row.id, employeeId: row.employee_id, employeeName, body: row.body, timestamp: row.created_at },
          ]);

          if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
            new Notification(`New message from ${employeeName}`, { body: row.body });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { alerts, dismissAlert };
}