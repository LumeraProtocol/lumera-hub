// apps/web/src/app/sense/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { SupernodesScreen } from '@lumera-hub/ui/src/screens/SupernodesScreen';

export default function Page() {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = 'Supernodes - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/supernodes',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Supernodes',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Supernodes - Lumera Hub</title>
      </Helmet>
      <div>
        <SupernodesScreen />
      </div>
    </>
  )
}
