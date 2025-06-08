import { useSearchParams } from 'next/navigation';

export const useUrlParams = () => {
  const searchParams = useSearchParams();
  
  const urlSessionId = searchParams.get('sessionId');
  const urlUserId = searchParams.get('userId');
  
  return {
    urlSessionId,
    urlUserId,
    hasUrlParams: !!(urlSessionId && urlUserId)
  };
}; 