// apps/web/src/app/blocks/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { BlockScreen } from '@lumera-hub/ui/src/screens/BlockScreen';

export default function Page() {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = 'Blocks - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/blocks',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Blocks',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Blocks - Lumera Hub</title>
      </Helmet>
      <div>
        <BlockScreen />
      </div>
    </>
  )
}
