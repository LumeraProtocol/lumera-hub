// apps/web/src/app/block/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import useBlock from '@/hooks/useBlock';
import { BlockScreen } from '@lumera-hub/ui/src/screens/BlockScreen';

export default function Page() {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = 'Block - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/block',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Block',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Block - Lumera Hub</title>
      </Helmet>
      <div>
        <BlockScreen />
      </div>
    </>
  )
}
