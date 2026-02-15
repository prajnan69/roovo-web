import { API_BASE_URL } from './api';
import supabase from './api';

export const preloadProfileData = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/api/users/${session.user.id}`);
  const { data } = await response.json();

  const { data: hostData, error } = await supabase
    .from('hosts')
    .select('id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    console.error('Error checking host status:', error);
  }

  const isHost = !!hostData;
  console.log('Profile loaded:', { userId: session.user.id, isHost });

  return {
    ...data,
    id: session.user.id,
    is_host: isHost
  };
};
