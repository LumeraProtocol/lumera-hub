// apps/web/src/app/block/[height]/page.tsx
'use client'
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import useBlockDetails from '@/hooks/useBlockDetails';
import { BlockDetailsScreen } from '@lumera-hub/ui/src/screens/BlockDetailsScreen';

export default function Page() {
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = 'Block';
    dispatch(setCurrentPath({
      currentPath: '/block',
    }));
    dispatch(setViewTitle({
      viewTitle: 'Block',
    }));
  }, []);

  const { block, isLoading, validators } = useBlockDetails();

  return (
    <>
      <Helmet>
        <title>Block</title>
      </Helmet>
      <div className="sense-content">
        <BlockDetailsScreen
          block={block}
          isLoading={isLoading}
          validators={validators}
        />
      </div>
    </>
  )
}
