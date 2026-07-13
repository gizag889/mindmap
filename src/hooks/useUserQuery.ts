import { useQuery } from '@tanstack/react-query';
import { getWorkerUrl } from '../utils/mindMapApi';

interface UserData {
  credits: number;
  is_pro: boolean;
}

export const useUserQuery = (token: string | null) => {
  return useQuery<UserData, Error>({
    queryKey: ['user', token],
    queryFn: async () => {
      if (!token) throw new Error('No token provided');
      
      const url = getWorkerUrl() + '/api/user';
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const errText = await res.text();
        console.error('Failed to fetch user data:', errText);
        throw new Error('Failed to fetch user data: ' + errText);
      }
      
      const data = await res.json();
      // console.log("Fetched user data:", data);
      return data;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};
