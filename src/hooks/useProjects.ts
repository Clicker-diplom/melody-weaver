import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Project {
  id: string;
  name: string;
  type: 'uploaded' | 'edited' | 'exported';
  file_size: number | null;
  duration: number | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data as Project[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const uploadFileToStorage = useCallback(async (file: Blob, fileName: string): Promise<string | null> => {
    if (!user) return null;
    const uniqueName = `${user.id}/${Date.now()}_${fileName}`;
    const { error } = await supabase.storage
      .from('audio-files')
      .upload(uniqueName, file, { contentType: file.type || 'audio/wav', upsert: false });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('audio-files')
      .getPublicUrl(uniqueName);

    return urlData.publicUrl;
  }, [user]);

  const addProject = useCallback(async (project: {
    name: string;
    type: 'uploaded' | 'edited' | 'exported';
    file_size?: number;
    duration?: number;
    file?: Blob;
  }) => {
    if (!user) return null;

    let fileUrl: string | null = null;
    if (project.file) {
      fileUrl = await uploadFileToStorage(project.file, project.name);
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name: project.name,
        type: project.type,
        file_size: project.file_size ?? null,
        duration: project.duration ?? null,
        file_url: fileUrl,
      })
      .select()
      .single();

    if (!error && data) {
      setProjects(prev => [data as Project, ...prev]);
      return data;
    }
    return null;
  }, [user, uploadFileToStorage]);

  const deleteProject = useCallback(async (id: string) => {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (!error) {
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  }, []);

  return { projects, loading, addProject, deleteProject, refetch: fetchProjects };
}
