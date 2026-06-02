// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import { TextInputVerifyScreen } from '@lumera-hub/ui/src/screens/snag/TextInputVerifyScreen';
import useSnagTextInput from '@/hooks/useSnagTextInput';
import { NotFoundScreen } from '@lumera-hub/ui/src/screens/snag/NotFoundScreen';

export default function Page() {
  const dispatch = useDispatch();
  const {
    isLoading,
    message,
    content,
    quest,
    response,
    setContent,
    verifyTextInput,
  } = useSnagTextInput();

  useEffect(() => {
    document.title = 'Response - Lumera Hub';
    dispatch(setCurrentPath({
      currentPath: '/snag/address/text-input',
    }));
    dispatch(setViewTitle({
      viewTitle: '&nbsp;',
    }));
  }, []);

  return (
    <>
      <Helmet>
        <title>Response - Lumera Hub</title>
      </Helmet>
      <div className="w-full h-full">
        {message?.type === 'not-found' ?
          <NotFoundScreen content={message.content} /> :
          <TextInputVerifyScreen
            isLoading={isLoading}
            message={message}
            content={content}
            quest={quest}
            response={response}
            onVerifyClick={verifyTextInput}
            onChangeText={setContent}
          />
        }
      </div>
    </>
  )
}
