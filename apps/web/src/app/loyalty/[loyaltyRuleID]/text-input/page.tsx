// apps/web/src/app/snag/wallet/connect/page.tsx
'use client'

import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

import { useDispatch } from '@/redux/hooks';
import { setCurrentPath, setViewTitle } from '@/redux/app.slice';
import useSnagTextInput from '@/hooks/useSnagTextInput';
import useSnagReview from '@/hooks/useSnagReview';
import { TextInputVerifyScreen } from '@lumera-hub/ui/src/screens/snag/TextInputVerifyScreen';
import { NotFoundScreen } from '@lumera-hub/ui/src/screens/snag/NotFoundScreen';

export default function Page() {
  const dispatch = useDispatch();
  const review = useSnagReview();
  const {
    isLoading,
    message,
    content,
    quest,
    response,
    isVerified,
    setContent,
    verifyTextInput,
    handleRecaptchaChange,
  } = useSnagTextInput(review.getResponses);

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
            isVerified={isVerified}
            review={{
              isLoading: review.isLoading,
              responses: review.responses,
            }}
            onVerifyClick={verifyTextInput}
            onChangeText={setContent}
            oneRecaptchaChange={handleRecaptchaChange}
          />
        }
      </div>
    </>
  )
}
