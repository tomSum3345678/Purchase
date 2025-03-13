import { useEffect } from 'react';
import { supabase } from '../screens/supabaseClient';

const useRealtime = (tableName, handleInsert, handleUpdate, handleDelete) => {
  useEffect(() => {
    const subscription = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
        },
        (payload) => {
          switch (payload.eventType) {
            case 'INSERT':
              handleInsert?.(payload.new);
              break;
            case 'UPDATE':
              handleUpdate?.(payload.new);
              break;
            case 'DELETE':
              handleDelete?.(payload.old);
              break;
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [tableName, handleInsert, handleUpdate, handleDelete]);
};

export default useRealtime;