import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Race } from '../types';

export function useRaces(userId: string | undefined) {
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRaces = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('races')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setRaces(data ?? []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchRaces();
  }, [fetchRaces]);

  async function createRace(race: Omit<Race, 'race_id' | 'created_at' | 'completed' | 'actual_time_seconds' | 'actual_place' | 'notes'>) {
    const { data, error } = await supabase
      .from('races')
      .insert({ ...race, completed: false })
      .select()
      .single();

    if (error) throw error;
    await fetchRaces();
    return data as Race;
  }

  async function updateRace(race_id: string, updates: Partial<Race>) {
    const { error } = await supabase
      .from('races')
      .update(updates)
      .eq('race_id', race_id);

    if (error) throw error;
    await fetchRaces();
  }

  // Primary race = next upcoming, priority A
  const primaryRace = races.find(
    (r) => !r.completed && new Date(r.date) >= new Date(),
  );

  return { races, primaryRace, loading, error, createRace, updateRace, refresh: fetchRaces };
}

export function useRace(race_id: string) {
  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('races')
      .select('*')
      .eq('race_id', race_id)
      .single()
      .then(({ data }) => {
        setRace(data);
        setLoading(false);
      });
  }, [race_id]);

  return { race, loading };
}
